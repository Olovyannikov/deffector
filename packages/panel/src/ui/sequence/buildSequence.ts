import { preview, type Step, type Tx, type UnitInfo } from '@deffector/protocol';
import type { PanelStore } from '../../store';

/** Lifelines beyond this many are left out (the diagram says how many). */
const MAX_ACTORS = 10;

export interface SequenceMessage {
  /** index of the step that sent the message: one message per step at most */
  stepIndex: number;
  /** null: the call that started the transaction, from outside */
  from: string | null;
  to: string;
  label: string;
  value: string;
  status: Step['status'];
  isDashed: boolean;
}

export interface Sequence {
  /** unit ids of the lifelines, left to right in order of appearance */
  actors: string[];
  hiddenActorCount: number;
  messages: SequenceMessage[];
}

function messageValue(step: Step): string {
  if (step.status === 'error') return `✕ ${preview(step.error!, 30)}`;
  if (step.prev !== undefined && step.status === 'changed')
    return `${preview(step.prev, 14)} → ${preview(step.value!, 18)}`;
  return step.value !== undefined ? preview(step.value, 30) : '';
}

function collectMessages(store: PanelStore, transaction: Tx): SequenceMessage[] {
  const { showInternal } = store.ui;
  const { steps } = transaction;
  const isActor = (unit: UnitInfo | undefined) =>
    !!unit && unit.isUnit && (showInternal || !unit.internal);
  // a hidden helper unit (`.updates`, `finally`) speaks for the unit that owns it
  const actorOf = (unit: UnitInfo | undefined): string | null => {
    if (!unit?.isUnit) return null;
    if (unit.internal && !showInternal) return unit.ownerId ?? null;
    return unit.id;
  };
  const messages: SequenceMessage[] = [];
  /** the actor each step belongs to: operators belong to the actor that pushed them */
  const actorAtStep = new Map<number, string | null>();
  for (const step of steps) {
    const unit = store.units.get(step.node);
    const actor = actorOf(unit);
    const parentActor = step.parent === null ? null : (actorAtStep.get(step.parent) ?? null);
    // operators on the way from the parent actor: their names label the arrow
    const operators: string[] = [];
    let ancestor = step.parent;
    while (ancestor !== null) {
      const ancestorStep = steps[ancestor];
      if (actorOf(store.units.get(ancestorStep.node))) break;
      operators.unshift(ancestorStep.op);
      ancestor = ancestorStep.parent;
    }
    actorAtStep.set(step.i, actor ?? parentActor);
    const isRoot = step.parent === null;
    if (actor && isActor(store.units.get(actor)) && (actor !== parentActor || isRoot)) {
      messages.push({
        stepIndex: step.i,
        from: isRoot ? null : parentActor,
        to: actor,
        label: isRoot ? store.texts.sequence.start : operators.join(' · ') || step.op,
        value: messageValue(step),
        status: step.status,
        isDashed: step.status === 'same',
      });
    } else if (!actor && step.status === 'filtered' && parentActor) {
      // a filter that returned false: a dashed arrow to the unit it would have reached
      messages.push({
        stepIndex: step.i,
        from: parentActor,
        to: unit?.targets?.[0] ?? parentActor,
        label: `${step.op} ✕`,
        value: 'filter = false',
        status: 'filtered',
        isDashed: true,
      });
    }
  }
  return messages;
}

/**
 * One transaction as a sequence diagram: units are lifelines, operators are the messages between
 * them, in kernel order.
 */
export function buildSequence(store: PanelStore, transaction: Tx): Sequence {
  const messages = collectMessages(store, transaction);
  const appearance: string[] = [];
  for (const message of messages)
    for (const actor of [message.from, message.to])
      if (actor && !appearance.includes(actor)) appearance.push(actor);
  const actors = appearance.slice(0, MAX_ACTORS);
  const shown = new Set(actors);
  return {
    actors,
    hiddenActorCount: appearance.length - actors.length,
    messages: messages.filter(
      (message) => shown.has(message.to) && (message.from === null || shown.has(message.from)),
    ),
  };
}
