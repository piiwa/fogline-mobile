/**
 * Teach `TextDecoder` the UTF-16 encodings.
 *
 * WHY THIS EXISTS
 * h3-js ships an Emscripten build that, at module load, evaluates:
 *     new TextDecoder("utf-16le")
 * Hermes has no built-in `TextDecoder`; Expo's runtime supplies one that only
 * implements UTF-8 and throws `RangeError: Unknown encoding: utf-16le` for
 * anything else. That throw happens during import, so it takes down the whole
 * module graph — the screen importing it then looks like it "has no default
 * export", which is a symptom, not the cause.
 *
 * The decoder is only reached by Emscripten's `UTF16ToString`, which the H3 API
 * we use never calls — but the constructor runs eagerly, so it must not throw.
 * We therefore extend, rather than replace: UTF-8 keeps the platform's fast
 * native path, and only the UTF-16 variants are decoded in JS.
 *
 * Feature-detected: if a future runtime supports UTF-16 natively, this installs
 * nothing.
 *
 * SIDE-EFFECT MODULE, deliberately. `import "…/text-decoder"` installs the patch
 * at evaluation time. That matters because ES imports are hoisted: a module that
 * imported a function and *called* it would still have evaluated every other
 * import — including h3-js — before the call ran. Installing during evaluation,
 * from the first import in `index.js`, is what guarantees the ordering.
 */

type DecoderCtor = new (encoding?: string, options?: TextDecoderOptions) => TextDecoder;

const UTF16_LE = "utf-16le";
const UTF16_BE = "utf-16be";

function supportsUtf16(Ctor: DecoderCtor | undefined): boolean {
  if (!Ctor) return false;
  try {
    new Ctor(UTF16_LE);
    return true;
  } catch {
    return false;
  }
}

/** Decode a byte buffer as UTF-16, honouring surrogate pairs via code units. */
function decodeUtf16(input: ArrayBufferView | ArrayBuffer, littleEndian: boolean): string {
  const bytes =
    input instanceof ArrayBuffer
      ? new Uint8Array(input)
      : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);

  // Build in chunks: String.fromCharCode.apply blows the stack on large inputs.
  const CHUNK = 0x2000;
  const units: number[] = [];
  let out = "";

  for (let i = 0; i + 1 < bytes.length; i += 2) {
    const a = bytes[i] as number;
    const b = bytes[i + 1] as number;
    units.push(littleEndian ? a | (b << 8) : (a << 8) | b);
    if (units.length >= CHUNK) {
      out += String.fromCharCode(...units);
      units.length = 0;
    }
  }
  if (units.length > 0) out += String.fromCharCode(...units);
  return out;
}

function installTextDecoderPolyfill(): void {
  const globalScope = globalThis as { TextDecoder?: DecoderCtor };
  const Native = globalScope.TextDecoder;

  if (supportsUtf16(Native)) return;

  class PatchedTextDecoder {
    readonly encoding: string;
    readonly fatal: boolean;
    readonly ignoreBOM: boolean;
    private readonly delegate: TextDecoder | null;

    constructor(encoding: string = "utf-8", options: TextDecoderOptions = {}) {
      this.encoding = encoding.toLowerCase();
      this.fatal = options.fatal ?? false;
      this.ignoreBOM = options.ignoreBOM ?? false;

      const isUtf16 = this.encoding === UTF16_LE || this.encoding === UTF16_BE;
      this.delegate = isUtf16 || !Native ? null : new Native(encoding, options);
    }

    decode(input?: ArrayBufferView | ArrayBuffer): string {
      if (input === undefined) return "";
      if (this.delegate) return this.delegate.decode(input);
      return decodeUtf16(input, this.encoding !== UTF16_BE);
    }
  }

  globalScope.TextDecoder = PatchedTextDecoder as unknown as DecoderCtor;
}

installTextDecoderPolyfill();
