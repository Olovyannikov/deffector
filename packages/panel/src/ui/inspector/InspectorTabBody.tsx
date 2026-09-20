import type { Tx } from '@deffector/protocol';
import { SequenceView } from '../sequence';
import { useStore, ValueTree } from '../common';
import { DiffTab } from './DiffTab';
import { StateTab } from './StateTab';
import { WhyTab } from './WhyTab';

export function InspectorTabBody({ transaction }: { transaction: Tx }) {
  const { inspectorTab } = useStore().ui;
  switch (inspectorTab) {
    case 'sequence':
      return <SequenceView transaction={transaction} />;
    case 'diff':
      return <DiffTab transaction={transaction} />;
    case 'state':
      return <StateTab transaction={transaction} />;
    case 'payload':
      return (
        <div className="vt">
          {transaction.payload !== undefined ? <ValueTree value={transaction.payload} /> : '—'}
        </div>
      );
    default:
      return <WhyTab transaction={transaction} />;
  }
}
