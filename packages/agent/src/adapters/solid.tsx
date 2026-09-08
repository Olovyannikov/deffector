/** @jsxImportSource solid-js */
import { createSignal, onCleanup, Show, type JSX } from 'solid-js';
import { Provider } from 'effector-solid';
import type { Scope } from 'effector';
import { registerScope } from '..';

interface DeffectorProviderProps {
  value: Scope;
  name?: string;
  children?: JSX.Element;
}

/**
 * Drop-in replacement for effector-solid's Provider. deffector swaps the scope
 * for time travel and replay; the subtree is re-created because effector-solid
 * primitives read the scope once, when a component is created.
 */
export function DeffectorProvider(props: DeffectorProviderProps) {
  // read once, like effector-solid's Provider does
  const { value, name } = props;
  const [scope, setScope] = createSignal<Scope>(value);
  const unregister = registerScope(value, {
    name,
    switcher: (switched) => setScope(() => switched),
  });
  onCleanup(unregister);
  return (
    <Show when={scope()} keyed>
      {(shown) => (
        // Solid props are getters: reading children here re-creates the subtree for every shown scope
        <Provider value={shown}>{props.children}</Provider>
      )}
    </Show>
  );
}

export default DeffectorProvider;
