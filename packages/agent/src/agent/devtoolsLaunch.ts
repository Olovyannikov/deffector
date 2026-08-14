import type { TxCause, TxFlags } from '@deffector/protocol';
import type { Collector } from '../collector';
import { launch, type Node, type Scope } from '../effector';

export interface DevtoolsLaunch {
  cause: TxCause;
  targets: Node[];
  params: unknown[];
  scope: Scope | null;
  note?: string;
  flags?: Partial<TxFlags>;
  replayOf?: number;
}

/** Launch units from the panel. One launch = one transaction marked with its cause. */
export function launchFromDevtools(collector: Collector, devtoolsLaunch: DevtoolsLaunch) {
  const { cause, targets, params, scope, note, flags, replayOf } = devtoolsLaunch;
  if (!targets.length) return;
  const label = { cause, note, flags, isGroup: targets.length > 1, replayOf };
  collector.runLabeled(label, () => {
    if (targets.length === 1) launch({ target: targets[0], params: params[0], scope });
    else launch({ target: targets, params, scope });
  });
}
