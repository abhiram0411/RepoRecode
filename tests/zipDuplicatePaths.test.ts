import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { zipImport } from "../src/core/import";

/** Mutate ZIP names without changing their lengths, leaving a valid archive. */
function replaceAllAscii(bytes: Uint8Array, from: string, to: string) {
  if (from.length !== to.length) throw Error("ZIP fixture names must match in length");
  const copy = bytes.slice();
  const oldName = new TextEncoder().encode(from);
  const newName = new TextEncoder().encode(to);
  let count = 0;
  for (let i = 0; i <= copy.length - oldName.length; i++) {
    if (oldName.every((value, j) => copy[i + j] === value)) {
      copy.set(newName, i);
      i += oldName.length - 1;
      count++;
    }
  }
  if (count !== 2) throw Error(`Expected local and central ZIP names, got ${count}`);
  return copy;
}

function centralOffset(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i <= bytes.length - 4; i++) {
    if (view.getUint32(i, true) === 0x02014b50) return i;
  }
  throw Error("Missing ZIP central entry");
}

describe("ZIP import central-directory integrity", () => {
  it("rejects duplicate supported source paths before decompression", () => {
    const archive = zipSync({
      "src/a.ts": strToU8("export const a = 1;"),
      "src/b.ts": strToU8("export const b = 2;"),
    });
    const duplicate = replaceAllAscii(archive, "src/b.ts", "src/a.ts");
    expect(() => zipImport(duplicate)).toThrow(/Duplicate ZIP source path/);
  });

  it("rejects central entries whose declared names exceed the directory", () => {
    const archive = zipSync({ "src/a.ts": strToU8("export const a = 1;") });
    const broken = archive.slice();
    const view = new DataView(broken.buffer, broken.byteOffset, broken.byteLength);
    view.setUint16(centralOffset(broken) + 28, 0xffff, true);
    expect(() => zipImport(broken)).toThrow(/Invalid ZIP entry/);
  });

  it("continues importing ordinary source ZIPs", () => {
    const archive = zipSync({ "project/src/a.ts": strToU8("export const a = 1;") });
    expect(zipImport(archive)).toEqual([
      { path: "src/a.ts", content: "export const a = 1;" },
    ]);
  });
});
