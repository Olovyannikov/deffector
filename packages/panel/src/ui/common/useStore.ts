import { useContext, useSyncExternalStore } from 'react';
import type { PanelStore } from '../../store';
import { StoreContext } from './StoreContext';

/** The panel store; the component re-renders on every store change. */
export function useStore(): PanelStore {
  const store = useContext(StoreContext)!;
  useSyncExternalStore(store.subscribe, store.getVersion);
  return store;
}
