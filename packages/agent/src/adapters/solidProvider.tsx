/** @jsxImportSource solid-js */
import { createSignal, onCleanup, Show } from 'solid-js';
import type { Scope } from 'effector';
// the package's own entry: the same agent instance the app imported
import { registerScope } from '@deffector/agent';
import type { DeffectorProviderProps, EffectorSolidProvider } from './solidTypes';

/**
 * A drop-in replacement for the given effector-solid Provider. deffector swaps the scope for time
 * travel and replay; the subtree is re-created because effector-solid primitives read the scope
 * once, when a component is created.
 */
export function createDeffectorProvider(Provider: EffectorSolidProvider) {
  return function DeffectorProvider(props: DeffectorProviderProps) {
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
  };
}
