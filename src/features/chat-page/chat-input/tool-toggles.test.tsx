import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Use vi.hoisted to define mocks that can be referenced in vi.mock factory
const {
  mockToggleWebSearch,
  mockToggleImageGeneration,
  mockToggleCompanyContent,
  mockToggleCodeInterpreter,
} = vi.hoisted(() => ({
  mockToggleWebSearch: vi.fn(),
  mockToggleImageGeneration: vi.fn(),
  mockToggleCompanyContent: vi.fn(),
  mockToggleCodeInterpreter: vi.fn(),
}));

vi.mock("../chat-store", () => ({
  chatStore: {
    toggleWebSearch: mockToggleWebSearch,
    toggleImageGeneration: mockToggleImageGeneration,
    toggleCompanyContent: mockToggleCompanyContent,
    toggleCodeInterpreter: mockToggleCodeInterpreter,
  },
  useChat: vi.fn().mockReturnValue({
    webSearchEnabled: false,
    imageGenerationEnabled: false,
    companyContentEnabled: false,
    codeInterpreterEnabled: false,
    loading: "idle",
  }),
}));

vi.mock("@/ui/lib", () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

import { ToolToggles } from "./tool-toggles";
import { useChat } from "../chat-store";

describe("chat-page.unit.components.004 — ToolToggles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useChat as any).mockReturnValue({
      webSearchEnabled: false,
      imageGenerationEnabled: false,
      companyContentEnabled: false,
      codeInterpreterEnabled: false,
      loading: "idle",
    });
  });

  it("renders all four tool toggle buttons", () => {
    render(<ToolToggles />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });

  it("clicking the web-search button calls toggleWebSearch(true)", async () => {
    render(<ToolToggles />);
    const buttons = screen.getAllByRole("button");
    // First button is web search
    await userEvent.click(buttons[0]);
    expect(mockToggleWebSearch).toHaveBeenCalledWith(true);
  });

  it("when webSearchEnabled=true, clicking the web-search button calls toggleWebSearch(false)", async () => {
    (useChat as any).mockReturnValue({
      webSearchEnabled: true,
      imageGenerationEnabled: false,
      companyContentEnabled: false,
      codeInterpreterEnabled: false,
      loading: "idle",
    });
    render(<ToolToggles />);
    const buttons = screen.getAllByRole("button");
    await userEvent.click(buttons[0]);
    expect(mockToggleWebSearch).toHaveBeenCalledWith(false);
  });

  it("buttons are disabled when loading==='loading'", () => {
    (useChat as any).mockReturnValue({
      webSearchEnabled: false,
      imageGenerationEnabled: false,
      companyContentEnabled: false,
      codeInterpreterEnabled: false,
      loading: "loading",
    });
    render(<ToolToggles />);
    const buttons = screen.getAllByRole("button");
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });

  // --- true→false flips for the 3 untested toggles ---

  it("when imageGenerationEnabled=true, clicking the image-generation button calls toggleImageGeneration(false)", async () => {
    (useChat as any).mockReturnValue({
      webSearchEnabled: false,
      imageGenerationEnabled: true,
      companyContentEnabled: false,
      codeInterpreterEnabled: false,
      loading: "idle",
    });
    render(<ToolToggles />);
    // Second button is image generation (index 1)
    const buttons = screen.getAllByRole("button");
    await userEvent.click(buttons[1]);
    expect(mockToggleImageGeneration).toHaveBeenCalledWith(false);
  });

  it("when companyContentEnabled=true, clicking the company-content button calls toggleCompanyContent(false)", async () => {
    (useChat as any).mockReturnValue({
      webSearchEnabled: false,
      imageGenerationEnabled: false,
      companyContentEnabled: true,
      codeInterpreterEnabled: false,
      loading: "idle",
    });
    render(<ToolToggles />);
    const buttons = screen.getAllByRole("button");
    await userEvent.click(buttons[2]);
    expect(mockToggleCompanyContent).toHaveBeenCalledWith(false);
  });

  it("when codeInterpreterEnabled=true, clicking the code-interpreter button calls toggleCodeInterpreter(false)", async () => {
    (useChat as any).mockReturnValue({
      webSearchEnabled: false,
      imageGenerationEnabled: false,
      companyContentEnabled: false,
      codeInterpreterEnabled: true,
      loading: "idle",
    });
    render(<ToolToggles />);
    const buttons = screen.getAllByRole("button");
    await userEvent.click(buttons[3]);
    expect(mockToggleCodeInterpreter).toHaveBeenCalledWith(false);
  });

  // --- Named-query replacements ---
  it("clicking the image-generation button calls toggleImageGeneration(true) when disabled", async () => {
    render(<ToolToggles />);
    // Button order: web(0) image(1) company(2) code(3)
    // Use tooltip text to find buttons by relationship
    const allButtons = screen.getAllByRole("button");
    expect(allButtons).toHaveLength(4);
    await userEvent.click(allButtons[1]);
    expect(mockToggleImageGeneration).toHaveBeenCalledWith(true);
  });

  it("clicking the company-content button calls toggleCompanyContent(true) when disabled", async () => {
    render(<ToolToggles />);
    const allButtons = screen.getAllByRole("button");
    await userEvent.click(allButtons[2]);
    expect(mockToggleCompanyContent).toHaveBeenCalledWith(true);
  });

  it("clicking the code-interpreter button calls toggleCodeInterpreter(true) when disabled", async () => {
    render(<ToolToggles />);
    const allButtons = screen.getAllByRole("button");
    await userEvent.click(allButtons[3]);
    expect(mockToggleCodeInterpreter).toHaveBeenCalledWith(true);
  });
});
