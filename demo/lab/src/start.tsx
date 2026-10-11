import type { ComponentType, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { fork, type Scope } from 'effector';
import { Provider } from 'effector-react';
import { serverValues } from './lab';
import { LabPage } from './LabPage';
import './lab.css';

interface ScopeProviderProps {
  value: Scope;
  children: ReactNode;
}

declare global {
  interface Window {
    /** the app's scope, for the console */
    __labScope: Scope;
  }
}

/** With the agent, DeffectorProvider (time travel); without it, effector-react's Provider. */
async function loadScopeProvider(withAgent: boolean): Promise<ComponentType<ScopeProviderProps>> {
  if (!withAgent) return Provider;
  const { DeffectorProvider } = await import('@deffector/agent/react');
  return function LabScopeProvider({ value, children }: ScopeProviderProps) {
    return (
      <DeffectorProvider value={value} name="lab">
        {children}
      </DeffectorProvider>
    );
  };
}

export async function start(withAgent: boolean) {
  // ?hydrate — start from values "from the server", some of them for sids the client lacks
  const shouldHydrate = new URLSearchParams(window.location.search).has('hydrate');
  const scope = fork(shouldHydrate ? { values: serverValues } : undefined);
  window.__labScope = scope;
  const ScopeProvider = await loadScopeProvider(withAgent);
  createRoot(document.getElementById('root')!).render(
    <ScopeProvider value={scope}>
      <LabPage scope={scope} withAgent={withAgent} />
    </ScopeProvider>,
  );
}
