import { createContext } from 'react';
import type { PanelStore } from '../../store';

/** Provided by `mountPanel`: every panel component reads the one store through `useStore`. */
export const StoreContext = createContext<PanelStore | null>(null);
