import { describe, it, expect, vi } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { useResetableActionState } from "./useResetableActionState";

/**
 * Host component wiring the hook to a minimal UI so we can exercise
 * dispatch + reset without relying on unstable renderHook internals
 * for React 19 action state.
 */
function HostComponent({
  action,
  initialState,
}: {
  action: (state: string, payload: string) => Promise<string>;
  initialState: string;
}) {
  const [state, dispatch, reset, isPending] = useResetableActionState(
    action,
    initialState
  );

  return (
    <div>
      <span data-testid="state">{state}</span>
      <span data-testid="pending">{String(isPending)}</span>
      <button onClick={() => dispatch("payload-value")}>dispatch</button>
      <button onClick={() => reset()}>reset</button>
    </div>
  );
}

describe("common.unit.useResetableActionState", () => {
  it("common.unit.useResetableActionState.001: renders initialState before any interaction", () => {
    const action = vi.fn(async () => "new-state");
    render(<HostComponent action={action} initialState="initial" />);
    expect(screen.getByTestId("state").textContent).toBe("initial");
  });

  it("common.unit.useResetableActionState.002: dispatching with a payload calls the action", async () => {
    const action = vi.fn(async (_state: string, payload: string) => `result:${payload}`);
    render(<HostComponent action={action} initialState="start" />);

    await act(async () => {
      await userEvent.click(screen.getByText("dispatch"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("state").textContent).toContain("result:");
    });

    expect(action).toHaveBeenCalledWith("start", "payload-value");
  });

  it("common.unit.useResetableActionState.003: reset returns state to initialState", async () => {
    const action = vi.fn(async () => "after-dispatch");
    render(<HostComponent action={action} initialState="initial" />);

    // First dispatch to change state
    await act(async () => {
      await userEvent.click(screen.getByText("dispatch"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("state").textContent).toBe("after-dispatch");
    });

    // Then reset
    await act(async () => {
      await userEvent.click(screen.getByText("reset"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("state").textContent).toBe("initial");
    });
  });
});
