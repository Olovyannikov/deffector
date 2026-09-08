import { useEffect, useState, type ReactNode } from 'react';
import { Provider } from 'effector-react';
import type { Scope } from 'effector';
import { registerScope } from '..';

interface DeffectorProviderProps {
  value: Scope;
  name?: string;
  children?: ReactNode;
}

/**
 * Drop-in replacement for effector-react's Provider.
 * deffector can render the app with another scope through it: a forked copy
 * of the past for time travel, or a fresh scope for replaying a trace.
 */
export function DeffectorProvider({
  value,
  name = undefined,
  children = null,
}: DeffectorProviderProps) {
  const [scope, setScope] = useState<Scope>(value);
  // a new scope from the app replaces whatever deffector rendered
  const [appScope, setAppScope] = useState<Scope>(value);
  if (appScope !== value) {
    setAppScope(value);
    setScope(value);
  }
  useEffect(() => registerScope(value, { name, switcher: setScope }), [value, name]);
  return <Provider value={scope}>{children}</Provider>;
}

export default DeffectorProvider;
