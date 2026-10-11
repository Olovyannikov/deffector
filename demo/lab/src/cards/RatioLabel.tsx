import { useUnit } from 'effector-react';
import { $ratioLabel } from '../lab';

/**
 * Reading $ratioLabel throws when its .map throws while being computed for a
 * scope (for example, a forked past where the divisor is 0): render it inside
 * an ErrorBoundary.
 */
export function RatioLabel() {
  return <b data-testid="ratio">{useUnit($ratioLabel)}</b>;
}
