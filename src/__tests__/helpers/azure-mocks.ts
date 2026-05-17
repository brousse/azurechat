import { vi } from "vitest";

export function mockAzureSearch() {
  const search = vi.fn(async () => ({
    results: (async function* () {})(),
    count: 0,
  }));
  const uploadDocuments = vi.fn(async () => ({ results: [] }));
  const deleteDocuments = vi.fn(async () => ({ results: [] }));
  const SearchClient = vi.fn().mockImplementation(() => ({
    search,
    uploadDocuments,
    deleteDocuments,
  }));
  return { search, uploadDocuments, deleteDocuments, SearchClient };
}

export function mockBlobStorage() {
  const upload = vi.fn(async () => ({ requestId: "req-1" }));
  const download = vi.fn(async () => ({ readableStreamBody: null }));
  const exists = vi.fn(async () => true);
  const deleteBlob = vi.fn(async () => ({ requestId: "req-2" }));
  const getBlockBlobClient = vi.fn(() => ({
    upload,
    uploadData: upload,
    download,
    exists,
    delete: deleteBlob,
    url: "https://teststorage.blob.core.windows.net/c/x",
  }));
  const getContainerClient = vi.fn(() => ({
    getBlockBlobClient,
    createIfNotExists: vi.fn(async () => ({})),
    exists: vi.fn(async () => true),
  }));
  const BlobServiceClient = vi.fn().mockImplementation(() => ({
    getContainerClient,
  }));
  (BlobServiceClient as any).fromConnectionString = vi.fn().mockImplementation(() => ({ getContainerClient }));
  return { upload, download, exists, deleteBlob, getBlockBlobClient, getContainerClient, BlobServiceClient };
}

export function mockKeyVault() {
  const secrets: Record<string, string> = {};
  const setSecret = vi.fn(async (name: string, value: string) => {
    secrets[name] = value;
    return { name, value };
  });
  const getSecret = vi.fn(async (name: string) => ({ name, value: secrets[name] ?? "" }));
  const beginDeleteSecret = vi.fn(async (name: string) => {
    delete secrets[name];
    return { pollUntilDone: async () => undefined };
  });
  const SecretClient = vi.fn().mockImplementation(() => ({ setSecret, getSecret, beginDeleteSecret }));
  return { setSecret, getSecret, beginDeleteSecret, SecretClient, _secrets: secrets };
}

export function mockOpenAI() {
  const create = vi.fn();
  const responsesCreate = vi.fn();
  const filesCreate = vi.fn(async () => ({ id: "file-1" }));
  const filesContent = vi.fn(async () => new Blob([new Uint8Array([1, 2, 3])]));
  const embeddingsCreate = vi.fn(async () => ({
    data: [{ embedding: new Array(1536).fill(0.1) }],
  }));
  const OpenAI = vi.fn().mockImplementation(() => ({
    chat: { completions: { create } },
    responses: { create: responsesCreate },
    files: { create: filesCreate, content: filesContent },
    embeddings: { create: embeddingsCreate },
  }));
  return { create, responsesCreate, filesCreate, filesContent, embeddingsCreate, OpenAI };
}

export function sseStream(events: Array<{ event?: string; data: any }>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const e of events) {
        const chunk = `${e.event ? `event: ${e.event}\n` : ""}data: ${typeof e.data === "string" ? e.data : JSON.stringify(e.data)}\n\n`;
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

export async function collectStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value);
  }
  return out;
}
