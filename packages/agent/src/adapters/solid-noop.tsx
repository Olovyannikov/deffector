/** @jsxImportSource solid-js */
import type { JSX } from 'solid-js';
import { Provider } from 'effector-solid';
import type { Scope } from 'effector';

interface DeffectorProviderProps {
  value: Scope;
  /** accepted for the same API as the development build */
  // eslint-disable-next-line react/no-unused-prop-types -- only the development build names the scope
  name?: string;
  children?: JSX.Element;
}

export function DeffectorProvider(props: DeffectorProviderProps) {
  // Solid props are getters: pass them through without reading them early
  return <Provider value={props.value}>{props.children}</Provider>;
}

export default DeffectorProvider;
