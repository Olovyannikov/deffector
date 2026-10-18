/** @jsxImportSource solid-js */
// Kept apart from solidProvider.tsx: production builds must not import the agent.
import type { DeffectorProviderProps, EffectorSolidProvider } from './solidTypes';

/** Production build: the Provider itself, `name` is accepted and ignored. */
export function createNoopProvider(Provider: EffectorSolidProvider) {
  return function DeffectorProvider(props: DeffectorProviderProps) {
    // Solid props are getters: pass them through without reading them early
    return <Provider value={props.value}>{props.children}</Provider>;
  };
}
