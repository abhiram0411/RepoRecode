import { expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
// @ts-expect-error JavaScript community module under integration test.
import { createCommunity } from "../server/community.mjs";

it("preserves UTF-8 feedback split across incoming request chunks", async () => {
  const directory = await mkdtemp(join(tmpdir(), "reporecode-community-utf8-"));
  try {
    const community = createCommunity({
      COMMUNITY_STORAGE_PATH: join(directory, "feedback.json"),
    });
    const message = "Please support Unicode: 🧪 नमस्ते 中文";
    const bytes = Buffer.from(JSON.stringify({ category: "general", message }), "utf8");
    const split = bytes.indexOf(Buffer.from("🧪")) + 2;
    expect(split).toBeGreaterThan(1);
    const chunks = [bytes.subarray(0, split), bytes.subarray(split)];
    const req = {
      method: "POST",
      socket: { remoteAddress: "127.0.0.1" },
      async *[Symbol.asyncIterator]() {
        for (const chunk of chunks) yield chunk;
      },
    };
    let status = 0;
    await community.handle("/api/feedback", req, (code: number) => {
      status = code;
    });
    expect(status).toBe(201);
    expect((await community.snapshot()).feedback[0].message).toBe(message);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it("rejects invalid UTF-8 rather than silently changing feedback text", async () => {
  const directory = await mkdtemp(join(tmpdir(), "reporecode-invalid-utf8-"));
  try {
    const community = createCommunity({
      COMMUNITY_STORAGE_PATH: join(directory, "feedback.json"),
    });
    const invalid = Buffer.concat([
      Buffer.from('{"category":"general","message":"A useful report '),
      Buffer.from([0xc3, 0x28]),
      Buffer.from(' with details"}'),
    ]);
    const req = {
      method: "POST",
      socket: { remoteAddress: "127.0.0.1" },
      async *[Symbol.asyncIterator]() {
        yield invalid;
      },
    };
    let status = 0;
    await community.handle("/api/feedback", req, (code: number) => {
      status = code;
    });
    expect(status).toBe(400);
    expect((await community.snapshot()).feedbackCount).toBe(0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it("returns HTTP 413 for feedback exceeding the 16,000-byte request limit", async () => {
  const directory = await mkdtemp(join(tmpdir(), "reporecode-large-feedback-"));
  try {
    const community = createCommunity({
      COMMUNITY_STORAGE_PATH: join(directory, "feedback.json"),
    });
    const req = {
      method: "POST",
      socket: { remoteAddress: "127.0.0.1" },
      async *[Symbol.asyncIterator]() {
        yield Buffer.alloc(16001, 0x61);
      },
    };
    let status = 0;
    await community.handle("/api/feedback", req, (code: number) => {
      status = code;
    });
    expect(status).toBe(413);
    expect((await community.snapshot()).feedbackCount).toBe(0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
