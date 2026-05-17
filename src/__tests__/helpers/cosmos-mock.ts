import { vi } from "vitest";

export type CosmosDoc = Record<string, any> & { id?: string };

export interface InMemoryContainer {
  items: CosmosDoc[];
  create: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  read: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  query: ReturnType<typeof vi.fn>;
}

export function createInMemoryContainer(seed: CosmosDoc[] = []): InMemoryContainer {
  const items = [...seed];

  const itemHandle = (id: string) => ({
    read: vi.fn(async () => ({ resource: items.find((i) => i.id === id) })),
    patch: vi.fn(async (ops: Array<{ op: string; path: string; value: any }>) => {
      const idx = items.findIndex((i) => i.id === id);
      if (idx === -1) throw Object.assign(new Error("Not found"), { code: 404 });
      for (const op of ops) {
        const key = op.path.replace(/^\//, "");
        if (op.op === "set" || op.op === "replace" || op.op === "add") {
          items[idx][key] = op.value;
        } else if (op.op === "remove") {
          delete items[idx][key];
        }
      }
      return { resource: items[idx] };
    }),
    delete: vi.fn(async () => {
      const idx = items.findIndex((i) => i.id === id);
      if (idx >= 0) items.splice(idx, 1);
      return { resource: undefined };
    }),
  });

  const container: InMemoryContainer = {
    items,
    create: vi.fn(async (doc: CosmosDoc) => {
      const stored = { ...doc, id: doc.id ?? `id-${items.length + 1}` };
      items.push(stored);
      return { resource: stored };
    }),
    upsert: vi.fn(async (doc: CosmosDoc) => {
      const idx = items.findIndex((i) => i.id === doc.id);
      if (idx >= 0) items[idx] = doc;
      else items.push(doc);
      return { resource: doc };
    }),
    read: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    query: vi.fn(),
  };

  const containerObj: any = {
    item: (id: string) => itemHandle(id),
    items: {
      create: container.create,
      upsert: container.upsert,
      query: (_q: any) => ({
        fetchAll: async () => ({ resources: [...items] }),
        fetchNext: async () => ({ resources: [...items], hasMoreResults: false }),
      }),
    },
  };

  Object.assign(container, { _container: containerObj });
  return container;
}

export function mockCosmosClient(containers: Record<string, InMemoryContainer> = {}) {
  vi.mock("@azure/cosmos", () => {
    return {
      CosmosClient: vi.fn().mockImplementation(() => ({
        database: () => ({
          container: (name: string) => (containers[name] as any)?._container ?? createInMemoryContainer()._container,
        }),
      })),
    };
  });
}
