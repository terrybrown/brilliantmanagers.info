import '@testing-library/jest-dom'
import { vi } from 'vitest'

// jsdom does not implement IntersectionObserver — provide a no-op constructor stub
if (typeof IntersectionObserver === 'undefined') {
  class MockIntersectionObserver {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
    constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
  }
  global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver
}

// Node.js 25+ provides a native localStorage via --localstorage-file but the
// implementation omits the standard clear() / key() methods. Replace the global
// with a spec-compliant in-memory implementation so tests can call
// localStorage.clear() and friends as expected.
if (typeof localStorage === 'undefined' || typeof localStorage.clear !== 'function') {
  const store: Record<string, string> = {}
  const mockStorage: Storage = {
    get length() {
      return Object.keys(store).length
    },
    key(index: number) {
      return Object.keys(store)[index] ?? null
    },
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null
    },
    setItem(key: string, value: string) {
      store[key] = String(value)
    },
    removeItem(key: string) {
      delete store[key]
    },
    clear() {
      Object.keys(store).forEach((k) => delete store[k])
    },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockStorage,
    writable: true,
  })
}
