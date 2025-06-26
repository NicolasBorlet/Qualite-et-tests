/**
 * Vitest setup file for Vue frontend tests
 * Configures global utilities and mocks
 */

import { vi } from 'vitest';
import { config } from '@vue/test-utils';

// Mock localStorage for tests
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

// Add Vue globals to the global scope
const { ref, reactive, computed, readonly } = await import('vue');

globalThis.ref = ref;
globalThis.reactive = reactive;
globalThis.computed = computed;
globalThis.readonly = readonly;

// Configure Vue Test Utils
config.global.plugins = [];