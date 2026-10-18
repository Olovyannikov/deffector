// For apps whose hooks come from `effector-react/scope` (effector-react 22 and older code): that
// entry has its own context, so the Provider has to come from there too.
import { Provider } from 'effector-react/scope';
import { createDeffectorProvider } from './reactProvider';

export type { DeffectorProviderProps } from './reactTypes';

export const DeffectorProvider = createDeffectorProvider(Provider);

export default DeffectorProvider;
