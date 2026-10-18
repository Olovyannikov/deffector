import { Provider } from 'effector-solid';
import { createNoopProvider } from './solidNoopProvider';

export type { DeffectorProviderProps } from './solidTypes';

/** Production build: plain effector-solid Provider. */
export const DeffectorProvider = createNoopProvider(Provider);

export default DeffectorProvider;
