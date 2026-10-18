import { Provider } from 'effector-react';
import { createNoopProvider } from './reactNoopProvider';

export type { DeffectorProviderProps } from './reactTypes';

/** Production build: plain effector-react Provider. */
export const DeffectorProvider = createNoopProvider(Provider);

export default DeffectorProvider;
