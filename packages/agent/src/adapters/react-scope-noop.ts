import { Provider } from 'effector-react/scope';
import { createNoopProvider } from './reactNoopProvider';

export type { DeffectorProviderProps } from './reactTypes';

/** Production build: plain `effector-react/scope` Provider. */
export const DeffectorProvider = createNoopProvider(Provider);

export default DeffectorProvider;
