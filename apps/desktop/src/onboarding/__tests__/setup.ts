import "@testing-library/jest-dom";

// Simulate a Tauri runtime so sidecar.ts hasTauri() check passes in tests.
// The actual Tauri APIs are individually mocked per test file.
if (typeof (window as Record<string, unknown>)["__TAURI_INTERNALS__"] === "undefined") {
  Object.defineProperty(window, "__TAURI_INTERNALS__", {
    value: {},
    writable: true,
    configurable: true,
  });
}

// Provide a full localStorage shim when the jsdom environment
// doesn't expose the Storage API (e.g. when --localstorage-file is unset).
function makeLocalStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    get length() {
      return Object.keys(store).length;
    },
    key(index: number) {
      return Object.keys(store)[index] ?? null;
    },
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key]! : null;
    },
    setItem(key: string, value: string) {
      store[key] = String(value);
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      store = {};
    },
  };
}

if (typeof localStorage === "undefined" || typeof localStorage.clear !== "function") {
  Object.defineProperty(globalThis, "localStorage", {
    value: makeLocalStorage(),
    writable: true,
    configurable: true,
  });
}

// Reset localStorage before each test automatically
beforeEach(() => {
  localStorage.clear();
});
