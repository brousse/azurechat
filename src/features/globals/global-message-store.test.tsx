import { describe, it, expect, vi, beforeEach } from "vitest";

const toast = vi.fn();
vi.mock("../ui/use-toast", () => ({ toast: (...args: any[]) => toast(...args) }));

import { showError, showSuccess } from "./global-message-store";

beforeEach(() => {
  toast.mockClear();
});

describe("global-message-store.showError", () => {
  it("globals.unit.message-store.001: dispatches a destructive toast with the error text", () => {
    showError("boom");
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast.mock.calls[0][0]).toMatchObject({
      variant: "destructive",
      description: "boom",
    });
    expect(toast.mock.calls[0][0].action).toBeUndefined();
  });

  it("globals.unit.message-store.002: when reload callback supplied, action renders Try again and invokes the callback", () => {
    const reload = vi.fn();
    showError("boom", reload);
    const payload = toast.mock.calls[0][0];
    expect(payload.action).toBeDefined();
    payload.action.props.onClick();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe("global-message-store.showSuccess", () => {
  it("globals.unit.message-store.003: dispatches a toast with title + description as-is", () => {
    showSuccess({ title: "Saved", description: "Persona updated" });
    expect(toast).toHaveBeenCalledWith({ title: "Saved", description: "Persona updated" });
  });
});
