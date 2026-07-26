# Fogline — Décisions d'architecture

> Ce document explique **les choix et les arbitrages**, pas seulement le résultat.
> Plusieurs solutions étaient possibles à chaque étape ; ce qui suit dit laquelle
> a été retenue, ce qui a été écarté, et pourquoi — face aux contraintes réelles :
> batterie, GDPR, consentement natif, performance, fiabilité multi-appareils.
>
> Chaque décision renvoie au fichier qui l'implémente.

---

## Principe directeur — cœur pur, coquille impérative

La décision la plus structurante : séparer un **cœur pur** (déterministe, aucune
dépendance à un device) d'une **coquille impérative** (APIs natives, I/O, rendu).

|              | Modules                                                                                                                                                  | Propriété                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Cœur pur** | `core/grid` · `core/motion-filter` · `core/gset` · `core/polygon-shaping` · `engine/location-processor` · `engine/permission-machine` · `sync/sync-core` | testé **sans simulateur**                                                               |
| **Coquille** | `engine/location-engine` · `engine/pedometer` · `engine/permission-service` · `data/*` · `sync/sync-service` · `proximity/*` · `ui/*`                    | branche le cœur sur `expo-location`, `expo-sensors`, `expo-sqlite`, `react-native-maps` |

Conséquence concrète : la logique qui décide _si un pas compte_, _quelle case est
révélée_, _comment deux appareils convergent_ et _quelle forme prend la frontière_
est vérifiable en millisecondes, sans device et sans marcher. **42 tests, 11 suites.**

---

## AD-1 — Représentation spatiale : grille H3 (`core/grid.ts`)

**Décision.** Grille hexagonale hiérarchique H3, résolution 10 (~66 m d'arête,
~120 m de large). L'exploration est un `Set<H3Index>`.

**Pourquoi.** Les hexagones pavent le plan **sans biais directionnel** : les six
voisins sont équidistants, donc un « anneau de révélation » est isotrope, ce que
des rectangles ne donnent pas. Les cellules adjacentes se **dissolvent** en une
frontière unique (`cellsToMultiPolygon`), et la hiérarchie fournit l'agrégation
pour le niveau de détail. `h3-js` est du JS pur, donc utilisable en React Native.

**Révélation honnête.** Ce qu'un fix révèle suit le **disque de précision GPS**
(`revealCells`) : précision fine ⇒ la seule cellule sous les pieds ; précision
dégradée ⇒ le voisinage réellement possible, **jamais plus finement que ce que le
capteur sait**. Plafonné à 3 anneaux pour qu'un fix aberrant (précision 2 km)
n'inonde pas la carte.

**Écarté.** _Geohash / quadkey_ : rectangles, artefacts visuels, voisinage moins
naturel. _Buffer vectoriel du tracé_ : plus organique, mais cela revient à
conserver le parcours — un risque GDPR, coûteux à unir en continu, et pénible à
synchroniser en delta.

**En prod.** Résolution modulée par densité urbaine ; double résolution
(fine en ville, grossière en campagne) via la hiérarchie H3.

## AD-2 — « Marche uniquement » : podomètre en vérité terrain (`core/motion-filter.ts`, `engine/pedometer.ts`)

**Décision.** On ne révèle que si des **pas** se sont accumulés. Garde-fou vitesse
pour les rafales véhicule, et ratio _distance/pas_ pour rejeter les sauts GPS.

**Pourquoi.** Voiture, train et vélo produisent du **déplacement sans pas** : ils
sont donc filtrés nativement, sans heuristique fragile. Et le podomètre tourne sur
un **coprocesseur de mouvement dédié**, donc ce filtre coûte ~0 en batterie. La
vitesse GPS seule serait moins fiable (bruitée en canyon urbain, lente dans les
embouteillages).

**La nuance cross-platform, et elle est décisive.** Le podomètre historique
n'existe **que sur iOS**. Sur Android en arrière-plan, le nombre de pas est
**inconnu**, pas nul. Le contrat est donc `steps: number | null`, et `null`
bascule sur une gating par vitesse au lieu de rejeter. **Ne jamais confondre
« inconnu » et « zéro »** : c'est aussi ce qui permet à la révélation de
fonctionner sur simulateur, qui n'a pas de CoreMotion du tout.

**Écarté.** Vitesse GPS seule. _Activity Recognition natif_ (CoreMotion /
ActivityRecognition) est le **signal idéal** mais sort du périmètre Expo managed :
documenté comme le cran suivant, branché en prod via un config plugin natif.

**En prod.** Fusion podomètre + activity recognition + vitesse, avec un score de
confiance « à pied » ; l'anti-spoofing GPS est un sujet réel, noté hors scope.

## AD-3 — Localisation de fond et batterie (`engine/location-engine.ts`, `config/exploration.config.ts`)

**Décision.** `startLocationUpdatesAsync` + `expo-task-manager`, précision
`Balanced` (~100 m), seuil de 40 m entre mises à jour, et fenêtre de mises à jour
différées de 30 s. Watcher premier plan séparé pour le temps réel.

**Pourquoi.** **La granularité de la grille dicte la précision nécessaire.** Des
cases de ~120 m n'exigent pas un GPS à 5 m : demander une précision fine
coûterait de la batterie pour une information que le modèle de données jette.

**Précision sur le différé.** `deferredUpdatesInterval` est honoré par la couche
native d'`expo-location`, qui bufferise les positions avant de réveiller le JS ;
`allowDeferredLocationUpdates`, l'API iOS qui délègue le groupage au système
lui-même, n'est pas appelée. Le gain est donc réel mais se situe au niveau du
pont, pas au niveau de l'OS. La distinction compte : le second économiserait
davantage, et c'est ce que je viserais en production.

**En prod.** Significant-Location-Change et geofencing en veille profonde pour
réduire encore la consommation à l'arrêt.

## AD-4 — Consentement (`engine/permission-machine.ts`, `ui/onboarding/*`, `app/upgrade.tsx`)

**Décision.** Une **machine à états pure** dérive le mode courant (`deriveMode`)
et l'étape suivante (`nextAction`) depuis l'état OS :

```
undetermined → (écran de valeur) → foreground → (moment de valeur) → always
                                        ↓                    ↓
                                     reduced               denied
```

1. **Écran de valeur avant tout prompt système** — on explique ce que la
   permission achète, avec un aperçu animé, avant que l'OS ne parle.
2. **« Pendant l'utilisation »** — la feature marche déjà, l'utilisateur voit le
   brouillard reculer.
3. **Escalade vers « Toujours »** à un moment de valeur (bandeau sur la carte →
   écran dédié), **jamais au lancement**.

**Pourquoi.** iOS **interdit** de demander « Toujours » directement : le système
impose deux étapes. Demander à froid, sans valeur démontrée, conduit à un refus
quasi systématique — et la feature meurt là. Sur **Android 11+**, l'OS ne propose
plus « Autoriser tout le temps » dans un prompt : on route vers les Réglages avec
une explication (`route-settings`) plutôt que d'afficher un bouton sans effet.

**Révocation.** Ré-évaluée au retour au premier plan (`AppState`) : la feature
bascule en mode réduit, elle ne casse jamais.

**En prod.** A/B du wording et du moment d'escalade, instrumentation du tunnel.

## AD-5 — Synchronisation : ensemble à croissance seule (`core/gset.ts`, `sync/sync-core.ts`)

**Décision.** Delta push des cellules non acquittées, pull depuis un curseur, et
**fusion = union** d'un _grow-only set_.

**Pourquoi.** L'union est **commutative et idempotente**, donc deux appareils
explorant hors-ligne, dans n'importe quel ordre, **convergent sans coordination** :
il n'y a pas de conflit à arbitrer, par construction. C'est aussi ce qui rend vraie
gratuitement la règle « exploré ne redevient jamais inexploré » — elle n'est pas
défendue par de la vigilance, elle est impossible à violer. Vérifié dans
`gset.test.ts` (commutativité, idempotence, convergence).

Et la charge utile est **minimale et agrégée** : uniquement des identifiants de
cases. Offline-first : le rendu ne dépend jamais du réseau, les cellules non
synchronisées forment naturellement la file de rejeu.

**Écarté.** _Last-write-wins_ (perd de l'exploration) ; synchronisation du tracé
ou d'une timeline (conflits, volume, et exactement la donnée qu'on refuse de garder).

**En prod.** Stockage serveur compressé (bitmap compressé sur les index H3,
delta-encoding par préfixe), batch et backoff, garde-fous anti-abus.

## AD-6 — Rendu du brouillard (`ui/layers/FogLayer.tsx`, `ui/fog-geometry.ts`)

**Décision.** **Un seul overlay** : un polygone dimensionné sur la caméra, avec le
sol marché découpé dedans en tant que trous. La frontière lumineuse n'est pas une
couche de plus — c'est le **contour de ce même polygone**, MapKit traçant chacun
de ses anneaux, trous compris.

**Pourquoi un seul.** L'ordre de dessin entre overlays est l'ordre d'insertion, et
le brouillard se réinsère à chaque `setCoordinates:` — donc à chaque pan et à
chaque zoom, pas seulement à chaque révélation. Toute couche censée passer
au-dessus devrait être réinsérée en cadence avec lui, et réinsérer des overlays à
la fréquence du geste est ce qui **tuait cet écran**. Avec un overlay unique, le
problème d'ordre n'existe pas : un polygone ne peut pas se recouvrir lui-même.
Les POI et le marcheur sont des `Marker`, que `AIRMap.m` route vers
`addAnnotation:` — MapKit peint toujours les annotations au-dessus des overlays,
sans clé de remontage ni artifice.

**Ce qui a été essayé avant, et pourquoi c'était faux.** La première version
empilait 6 bandes translucides, chacune l'ensemble exploré dilaté d'un nombre
décroissant d'anneaux, pour obtenir un dégradé par accumulation alpha. La théorie
tient — `Π(1 - αᵢ)` donne bien une décroissance exponentielle. La pratique non :
**un anneau H3 en résolution 10 fait ~120 m**, donc le dégradé s'étalait sur
~600 m autour d'une zone marchée de 150 m. Le résultat ne lisait pas comme une
brume mais comme des **cernes d'arbre**, et six couches sombres superposées
viraient au noir. Le défaut n'était pas le réglage : c'était que l'unité de
dilatation est fixée par la grille, pas par le design. Un dégradé dont le pas est
imposé par la structure de données n'est pas un dégradé.

**Et la forme.** Une aire H3 dissoute est un **escalier hexagonal**. Deux passes
pures (`core/polygon-shaping.ts`) le corrigent : **Ramer-Douglas-Peucker** retire
les sommets que l'œil ne peut pas résoudre — c'est le premier levier de
performance sur des overlays natifs — puis **Chaikin** coupe les angles vers une
B-spline. Bénéfice secondaire : cela supprime les jonctions concaves aiguës qui
font piquer les traits larges sur Android, où `lineJoin` n'est pas supporté.

**Le plafond de sommets est une garde de sécurité, pas une optimisation.** iOS
recopie chaque anneau intérieur dans un **tableau de pile** (`AIRMapPolygon.m` :
`CLLocationCoordinate2D coords[holes[h].count]`) sur le thread principal, qui
dispose d'environ 1 Mo. À 16 octets par coordonnée, un anneau de plusieurs
dizaines de milliers de points déborde la pile et tue le processus par SIGSEGV —
invisible à tout `try/catch` JS. Une marche accumule des sommets pendant toute la
vie de l'installation : sans ce plafond, le crash est une question de temps, pas
de mauvais usage. `shapeRingWithin` fait donc converger chaque anneau sous un
budget dur (mesuré : 3260 → 1284 points à 6000 cases).

**Écriture des trous, en deux commits.** `setHoles:` mémorise les anneaux
intérieurs et **retourne sans reconstruire** le polygone ; seul `setCoordinates:`
les consomme. Or les props d'un même commit sont appliquées par énumération de
`NSDictionary`, dont l'ordre n'est pas spécifié : les envoyer ensemble revient à
jouer à pile ou face, et perdre le tirage donne un brouillard plein sans aucun
trou. Les deux écritures sont donc séparées sur deux commits React, le second
décalant les coordonnées d'une valeur très inférieure à la résolution de la carte.

**Limitation connue, assumée.** Une poche inexplorée entièrement encerclée de
territoire connu apparaît révélée. Ce n'est pas un oubli mais un plafond de la
librairie : `Polygon.holes` est une liste **plate** d'anneaux, tous trous de
l'unique anneau extérieur — il n'y a aucun moyen d'exprimer un trou dans un trou.
MapKit le supporte via des polygones intérieurs imbriqués ; y accéder demanderait
un module natif, hors périmètre ici.

**Écarté.** Un polygone par hexagone (le nombre d'overlays explose).

## AD-7 — Moteur de carte : `react-native-maps` (`ui/FogMap.tsx`)

**Décision.** `react-native-maps` — Apple Maps sur iOS, Google Maps sur Android.

**Pourquoi — c'est un arbitrage de _revuabilité_.** C'est le **seul moteur de
carte embarqué dans Expo Go**. Le choisir signifie que l'application se lance en
scannant un QR code : aucun compte, aucun build, aucun Xcode côté relecteur. Pour
un livrable dont la finalité est d'être _examiné_, la friction d'exécution est un
critère de conception au même titre que le rendu.

**Écarté.** _MapLibre_ et _Mapbox_ offrent un contrôle stylistique très supérieur
(dégradés, flou, expressions de style) et Mapbox est probablement la stack réelle
d'une app de marche à grande échelle — mais **aucun des deux ne tourne dans Expo
Go**. En production je m'aligne sur le SDK carte existant : le pipeline de
géométrie (`core/grid` → anneaux façonnés) est inchangé, seul le composant de
rendu est remplacé. C'est exactement pour cela qu'il est isolé derrière `FogMap`.

**Piège trouvé en lisant le code natif.** Sur iOS, `AIRMapPolygon.setHoles:` ne
reconstruit ni le `MKPolygon` ni son renderer : muter _seulement_ les trous ne
repeint pas — exactement notre cas, des trous qui grandissent.

Le premier correctif fut de remonter le polygone via une `key` dérivée de la
géométrie. **C'était faux, et coûteux à découvrir.** La caméra entrait dans cette
clé, donc chaque zoom détruisait et reconstruisait l'overlay ; l'écran mourait
sur un pincement, et le correctif causait le crash qu'il prétendait résoudre. Le
vrai correctif est décrit en AD-6 : deux commits React successifs, le second
décalant les coordonnées d'une valeur inférieure à la résolution de la carte,
pour garantir que `setCoordinates:` s'exécute **après** `setHoles:`.

**Second piège, même famille.** `customMapStyle` est une fonctionnalité Google
Maps : sur iOS avec le provider par défaut, elle est **silencieusement ignorée**.
Le style sombre n'est donc appliqué que sur Android ; Apple Maps passe par
`userInterfaceStyle`. Envoyer les deux aveuglément donnerait du style qui ne
s'applique jamais.

## AD-8 — Backend de synchronisation (`backend/products/fogline-backend/`)

**Décision.** FastAPI minimal, découpage `endpoints → services → repositories →
models`. Une table, contrainte d'unicité `(user_id, cell_id)`.

**Pourquoi le découpage compte ici.** Les règles métier existent : déduplication,
sémantique du curseur, idempotence de l'union. Sans couche service elles se
dispersent — un peu dans l'endpoint, un peu dans le repository qui commit
lui-même, ce qui interdit à tout appelant de composer deux écritures dans une
transaction. Le service possède la transaction ; le repository ne fait que de
l'accès données.

**Concurrence.** L'insertion utilise le `ON CONFLICT DO NOTHING` natif du dialecte,
pas un lire-puis-comparer : le watcher premier plan et la tâche de fond peuvent
pousser en même temps, et un lire-puis-comparer les ferait tous deux insérer la
même cellule, donc violer la contrainte. C'est la base de données qui arbitre.

**Curseur.** Une **chaîne opaque** côté client, qui encode un numéro de séquence
propre à l'identité. La couche transport rejette un curseur du mauvais TYPE en
422, pour qu'un vrai bug client ne soit pas masqué ; une chaîne du bon type mais
non déchiffrable est traitée comme « depuis le début », parce qu'un curseur
opaque peut survivre à un changement d'encodage et que renvoyer un ensemble déjà
détenu ne coûte rien à un client qui fusionne par union.

**Pourquoi une séquence et pas un horodatage.** Une pagination par `id` seul est
non sûre : les identifiants de séquence sont attribués **avant** le commit, donc
deux écrivains concurrents peuvent committer dans l'ordre inverse et laisser un
identifiant plus petit définitivement derrière le curseur d'un lecteur. Un
horodatage règle ça, mais un horodatage **par cellule** est la timeline de
déplacement que le produit promet de ne pas garder : un `ORDER BY` restitue la
séquence datée des hexagones traversés, pauses comprises.

Le numéro de séquence est donc réservé sous un verrou de ligne tenu jusqu'au
commit. Il est total ET monotone dans l'ordre de commit, sans être une horloge —
et la fenêtre de rembobinage que la version horodatée exigeait disparaît avec
elle. La date de révélation reste stockée **à la journée**, granularité
suffisante pour la rétention et inutilisable pour reconstituer un trajet.

**L'app fonctionne sans lui.** Le rendu lit SQLite ; le serveur enrichit
(multi-appareils), il n'est pas un point de défaillance.

**Multi-appareils.** L'exploration est scopée par le `sub` du jeton, c'est-à-dire
par une **identité**, jamais par un téléphone. Faire converger deux appareils est
donc uniquement une question de leur faire présenter la même — ce que l'écran
`app/identity.tsx` permet : il affiche l'identité et accepte d'en adopter une
autre. Le curseur est effacé au passage, car il compte des positions dans le flux
de l'identité **précédente** et le rejouer sauterait tout l'historique antérieur.

Le compromis est explicite et écrit dans l'écran lui-même : cette chaîne est un
secret porteur, et quiconque la détient peut lire les zones parcourues par son
propriétaire. En production, c'est un compte authentifié qui remplace ce
transfert manuel — même contrat côté fusion, qui reste gratuite.

## AD-9 — Alertes de proximité, opt-in (`proximity/geofencing.ts`)

**Décision.** Geofencing OS autour des POI non collectés les plus proches
(plafonné à 18, iOS en autorise ~20), notification locale, **opt-in**.

**Pourquoi.** Le geofencing est surveillé par le système : la consommation est
quasi nulle, contrairement à un calcul de distance en continu.

**Détail qui compte.** L'activation n'est confirmée **qu'après** l'accord OS pour
les notifications. Sans cela, l'interrupteur afficherait « activé » alors
qu'aucune alerte ne peut être délivrée — une fonctionnalité morte et silencieuse.

## AD-10 — Maîtrise de la couche native (`app.json`, `app.config.ts`)

Même livré en Expo, le projet expose la compréhension du natif via les config
plugins :

- **iOS** : `NSLocationWhenInUseUsageDescription`,
  `NSLocationAlwaysAndWhenInUseUsageDescription`, `NSMotionUsageDescription`,
  `UIBackgroundModes: [location]`.
- **Android** : `ACCESS_BACKGROUND_LOCATION`, `ACTIVITY_RECOGNITION`, service de
  premier plan.

Les identifiants de tâches de fond sont déclarés **une seule fois**
(`config/exploration.config.ts`) : l'OS indexe le travail persistant sur ces
chaînes, donc un renommage qui en manquerait une copie laisserait une tâche
enregistrée tournant sans code pour l'arrêter.

## AD-11 — Expo Go est le mode réduit, pas une régression (`engine/location-engine.ts`)

**Le fait.** L'exécution en arrière-plan est **impossible dans Expo Go**, sur iOS
comme sur Android. Ce n'est pas une limite de la feature : Expo Go est une
application générique publiée par Expo, et iOS attribue les autorisations de fond
**au binaire**, pas au JavaScript qui tourne dedans. Dès que le binaire est celui
de l'app — build de dev, APK, TestFlight, App Store — tout fonctionne.

**La décision.** Ne pas contourner, ne pas dupliquer : **un seul code**, deux
capacités runtime. L'enregistrement de la tâche de fond est _sauté_ dans Expo Go
(`if (!isExpoGo())`) — enregistrer une tâche qui ne s'exécutera jamais reviendrait
à promettre une capacité absente, et lèverait sur Android.

**Pourquoi c'est cohérent.** Le brief exige : _« si la permission de fond est
refusée ou révoquée, la fonctionnalité fonctionne en mode réduit, l'expérience se
dégrade gracieusement »_. Expo Go **est** ce mode réduit — même branche de code,
même bandeau, même comportement. La contrainte de plateforme et la contrainte
produit se résolvent au même endroit. `isBackgroundTrackingSupported()` distingue
les deux causes : _permission manquante_ (→ on propose l'escalade) et _runtime
incapable_ (→ on explique, sans proposer un prompt sans issue).

## AD-12 — Skia évalué puis écarté (`ui/`)

**Le contexte.** `@shopify/react-native-skia` **est disponible dans Expo Go** en
SDK 54. Il permettrait un vrai flou GPU, des shaders, du bruit fractal — un
brouillard nettement plus beau en image fixe.

**La décision : ne pas l'utiliser.** Une couche Skia se dessine _au-dessus_ d'une
carte native rendue indépendamment. La caméra doit donc traverser le pont JS à
chaque déplacement, et l'overlay **dérive visiblement pendant le pan et le zoom**.
Meilleure image fixe, pire expérience sur une surface qu'on manipule en
permanence — un mauvais échange pour une carte.

**L'alternative envisagée**, qui règle la dérive : rasteriser le brouillard en
hors-écran avec Skia et le poser en _ground overlay_, ancré en lat/lng et donc
déplacé par la carte elle-même. Écartée pour ce livrable : le rendu devient
dépendant de la résolution et impose une régénération par palier de zoom, pour un
gain qui ne compense pas la complexité à ce niveau de granularité.

**Retenu à la place** : le polygone natif découpé (AD-6), qui reste **exact au
pixel pendant le pan** puisque tout est natif et géoréférencé.

## AD-13 — Point d'entrée et polyfill (`index.js`, `src/polyfills/text-decoder.ts`)

`h3-js` est un build Emscripten qui évalue `new TextDecoder("utf-16le")` **au
chargement du module**. Hermes n'a pas de `TextDecoder` natif ; celui fourni par
le runtime Expo n'implémente que l'UTF-8 et lève. Cette exception se produisant
pendant l'import, elle fait tomber tout le graphe de modules — et l'écran concerné
apparaît alors comme « sans export par défaut », qui est un symptôme, pas la cause.

**Décision.** Un polyfill qui **étend** au lieu de remplacer : l'UTF-8 garde le
chemin natif rapide, seules les variantes UTF-16 sont décodées en JS. Il est
détecté par capacité (si un runtime futur les supporte, il n'installe rien) et
importé en **premier** depuis un point d'entrée dédié, avant le routeur. Les
imports ES étant évalués dans l'ordre source, c'est cette position qui garantit
l'installation avant que le moindre écran ne tire `h3-js`.

Le même module sert de setup aux tests : le contrat est vérifié par le code de
production, pas par un shim spécifique aux tests.

---

## AD-14 — L'échec est un écran, jamais un gel (`providers/AppProviders.tsx`, `components/feedback/`)

**Le problème observé.** Le bootstrap enchaînait cinq `await` — préférences, config,
features, SQLite, i18n — sans `catch`. Une seule étape qui échoue rejette la
promesse en silence : l'état reste `null`, le fallback reste affiché, et
l'application montre **une couleur figée pour toujours**. Du point de vue de qui
teste, c'est indiscernable d'un chargement lent, et il n'y a rien à rapporter
au-delà de « c'est bloqué ». C'est le pire mode de défaillance possible : muet.

**La décision.** Trois garanties, chacune pour une classe distincte de panne.

1. **Un plafond de temps par étape.** Chaque étape asynchrone court contre un
   `Promise.race` : au-delà, elle échoue avec le nom de l'étape qui n'a pas
   répondu. Une promesse qui ne se résout jamais devient un message.
2. **Un écran d'échec sans dépendances.** `BootScreen` est écrit en primitives
   React Native brutes, avec des chaînes littérales et aucune traduction : il doit
   pouvoir s'afficher quand i18n, le thème ou la base sont précisément ce qui a
   cassé. Un écran d'erreur qui dépend de ce qu'il rapporte ne peut rien rapporter.
3. **Une frontière d'erreur à la racine**, au-dessus des providers, pour survivre à
   ce qu'ils lèvent pendant leur propre initialisation.

**Ce que la distinction apprend.** La frontière n'attrape que le JavaScript ; un
crash natif emporte le processus et ne l'atteint jamais. La différence est donc
elle-même un diagnostic : **si l'écran apparaît, la faute est dans notre JS ; si
l'app disparaît, elle est native.** Sur un appareil de test, loin de tout
terminal, c'est le seul canal de débogage disponible.

## AD-15 — Où l'on est et ce qu'on a mérité sont deux questions (`hooks/use-live-position.hook.ts`)

**Décision.** Deux flux distincts sortent du moteur de localisation :
`onLocationFix` émet **chaque fix**, accepté ou rejeté, et `onCellsRevealed`
n'émet que du terrain effectivement gagné.

**Pourquoi.** Le marqueur du marcheur doit suivre la personne même quand le filtre
de marche refuse de révéler — c'est exactement le cas de quelqu'un en train, que
le filtre rejette **par conception** (AD-2). Confondre les deux flux le laisse
planté à des centaines de kilomètres derrière lui, et fait passer une règle
métier correcte pour une géolocalisation cassée. La position est un fait ; la
révélation est une récompense.

**Corollaire.** Le premier fix révèle le sol sous les pieds. Arriver sur une carte
100 % opaque ne lit pas comme une invitation mais comme un rendu raté : aucun
repère, aucune échelle, aucune preuve que la couche fonctionne. On voit où l'on
se tient — l'app accorde donc cela, et demande de marcher pour le reste.

## AD-16 — Un trou hors de son anneau n'est pas un trou (`ui/fog-geometry.ts`)

**Le symptôme.** Au chargement, la carte apparaissait **inversée** : la zone
marchée en violet opaque, et le monde inconnu parfaitement clair. Exactement la
feature à l'envers.

**La cause.** MapKit résout un polygone à trous avec une règle **pair-impair**. Un
anneau intérieur situé entièrement **hors** de l'anneau extérieur n'est donc pas
percé : il est **rempli**. Et cette situation était atteignable de deux façons
banales — la carte se monte avant le premier fix GPS, donc sur un centre par
défaut, pendant que le terrain exploré est ailleurs ; et il suffit de faire
glisser la carte loin de sa zone pour reproduire la même configuration.

**Les deux correctifs, à deux niveaux.**

1. **Structurel** : la carte n'est plus montée avant de savoir où l'on est.
   `initialRegion` n'est lu qu'à la création et jamais relu, donc monter la carte
   sur un centre supposé revient à figer la caméra sur ce mensonge. L'écran de
   localisation n'est pas une politesse d'attente : c'est ce qui garde la
   géométrie cohérente.
2. **Défensif** : tout anneau dont la boîte englobante n'intersecte pas le
   rectangle de brouillard est écarté avant d'atteindre le moteur natif. C'est de
   la **correction**, pas une optimisation — même si cela épargne aussi beaucoup
   de travail au renderer.

**Ce que ça a coûté d'apprendre.** Ce bug ne se voit dans aucun test unitaire de
géométrie pris isolément : chaque fonction produisait un résultat correct. Il
naît de la **relation** entre deux résultats corrects calculés à partir de deux
caméras différentes. Le correctif final dérive donc l'anneau et ses trous d'une
**seule et même** caméra, et le rend impossible à exprimer. Deux tests de
non-régression verrouillent les deux sens : le trou est écarté quand la caméra
l'a quitté, il est conservé quand elle est dessus.

## AD-17 — Les portes dérobées de la règle de marche (`index.js`, `demo/`, `engine/`)

Une règle métier ne vaut que par le nombre de chemins qui la contournent. Un
audit ligne à ligne du livrable en a trouvé trois, toutes invisibles à la lecture
du filtre lui-même, qui est pourtant correct et testé.

**1. Le mode démo écrivait directement dans le magasin.** Il appelait `addCells`
sans jamais passer par `processFix`. Sur un ensemble à croissance seule, c'était
un bouton « tricher » : quelqu'un en train, dont chaque fix réel est explicitement
rejeté, pouvait appuyer dessus et s'attribuer définitivement du territoire que la
règle lui refusait. Chaque segment traverse désormais `processFix`, avec une
référence **locale** — écrire dans la référence persistée ferait mesurer le fix
réel suivant contre une position synthétique.

**2. La vitesse Android à `0.0` était lue comme un vrai zéro.** iOS renvoie une
vitesse **négative** quand il n'en a pas, donc zéro y signifie bien immobile.
Android n'a pas ce sentinelle : `LocationResults.kt` lit `location.speed` sans
consulter `hasSpeed()`, et la plateforme renvoie `0.0f` aussi bien pour « à
l'arrêt » que pour « indisponible », ce qui est fréquent en précision équilibrée.
Combiné à des pas inconnus en arrière-plan sur Android, ce zéro franchissait le
garde-fou de vitesse : **un trajet en voiture révélait l'autoroute.** Il est
désormais traité comme inconnu, ce qui fait retomber le filtre sur la vitesse
déduite du déplacement, qu'aucun véhicule ne peut simuler.

**3. La tâche de fond n'était jamais enregistrée.** `defineTask` vivait au module
scope du moteur, atteignable seulement via l'écran de carte. Les routes
Expo Router sont paresseuses : quand l'OS relance le process en headless après sa
mort — précisément le cas pour lequel cette feature existe — aucune racine React
n'est montée, l'écran n'est jamais évalué, et TaskManager, ne trouvant aucun
handler, peut désenregistrer la tâche. La fonctionnalité centrale du brief tenait
à un import à effet de bord dans `index.js`.

**Ce que j'en retiens.** Les trois défauts sont des défauts de **câblage**, pas
d'algorithme, et aucun test unitaire du cœur pur ne pouvait les voir : chaque
fonction prise isolément était correcte. C'est exactement la limite d'une
stratégie de test centrée sur le cœur pur, et je préfère la nommer que la laisser
passer pour une couverture qu'elle n'est pas.

## Ce que je ferais chez vous

- **M'aligner sur votre SDK carte.** Le pipeline de géométrie ne change pas ; seul
  le composant de rendu est remplacé — il est isolé pour ça.
- **Fusionner plusieurs signaux « à pied »** (podomètre + activity recognition
  natif) avec un score de confiance, et traiter l'anti-spoofing GPS.
- **Compresser le stockage serveur** : les index H3 voisins partagent un préfixe,
  donc bitmap compressé plutôt qu'une ligne par case.
- **Instrumenter le tunnel de permission** et A/B tester le moment de l'escalade :
  c'est là que se joue la valeur réelle de la feature.
- **Profiler batterie et rendu sur anciens appareils.**

## Carte du code

| Fichier                               | Rôle                                             | ADR         |
| ------------------------------------- | ------------------------------------------------ | ----------- |
| `core/grid.ts`                        | encodage H3, révélation, dissolution, dilatation | AD-1, AD-6  |
| `core/motion-filter.ts`               | verdict marche (podomètre, vitesse, fallback)    | AD-2        |
| `core/gset.ts`                        | union et delta d'un ensemble à croissance seule  | AD-5        |
| `core/polygon-shaping.ts`             | simplification RDP + lissage Chaikin             | AD-6        |
| `engine/location-processor.ts`        | fix → décision de révélation (pur)               | AD-2, AD-3  |
| `engine/location-engine.ts`           | watcher, tâche de fond, ingestion                | AD-3, AD-11 |
| `engine/pedometer.ts`                 | pas en direct et historiques                     | AD-2        |
| `engine/permission-machine.ts`        | machine de consentement (pure)                   | AD-4        |
| `data/exploration.store.ts`           | ensemble local, offline-first                    | AD-5        |
| `sync/sync-core.ts`                   | réconciliation delta (pure)                      | AD-5        |
| `ui/layers/FogLayer.tsx`              | le brouillard — l'unique overlay de la carte     | AD-6        |
| `ui/fog-geometry.ts`                  | anneau caméra, trous, plafonds de sécurité       | AD-6        |
| `ui/FogMap.tsx`                       | composition des couches                          | AD-6, AD-7  |
| `ui/onboarding/*` + `app/upgrade.tsx` | chorégraphie du consentement                     | AD-4        |
| `proximity/geofencing.ts`             | alertes de proximité opt-in                      | AD-9        |
| `demo/*`                              | marche rejouée dans le vrai pipeline             | AD-11       |
| `backend/products/fogline-backend/`   | synchronisation multi-appareils                  | AD-8        |
