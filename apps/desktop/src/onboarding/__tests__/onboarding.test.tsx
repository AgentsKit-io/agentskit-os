/**
 * Integration tests for the onboarding tour components.
 *
 * @tauri-apps/api/event and @agentskit/os-ui are mocked so tests run in jsdom
 * without a native Tauri runtime. localStorage is reset before each test by
 * the shared setup file.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock Tauri event API
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => undefined)),
}));

// Mock @agentskit/os-ui primitives with minimal HTML shims
vi.mock("@agentskit/os-ui", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  GlassPanel: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="glass-panel" className={className}>
      {children}
    </div>
  ),
  Card: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="card" {...props}>
      {children}
    </div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  Kbd: ({ children }: { children: React.ReactNode }) => <kbd>{children}</kbd>,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Import modules fresh for each test suite that needs isolation
async function renderTour() {
  const { OnboardingProvider } = await import("../onboarding-provider");
  const { OnboardingTour } = await import("../index");

  return render(
    <OnboardingProvider>
      <div data-testid="app-content">App</div>
      <OnboardingTour />
    </OnboardingProvider>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("first-run: tour activates automatically", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it("shows the tour after 200 ms when onboarding is not completed", async () => {
    await renderTour();

    // Before the delay, tour should not be visible
    expect(screen.queryByRole("dialog")).toBeNull();

    // Advance past the 200 ms delay
    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("Welcome to AgentsKit OS")).toBeDefined();
  });

  it("does NOT show the tour when onboarding is already completed", async () => {
    const { markOnboardingComplete } = await import("../use-onboarding-store");
    markOnboardingComplete();

    await renderTour();

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("navigation: next and prev", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it("advances to the next step when Next is clicked", async () => {
    await renderTour();

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    // Step 1: Welcome
    expect(screen.getByText("Welcome to AgentsKit OS")).toBeDefined();

    // Click Next
    const nextBtn = screen.getByRole("button", { name: /next/i });
    await act(async () => {
      fireEvent.click(nextBtn);
    });

    // Step 2: Dashboard
    expect(screen.getByText("Dashboard")).toBeDefined();
  });

  it("goes back to the previous step when Back is clicked", async () => {
    await renderTour();

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    // Advance to step 2
    const nextBtn = screen.getByRole("button", { name: /next/i });
    await act(async () => {
      fireEvent.click(nextBtn);
    });
    expect(screen.getByText("Dashboard")).toBeDefined();

    // Go back to step 1
    const backBtn = screen.getByRole("button", { name: /back/i });
    await act(async () => {
      fireEvent.click(backBtn);
    });
    expect(screen.getByText("Welcome to AgentsKit OS")).toBeDefined();
  });

  it("pressing ArrowRight key advances the step", async () => {
    await renderTour();

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    await act(async () => {
      fireEvent.keyDown(window, { key: "ArrowRight" });
    });

    expect(screen.getByText("Dashboard")).toBeDefined();
  });

  it("pressing ArrowLeft key goes back", async () => {
    await renderTour();

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    // Move to step 2 first
    await act(async () => {
      fireEvent.keyDown(window, { key: "ArrowRight" });
    });
    expect(screen.getByText("Dashboard")).toBeDefined();

    await act(async () => {
      fireEvent.keyDown(window, { key: "ArrowLeft" });
    });
    expect(screen.getByText("Welcome to AgentsKit OS")).toBeDefined();
  });
});

describe("skip: persists completed state", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it("hides the tour when Esc is pressed and marks completed in localStorage", async () => {
    const { readOnboardingStore } = await import("../use-onboarding-store");

    await renderTour();

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(screen.getByRole("dialog")).toBeDefined();

    await act(async () => {
      fireEvent.keyDown(window, { key: "Escape" });
    });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(readOnboardingStore().completed).toBe(true);
  });

  it("hides the tour when Skip tour link is clicked", async () => {
    const { readOnboardingStore } = await import("../use-onboarding-store");

    await renderTour();

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    const skipLink = screen.getByRole("button", { name: /skip tour/i });
    await act(async () => {
      fireEvent.click(skipLink);
    });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(readOnboardingStore().completed).toBe(true);
  });
});

describe("restart: re-arms the tour", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it("shows the tour again after restart() is called", async () => {
    const { OnboardingProvider, useOnboarding } = await import("../onboarding-provider");
    const { OnboardingTour } = await import("../index");
    const { markOnboardingComplete } = await import("../use-onboarding-store");

    // Pre-complete the tour
    markOnboardingComplete();

    // A small trigger component that calls restart on mount
    function RestartTrigger() {
      const { restart } = useOnboarding();
      React.useEffect(() => {
        restart();
      }, [restart]);
      return null;
    }

    render(
      <OnboardingProvider>
        <RestartTrigger />
        <OnboardingTour />
      </OnboardingProvider>
    );

    // restart() sets active immediately — no timer needed
    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("Welcome to AgentsKit OS")).toBeDefined();
  });
});

describe("finish: completes the tour via Finish button", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it("marks completed and hides tour when Finish is clicked on the last step", async () => {
    const { readOnboardingStore } = await import("../use-onboarding-store");
    const { ONBOARDING_STEPS } = await import("../steps");

    await renderTour();

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    // Navigate to the last step
    for (let i = 0; i < ONBOARDING_STEPS.length - 1; i++) {
      const nextBtn = screen.getByRole("button", { name: /next/i });
      await act(async () => {
        fireEvent.click(nextBtn);
      });
    }

    // Should now show Finish button
    const finishBtn = screen.getByRole("button", { name: /finish/i });
    await act(async () => {
      fireEvent.click(finishBtn);
    });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(readOnboardingStore().completed).toBe(true);
  });
});
