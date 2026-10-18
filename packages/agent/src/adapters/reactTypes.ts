import type { ComponentType, ReactNode } from 'react';
import type { Scope } from 'effector';

export interface DeffectorProviderProps {
  value: Scope;
  /** shown in the panel's scope selector */
  name?: string;
  children?: ReactNode;
}

/** effector-react's Provider: from `effector-react` or from the legacy `effector-react/scope` */
export type EffectorProvider = ComponentType<{ value: Scope; children?: ReactNode }>;
