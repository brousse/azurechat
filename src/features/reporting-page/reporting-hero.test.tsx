import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReportingHero } from "./reporting-hero";

vi.mock("@/features/ui/hero", () => ({
  Hero: ({ title, description }: { title: React.ReactNode; description: string }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));

vi.mock("@/features/ui/mobile-header", () => ({
  MobileHeader: ({ title }: { title: string }) => <header>{title}</header>,
}));

describe("reporting-hero.unit.001 — renders hero description", () => {
  it("displays the administration description text", () => {
    render(<ReportingHero />);
    expect(
      screen.getByText(
        "Administration view for monitoring conversation history for all users"
      )
    ).toBeInTheDocument();
  });
});

describe("reporting-hero.unit.002 — renders Chat Report title text", () => {
  it("renders Chat Report text in the title area", () => {
    render(<ReportingHero />);
    expect(screen.getByText(/Chat Report/i)).toBeInTheDocument();
  });
});
