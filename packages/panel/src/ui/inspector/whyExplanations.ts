import type { Tx } from '@deffector/protocol';
import type { PanelStore } from '../../store';

export interface WhyExplanation {
  text: string;
  /** CSS modifier: '' for a plain note, err, info */
  tone: string;
}

/** Plain-language reasons for what happened in a transaction, problems first. */
export function whyExplanations(store: PanelStore, transaction: Tx): WhyExplanation[] {
  const { texts } = store;
  const name = (id: string) => store.unitName(id);
  const { cause, flags } = transaction;
  const explanations: WhyExplanation[] = [];
  if (flags.outOfScope)
    explanations.push({ text: texts.whyOutOfScope(name(transaction.root)), tone: 'err' });
  if (flags.blocked?.length)
    explanations.push({ text: texts.whyBlocked(name(flags.blocked[0].node)), tone: '' });
  for (const id of flags.double || [])
    explanations.push({ text: texts.whyDouble(name(id)), tone: '' });
  if (flags.error) explanations.push({ text: texts.whyError, tone: 'err' });
  if (flags.skippedChildren?.length)
    explanations.push({
      text: texts.whySkipped(flags.skippedChildren.map(name).join(', ')),
      tone: 'err',
    });
  for (const staleRead of flags.staleReads || [])
    explanations.push({
      text: texts.whyStale(name(staleRead.reader), name(staleRead.store)),
      tone: '',
    });
  for (const id of flags.derivedWrite || [])
    explanations.push({ text: texts.whyDerivedWrite(name(id)), tone: '' });
  if (flags.stopped) explanations.push({ text: texts.whyStopped, tone: 'err' });
  if (cause?.kind === 'nested')
    explanations.push({ text: texts.whyNested(cause.txId), tone: 'info' });
  if (cause?.kind === 'effect')
    explanations.push({ text: texts.whyEffect(cause.txId), tone: 'info' });
  if (cause?.kind === 'devtools')
    explanations.push({ text: texts.whyDevtools(cause.label || cause.action), tone: 'info' });
  if (transaction.note) explanations.push({ text: texts.whyNote(transaction.note), tone: 'info' });
  return explanations;
}
