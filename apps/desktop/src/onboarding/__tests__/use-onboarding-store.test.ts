/**
 * Unit tests for use-onboarding-store.ts
 * Verifies localStorage persistence round-trips.
 *
 * localStorage is reset before each test by the shared setup file.
 */

import { describe, it, expect } from "vitest";
import {
  readOnboardingStore,
  writeOnboardingStore,
  markOnboardingComplete,
  resetOnboardingStore,
} from "../use-onboarding-store";

const STORAGE_KEY = "agentskitos.onboarding";

describe("readOnboardingStore", () => {
  it("returns completed: false when nothing is stored", () => {
    const store = readOnboardingStore();
    expect(store.completed).toBe(false);
  });

  it("returns stored data after a write", () => {
    writeOnboardingStore({ completed: true, completedAt: "2026-01-01T00:00:00.000Z" });
    const store = readOnboardingStore();
    expect(store.completed).toBe(true);
    expect(store.completedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("returns default when localStorage contains invalid JSON", () => {
    localStorage.setItem(STORAGE_KEY, "not-json{{");
    const store = readOnboardingStore();
    expect(store.completed).toBe(false);
  });
});

describe("markOnboardingComplete", () => {
  it("writes completed: true with a completedAt timestamp", () => {
    markOnboardingComplete();
    const store = readOnboardingStore();
    expect(store.completed).toBe(true);
    expect(typeof store.completedAt).toBe("string");
  });
});

describe("resetOnboardingStore", () => {
  it("resets completed back to false", () => {
    markOnboardingComplete();
    expect(readOnboardingStore().completed).toBe(true);

    resetOnboardingStore();
    expect(readOnboardingStore().completed).toBe(false);
  });
});

describe("localStorage persistence round-trip", () => {
  it("round-trips arbitrary data", () => {
    const payload = { completed: true, completedAt: "2026-05-02T12:00:00.000Z" };
    writeOnboardingStore(payload);
    expect(readOnboardingStore()).toEqual(payload);
  });
});
