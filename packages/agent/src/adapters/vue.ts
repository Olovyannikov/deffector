import {
  defineComponent,
  h,
  provide,
  shallowRef,
  onUnmounted,
  getCurrentInstance,
  type Component,
  type PropType,
} from 'vue';
import type { Scope } from 'effector';
import { registerScope } from '..';

/** effector-vue reads the scope with inject(app.config.globalProperties.scopeName) once per component */
const ScopeHost = defineComponent({
  name: 'DeffectorScopeHost',
  props: {
    scope: { type: Object as PropType<Scope>, required: true },
    injectKey: { type: String, required: true },
  },
  setup(props, { slots }) {
    provide(props.injectKey, props.scope);
    return () => slots.default?.();
  },
});

/**
 * Renders its slot with the given scope, like EffectorScopePlugin, and lets
 * deffector swap the scope for time travel and replay. On a swap the subtree is
 * re-mounted, because effector-vue composables read the scope only in setup.
 *
 *   <DeffectorScope :scope="scope" name="client"><App /></DeffectorScope>
 */
export const DeffectorScope = defineComponent({
  name: 'DeffectorScope',
  props: { scope: { type: Object as PropType<Scope>, required: true }, name: String },
  setup(props, { slots }) {
    const globals = getCurrentInstance()!.appContext.config.globalProperties as Record<
      string,
      unknown
    >;
    if (typeof globals.scopeName !== 'string') globals.scopeName = 'root';
    const injectKey = globals.scopeName as string;
    const shownScope = shallowRef<Scope>(props.scope);
    // a new key re-mounts the subtree with the switched scope
    const generation = shallowRef(0);
    const unregister = registerScope(props.scope, {
      name: props.name,
      switcher: (switched) => {
        shownScope.value = switched;
        generation.value += 1;
      },
    });
    onUnmounted(unregister);
    return () => h(ScopeHost, { key: generation.value, scope: shownScope.value, injectKey }, slots);
  },
});

/** createApp(withDeffector(App, { scope })) — wraps the root component with DeffectorScope. */
export function withDeffector(
  root: Component,
  options: { scope: Scope; name?: string },
): Component {
  return defineComponent({
    name: 'DeffectorRoot',
    setup(_, { attrs }) {
      return () =>
        h(
          DeffectorScope,
          { scope: options.scope, name: options.name },
          { default: () => h(root, attrs) },
        );
    },
  });
}

export default DeffectorScope;
