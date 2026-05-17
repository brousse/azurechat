import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/features/chat-page/chat-services/code-interpreter-service", () => ({
  UploadFileForCodeInterpreter: vi.fn(),
}));

vi.mock("@/features/auth-page/helpers", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/common/services/logger", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  logDebug: vi.fn(),
}));

import { UploadFileForCodeInterpreter } from "@/features/chat-page/chat-services/code-interpreter-service";
import { getCurrentUser } from "@/features/auth-page/helpers";
import { POST } from "./route";

const mockedUpload = UploadFileForCodeInterpreter as ReturnType<typeof vi.fn>;
const mockedGetCurrentUser = getCurrentUser as ReturnType<typeof vi.fn>;

const defaultUser = {
  name: "Test User",
  email: "test@example.com",
  isAdmin: false,
  token: "tok",
  image: "",
  isLocalDevUser: false,
};

/** Build a mock Request whose formData() resolves with the given FormData. */
function makeMockRequest(fd: FormData): Request {
  return {
    formData: vi.fn().mockResolvedValue(fd),
    signal: new AbortController().signal,
  } as unknown as Request;
}

function buildRequest(file: File | null): Request {
  const fd = new FormData();
  if (file) fd.set("file", file);
  return makeMockRequest(fd);
}

describe("/api/code-interpreter/upload route", () => {
  beforeEach(() => {
    mockedUpload.mockReset();
    mockedGetCurrentUser.mockReset();
    mockedGetCurrentUser.mockResolvedValue(defaultUser);
  });

  // api.unit.ci-upload.001
  it("returns 400 when no file provided", async () => {
    const req = buildRequest(null);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ error: "No file provided" });
  });

  // api.unit.ci-upload.002
  it("returns 400 when file > 512MB", async () => {
    const file = new File(["x"], "big.csv", { type: "text/csv" });
    Object.defineProperty(file, "size", { value: 512 * 1024 * 1024 + 1, configurable: true });
    const req = buildRequest(file);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/exceeds maximum/i);
  });

  // api.unit.ci-upload.003
  it("returns 400 when extension unsupported", async () => {
    const file = new File(["evil"], "x.exe", { type: "application/octet-stream" });
    const req = buildRequest(file);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/not supported/i);
  });

  // api.unit.ci-upload.004
  it("happy path returns 200 with {id, name}", async () => {
    mockedUpload.mockResolvedValue({
      status: "OK",
      response: { id: "file_abc", name: "data.csv" },
    });
    const file = new File(["col1,col2\n1,2"], "data.csv", { type: "text/csv" });
    const req = buildRequest(file);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ id: "file_abc", name: "data.csv" });
  });

  // api.unit.ci-upload.005
  it("returns 500 on UploadFileForCodeInterpreter ERROR", async () => {
    mockedUpload.mockResolvedValue({
      status: "ERROR",
      errors: [{ message: "upload failed" }],
    });
    const file = new File(["data"], "data.csv", { type: "text/csv" });
    const req = buildRequest(file);
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/upload failed/);
  });

  // api.unit.ci-upload.006
  // getCurrentUser throwing causes the outer catch → 500
  it("getCurrentUser throwing yields 500", async () => {
    mockedGetCurrentUser.mockRejectedValue(new Error("User not found"));
    const file = new File(["data"], "data.csv", { type: "text/csv" });
    const req = buildRequest(file);
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  // api.unit.ci-upload.007
  // getCurrentUser returning null → 401 (auth gate in route, before formData is read)
  it("returns 401 when getCurrentUser returns null", async () => {
    mockedGetCurrentUser.mockResolvedValue(null);
    const file = new File(["data"], "data.csv", { type: "text/csv" });
    const req = buildRequest(file);
    const res = await POST(req);
    expect(res.status).toBe(401);
    const text = await res.text();
    expect(text).toMatch(/Unauthorized/i);
  });

  // api.unit.ci-upload.008
  // non-Error throw → covers String(error) branch in catch (line 71)
  it("returns 500 on non-Error throw (covers String(error) branch)", async () => {
    mockedGetCurrentUser.mockRejectedValue("raw string error");
    const file = new File(["data"], "data.csv", { type: "text/csv" });
    const req = buildRequest(file);
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
