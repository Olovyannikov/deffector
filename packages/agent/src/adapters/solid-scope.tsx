// For apps whose primitives come from `effector-solid/scope`: that entry has its own context, so
// the Provider has to come from there too.
import { Provider } from 'effector-solid/scope';
import { createDeffectorProvider } from './solidProvider';

export type { DeffectorProviderProps } from './solidTypes';

export const DeffectorProvider = createDeffectorProvider(Provider);

export default DeffectorProvider;
