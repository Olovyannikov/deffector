import { Provider } from 'effector-solid';
import { createDeffectorProvider } from './solidProvider';

export type { DeffectorProviderProps } from './solidTypes';

/** Drop-in replacement for effector-solid's Provider (see solidProvider.tsx). */
export const DeffectorProvider = createDeffectorProvider(Provider);

export default DeffectorProvider;
