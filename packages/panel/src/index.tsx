import { createRoot, type Root } from 'react-dom/client';
import type { PanelTransport } from '@deffector/protocol';
import { PanelStore } from './store';
import { StoreContext } from './ui/common';
import { App } from './ui/app';
import type { Locale } from './i18n';

export { PanelStore } from './store';
export type { Locale } from './i18n';

export interface MountOptions {
  transport: PanelTransport;
  theme?: 'dark' | 'light';
  locale?: Locale;
  density?: 'compact' | 'comfortable';
}

export interface MountedPanel {
  store: PanelStore;
  setTheme(theme: 'dark' | 'light'): void;
  unmount(): void;
}

/** Renders the deffector UI into `container`. Used by the extension panel, the standalone page and tests. */
export function mountPanel(container: HTMLElement, options: MountOptions): MountedPanel {
  const store = new PanelStore(options.transport, options.locale);
  const root: Root = createRoot(container);
  let theme =
    options.theme ?? (matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  const density = options.density ?? 'compact';
  const render = () =>
    root.render(
      <StoreContext.Provider value={store}>
        <App theme={theme} density={density} />
      </StoreContext.Provider>,
    );
  render();
  store.start();
  return {
    store,
    setTheme(next) {
      theme = next;
      render();
    },
    unmount() {
      store.send({ type: 'disconnect' });
      store.dispose();
      root.unmount();
    },
  };
}
