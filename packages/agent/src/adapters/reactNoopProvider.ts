// Kept apart from reactProvider.ts: production builds must not import the agent.
import { createElement } from 'react';
import type { DeffectorProviderProps, EffectorProvider } from './reactTypes';

/** Production build: the Provider itself, `name` is accepted and ignored. */
export function createNoopProvider(Provider: EffectorProvider) {
  function DeffectorProvider({ value, children = null }: DeffectorProviderProps) {
    return createElement(Provider, { value }, children);
  }
  return DeffectorProvider;
}
