import type { ReactNode } from 'react';
import { Provider } from 'effector-react';
import type { Scope } from 'effector';

interface DeffectorProviderProps {
  value: Scope;
  /** accepted for the same API as the development build */
  // eslint-disable-next-line react/no-unused-prop-types -- only the development build names the scope
  name?: string;
  children?: ReactNode;
}

/** Production build: plain effector-react Provider. */
export function DeffectorProvider({ value, children = null }: DeffectorProviderProps) {
  return <Provider value={value}>{children}</Provider>;
}

export default DeffectorProvider;
