/**
 * Unit tests for apps/desktop/src/lib/sidecar.ts
 *
 * The Tauri `invoke` API is mocked so tests can run in Node / jsdom without a
 * running Tauri runtime.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// Mock @tauri-apps/api/core before importing the module under test
// ─────────────────────────────────────────────────────────────────────────────

const mockInvoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mockInvoke,
}));

// Import after mocking
const { sidecarRequest, pauseRuns, resumeRuns, disposeSidecar } = await import(
  "../src/lib/sidecar"
);

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("sidecarRequest", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it("invokes the sidecar_request Tauri command with method and params", async () => {
    mockInvoke.mockResolvedValueOnce({ ok: true });

    const result = await sidecarRequest("test.ping", { foo: "bar" });

    expect(mockInvoke).toHaveBeenCalledOnce();
    expect(mockInvoke).toHaveBeenCalledWith("sidecar_request", {
      method: "test.ping",
      params: { foo: "bar" },
    });
    expect(result).toEqual({ ok: true });
  });

  it("defaults params to empty object when not provided", async () => {
    mockInvoke.mockResolvedValueOnce(null);

    await sidecarRequest("test.noop");

    expect(mockInvoke).toHaveBeenCalledWith("sidecar_request", {
      method: "test.noop",
      params: {},
    });
  });
});

describe("pauseRuns", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it("sends runner.pause to the sidecar", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);

    await pauseRuns();

    expect(mockInvoke).toHaveBeenCalledWith("sidecar_request", {
      method: "runner.pause",
      params: {},
    });
  });
});

describe("resumeRuns", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it("sends runner.resume to the sidecar", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);

    await resumeRuns();

    expect(mockInvoke).toHaveBeenCalledWith("sidecar_request", {
      method: "runner.resume",
      params: {},
    });
  });
});

describe("disposeSidecar", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it("sends lifecycle.dispose to the sidecar", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);

    await disposeSidecar();

    expect(mockInvoke).toHaveBeenCalledWith("sidecar_request", {
      method: "lifecycle.dispose",
      params: {},
    });
  });
});
