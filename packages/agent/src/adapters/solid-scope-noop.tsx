import { Provider } from 'effector-solid/scope';
import { createNoopProvider } from './solidNoopProvider';

export type { DeffectorProviderProps } from './solidTypes';

/** Production build: plain `effector-solid/scope` Provider. */
export const DeffectorProvider = createNoopProvider(Provider);

export default DeffectorProvider;
