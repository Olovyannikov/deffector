import { preview } from '@deffector/protocol';
import { onActivationKey, useStore } from '../common';
import type { EffectCall } from './effectCalls';
import type { WaterfallBounds } from './waterfallBounds';

/** Share of the row width the waterfall bars may take. */
const WATERFALL_PERCENT = 96;

interface EffectCallRowProps {
  call: EffectCall;
  bounds: WaterfallBounds;
  isOverridden: boolean;
}

/** One call; opens the transaction where it settled (or was called, while pending). */
export function EffectCallRow({ call, bounds, isOverridden }: EffectCallRowProps) {
  const store = useStore();
  const { texts } = store;
  const end = call.endedAt ?? bounds.now;
  const outOfOrder = call.finishedOutOfOrder ? ` · ${texts.outOfOrder}` : '';
  const value = call.value !== undefined ? ` · ${preview(call.value, 120)}` : '';
  const openTransaction = () =>
    store.setUI({
      tab: 'log',
      selectedTransactionId: call.settleTransactionId ?? call.callTransactionId,
    });
  return (
    <div
      className={`fx-row${call.finishedOutOfOrder ? ' ooo' : ''}`}
      role="link"
      tabIndex={0}
      onClick={openTransaction}
      onKeyDown={onActivationKey(openTransaction)}
      title={`${texts.effectsTable.initiator} #${call.callTransactionId}${outOfOrder}${value}`}
    >
      <span>#{call.callId}</span>
      <span className="ell">
        {store.unitName(call.node)}
        {isOverridden && (
          <span className="bdg edit" style={{ marginLeft: 6 }}>
            {texts.effectOverrides.badge}
          </span>
        )}
      </span>
      <span className="ell">{preview(call.params, 60)}</span>
      <span className={`stc ${call.status}`}>{call.status}</span>
      <span>{Math.round(end - call.startedAt)} ms</span>
      <span className="wf">
        <i
          className={call.status}
          style={{
            left: `${((call.startedAt - bounds.start) / bounds.span) * WATERFALL_PERCENT}%`,
            width: `${Math.max(0.6, ((end - call.startedAt) / bounds.span) * WATERFALL_PERCENT)}%`,
          }}
        />
      </span>
    </div>
  );
}
