import type { Tx } from '@deffector/protocol';
import type { PanelStore } from '../../store';

/**
 * Colour of the stripe at the start of a log row: the global graph while the app uses scopes (a
 * likely bug), a time-travel branch, a deffector edit, or an ordinary client transaction.
 */
export function scopeStripeColor(store: PanelStore, transaction: Tx): string {
  const appUsesScopes = store.scopes.some((scope) => scope.kind === 'scope');
  if (transaction.flags.outOfScope || (transaction.scopeId === 'global' && appUsesScopes))
    return 'var(--sc-global)';
  if (transaction.flags.branch) return 'var(--sc-branch)';
  if (transaction.cause?.kind === 'devtools') return 'var(--sc-dev)';
  return 'var(--sc-client)';
}
