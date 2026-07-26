import "../text-decoder";

/**
 * Regression guard. h3-js evaluates `new TextDecoder("utf-16le")` at import
 * time; when the runtime rejects that encoding the whole module graph fails to
 * load and screens surface as "missing default export". These assertions lock
 * the contract the app depends on, whatever provides it.
 */
describe("TextDecoder UTF-16 support", () => {
  it("decodes utf-16le bytes", () => {
    // "Hi" — little-endian code units.
    const bytes = new Uint8Array([0x48, 0x00, 0x69, 0x00]);
    expect(new TextDecoder("utf-16le").decode(bytes)).toBe("Hi");
  });
});
