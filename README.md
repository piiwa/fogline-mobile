# Fogline — brouillard d'exploration

> _« Ma marche révèle la carte. »_
> Une couche d'exploration qui transforme une carte statique en surface vivante :
> le territoire parcouru se **dévoile**, l'inexploré reste sous le brouillard.
> L'état persiste, ne régresse jamais, et se synchronise entre appareils.

Feature Expo (React Native). Nom de code **Fogline**.
Les **arbitrages d'architecture** sont dans [`DECISIONS.md`](./DECISIONS.md) — c'est le cœur du livrable.

---

## La boucle

```
fix GPS (fond + app ouverte)
   → filtre marche          podomètre en vérité terrain, garde-fou vitesse
   → encodage H3            la position devient un identifiant de case ~120 m
   → ensemble local         SQLite, ajout seul, source de vérité du rendu
   → rendu du brouillard    un polygone, le sol marché en découpe, sous les POI
   → synchro delta          union d'ensembles → multi-appareils sans conflit
```

- **Marche uniquement** — pas de pas, pas de révélation : voiture et transports sont filtrés nativement.
- **Arrière-plan** — `expo-location` + `expo-task-manager`, précision _Balanced_, réveils groupés par l'OS.
- **Vie privée** — on ne stocke **jamais** le trajet, seulement des identifiants de cases. Minimisation par conception.
- **Consentement** — écran de valeur, puis « Pendant l'utilisation », puis escalade « Toujours » au bon moment.
- **Dégradation gracieuse** — sans permission de fond : mode réduit ; sans réseau : 100 % hors-ligne.

## Architecture

Cœur pur déterministe (testé sans device) entouré d'une coquille qui parle aux APIs natives.

```
src/features/exploration/
  core/       grid · motion-filter · gset · polygon-shaping        ← PUR, testé
  engine/     location-processor (pur) · permission-machine (pur)
              location-engine · pedometer · permission-service · last-fix-store
  data/       exploration.store · exploration.sqlite-table · exploration.database
              exploration.api · mock-pois
  sync/       sync-core (pur) · sync-service
  ui/         FogMap
              layers/    FogLayer · PoiLayer · UserPuck
              hud/       ExplorationHud · AnimatedNumber · MapControl
              feedback/  RevealFx · PoiSheet · LocatingScreen
              onboarding/ ValuePropScreen · AlwaysUpgradeScreen
              fog-geometry · map-style
  hooks/      use-exploration · use-exploration-tracking · use-live-position
              use-location-permission · use-proximity
  proximity/  geofencing · proximity-notifications
  demo/       demo-route (pur) · use-demo-walk.hook
  config/     exploration.config

src/components/  primitives/ (Button · Text · GlassPanel · PressableScale · SafeScreen)
                 art/ (art-tokens · GlyphArt · ExplorerScene)   ← illustrations, tracées à la main
                 feedback/ (BootScreen · ErrorBoundary)         ← l'échec est un écran, jamais un gel
src/            api · auth · config · i18n · polyfills · providers · storage · theme · utils

app/            _layout · index (routage) · onboarding · map · upgrade + identity (modales) · +not-found
index.js        point d'entrée — installe le polyfill avant le routeur (cf. AD-13)
```

## Lancer l'app

**Deux façons, un seul code.** La carte tourne dans Expo Go ; l'exploration **en
arrière-plan** exige un build — contrainte de plateforme, pas de la feature
(cf. [AD-11](./DECISIONS.md)).

**Sans rien installer** — ouvrir ce lien depuis Expo Go sur un iPhone ou un Android :

```
exp://u.expo.dev/70ed7251-8aa0-424d-b7c4-737421ea5734?channel-name=preview
```

Aucun compte Expo requis : le manifeste de mise à jour est servi publiquement.

**Depuis les sources :**

```bash
pnpm install     # .npmrc : node-linker=hoisted, requis par Metro
pnpm dev         # puis scanner le QR code avec Expo Go
```

|                              | Commande                                 | Ce qui fonctionne                                                                                                         |
| ---------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Expo Go** — le plus rapide | `pnpm dev`                               | Carte, brouillard, révélation **app ouverte**, persistance, synchro, onboarding, permissions, mode démo → **mode réduit** |
| **Build de dev**             | `pnpm run:ios` / `pnpm run:android`      | Tout, **+ arrière-plan + geofencing**                                                                                     |
| **APK partageable**          | `eas build -p android --profile preview` | Tout — lien ou QR, aucun compte développeur payant                                                                        |

Aucun token de carte : Apple Maps sur iOS, Google Maps sur Android.

### Backend de synchronisation (optionnel — l'app fonctionne sans)

```bash
cd ../../../backend/products/fogline-backend
poetry install                    # ajouter --with postgres pour une base hébergée
cp .env.example .env              # DATABASE_URL : SQLite par défaut, ou Neon/Postgres
make migrate && make run          # http://localhost:8250
```

Puis pointer l'app dessus : `EXPO_PUBLIC_API_BASE_URL=http://localhost:8250/api/v1 pnpm dev`

## Voir le brouillard reculer

- **Mode démo** — bouton 👣 sur la carte. Rejoue une marche synthétique **à travers
  le vrai pipeline** (filtre → grille → stockage → révélation → synchro). C'est la
  façon la plus rapide de voir la feature entière, y compris en Expo Go.
- **Téléphone réel** — marcher ~100 m dehors. Seul contexte avec un vrai podomètre.
- **Simulateur iOS** — _Features › Location › City Run_. Pas de podomètre sur
  simulateur (aucun CoreMotion), le filtre bascule donc sur la vitesse (cf. AD-2).
- **Démontrer le filtre marche** — passer en _Freeway Drive_ : **rien ne se révèle**
  (vitesse véhicule rejetée). Revenir en _City Run_ : la révélation reprend.
- **Multi-appareils** — sur l'appareil A, ouvrir l'écran **Identité** (dernier
  bouton de la rangée du bas) et copier la chaîne. Sur l'appareil B, ouvrir le même
  écran, la coller, valider : les deux cartes fusionnent par union, dans les deux
  sens (cf. AD-5, AD-8).
  Le backend de démonstration tourne sur une instance gratuite qui se met en veille
  après inactivité : le tout premier appel peut mettre une trentaine de secondes à
  réveiller le service. La synchro étant best-effort, l'app reste utilisable
  pendant ce temps et rattrape à la tentative suivante.

## Qualité

```bash
pnpm typecheck    # tsc --noEmit, strict + noUncheckedIndexedAccess
pnpm test         # 42 tests, 11 suites
pnpm lint
pnpm validate     # typecheck + lint + format + knip (deadcode)
```

Le cœur pur — encodage spatial, filtre de marche, fusion d'ensembles, machine de
consentement, façonnage des anneaux, réconciliation de synchro — est testé **sans
device**. C'est ce qui rend l'ensemble vérifiable et modifiable sans peur.

Backend : `make check` (black, isort, flake8, **mypy strict**, pytest).

## Périmètre — ce qui est volontairement hors scope

Pas l'application complète · pas le système de récompenses · pas d'authentification
réelle (session d'appareil, JWT) · POI simulés · i18n FR + EN · pas d'anti-spoofing
GPS (sujet de production réel, documenté). **Chaque limite est écrite**, jamais silencieuse.
