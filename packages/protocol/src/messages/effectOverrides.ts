import type { Encoded } from '../encoding';

export type FxOverrideMode = 'pending' | 'done' | 'fail' | 'delay' | 'handler';

/** Replaces an effect's handler from the panel: to reproduce loading, errors, slow responses. */
export interface FxOverride {
  node: string;
  mode: FxOverrideMode;
  /** result for done, error for fail */
  value?: Encoded;
  /** ms, for delay */
  delay?: number;
  /** JS function source for handler: `async (params) => …` */
  code?: string;
}
