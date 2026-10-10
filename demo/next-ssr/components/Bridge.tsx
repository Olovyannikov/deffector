'use client';

import type { ReactNode } from 'react';
import { useProvidedScope } from 'effector-react';
import { DeffectorProvider } from '@deffector/agent/react';

/**
 * @effector/next keeps one client scope and provides it with effector-react's Provider.
 * DeffectorProvider re-provides it, so deffector can render a forked past for time travel.
 */
export function Bridge({ children }: { children: ReactNode }) {
  const scope = useProvidedScope();
  if (!scope) return <>{children}</>;
  return (
    <DeffectorProvider value={scope} name="client">
      {children}
    </DeffectorProvider>
  );
}
