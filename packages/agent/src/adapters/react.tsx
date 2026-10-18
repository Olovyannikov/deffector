import { Provider } from 'effector-react';
import { createDeffectorProvider } from './reactProvider';

export type { DeffectorProviderProps } from './reactTypes';

/** Drop-in replacement for effector-react's Provider (see reactProvider.ts). */
export const DeffectorProvider = createDeffectorProvider(Provider);

export default DeffectorProvider;
