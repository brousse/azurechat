import { describe, it, expect } from "vitest";
import { createSandboxUrlTransform } from "../sandbox-url-transform";

const SANDBOX = "sandbox:/mnt/data/red.png";
const STORED = "https://blob.example.com/red.png";

async function pipe(chunks: any[]): Promise<any[]> {
  const transform = createSandboxUrlTransform()();
  const out: any[] = [];
  const writer = transform.writable.getWriter();
  const reader = transform.readable.getReader();
  const readAll = (async () => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      out.push(value);
    }
  })();
  for (const c of chunks) await writer.write(c);
  await writer.close();
  await readAll;
  return out;
}

describe("sandbox-url-transform", () => {
  it("rewrites a sandbox URL in a later text-delta using a prior tool-result", async () => {
    const out = await pipe([
      {
        type: "tool-result",
        toolName: "code_interpreter",
        output: { outputs: [{ type: "image", url: STORED, filename: "red.png" }] },
      },
      { type: "text-delta", id: "1", text: `Here it is: ![](${SANDBOX})` },
      { type: "text-end", id: "1" },
    ]);

    const textChunks = out.filter((c) => c.type === "text-delta");
    expect(textChunks).toHaveLength(1);
    expect(textChunks[0].text).toContain(STORED);
    expect(textChunks[0].text).not.toContain(SANDBOX);
  });

  it("passes through chunks unchanged when no file map is built", async () => {
    const input = [
      { type: "text-delta", id: "1", text: "plain text" },
      { type: "text-end", id: "1" },
    ];
    const out = await pipe(input);
    expect(out).toEqual(input);
  });

  it("ignores tool-results from other tools", async () => {
    const out = await pipe([
      {
        type: "tool-result",
        toolName: "search_documents",
        output: { outputs: [{ type: "image", url: STORED, filename: "red.png" }] },
      },
      { type: "text-delta", id: "1", text: `![](${SANDBOX})` },
    ]);
    const text = out.find((c) => c.type === "text-delta");
    expect(text.text).toContain(SANDBOX);
    expect(text.text).not.toContain(STORED);
  });

  it("does not register a tool output whose URL is itself a sandbox path", async () => {
    const out = await pipe([
      {
        type: "tool-result",
        toolName: "code_interpreter",
        output: { outputs: [{ type: "image", url: SANDBOX, filename: "red.png" }] },
      },
      { type: "text-delta", id: "1", text: `![](${SANDBOX})` },
    ]);
    const text = out.find((c) => c.type === "text-delta");
    expect(text.text).toContain(SANDBOX);
  });
});
