import { useStore } from '../common';
import { ConnectedPanel } from './ConnectedPanel';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { WaitingScreen } from './WaitingScreen';

export interface AppProps {
  theme: 'dark' | 'light';
  density: 'compact' | 'comfortable';
}

export function App({ theme, density }: AppProps) {
  const store = useStore();
  useKeyboardShortcuts(store);
  const { hello } = store;
  return (
    <div className="dfx" data-theme={theme} data-density={density} lang={store.locale}>
      {store.connection === 'connected' && hello ? (
        <ConnectedPanel hello={hello} rowHeight={density === 'comfortable' ? 24 : 20} />
      ) : (
        <WaitingScreen />
      )}
    </div>
  );
}
