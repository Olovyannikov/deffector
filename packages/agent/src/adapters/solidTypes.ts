import type { JSX } from 'solid-js';
import type { Scope } from 'effector';

export interface DeffectorProviderProps {
  value: Scope;
  /** shown in the panel's scope selector */
  name?: string;
  children?: JSX.Element;
}

/** effector-solid's Provider: from `effector-solid` or from the legacy `effector-solid/scope` */
export type EffectorSolidProvider = (props: { value: Scope; children: JSX.Element }) => JSX.Element;
