import {
  defineComponent,
  h,
  provide,
  getCurrentInstance,
  type Component,
  type PropType,
} from 'vue';
import type { Scope } from 'effector';

/** Production build: provides the scope the same way, without deffector. */
export const DeffectorScope = defineComponent({
  name: 'DeffectorScope',
  props: { scope: { type: Object as PropType<Scope>, required: true }, name: String },
  setup(props, { slots }) {
    const globals = getCurrentInstance()!.appContext.config.globalProperties as Record<
      string,
      unknown
    >;
    if (typeof globals.scopeName !== 'string') globals.scopeName = 'root';
    provide(globals.scopeName as string, props.scope);
    return () => slots.default?.();
  },
});

export function withDeffector(
  root: Component,
  options: { scope: Scope; name?: string },
): Component {
  return defineComponent({
    setup:
      (_, { attrs }) =>
      () =>
        h(DeffectorScope, { scope: options.scope }, { default: () => h(root, attrs) }),
  });
}

export default DeffectorScope;
