import type { AgentMessage, CompatReport, TraceFile } from '@deffector/protocol';
import type { PanelStore } from './PanelStore';

/** A pasted link to a step: "…json#step=142" or just "#step=142". */
const STEP_LINK = /#step=(\d+)\s*$/;

/** How long a replay waits for the transaction of the focus step to arrive: 20 × 50 ms. */
const FOCUS_POLL_ATTEMPTS = 20;
const FOCUS_POLL_INTERVAL_MS = 50;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Calls `probe` until it returns a value, sleeping after every miss. */
async function pollFor<Value>(
  probe: () => Value | undefined,
  attempts: number,
): Promise<Value | undefined> {
  const value = probe();
  if (value !== undefined) return value;
  await delay(FOCUS_POLL_INTERVAL_MS);
  return attempts > 1 ? pollFor(probe, attempts - 1) : undefined;
}

function invalidJsonReport(title: string, error: unknown): CompatReport {
  return {
    ok: false,
    title,
    rows: [{ level: 'error', text: error instanceof Error ? error.message : String(error) }],
    mapping: {},
    skippedSteps: [],
    canReplay: false,
  };
}

/** The Traces tab's import: pasted or opened text, its compatibility report, and the replay. */
export class TraceImport {
  text = '';

  /** the agent's verdict on the trace, or the JSON error */
  compatibility: CompatReport | null = null;

  /** the checked trace, when the current build can replay it */
  trace: TraceFile | null = null;

  /** step to open after a replay: from `#step=N` typed by the user or the trace's own focus */
  focusStep: number | null = null;

  constructor(private readonly store: PanelStore) {}

  setText(text: string) {
    this.text = text;
    this.compatibility = null;
    this.trace = null;
    const stepLink = STEP_LINK.exec(text.trim());
    if (stepLink) this.focusStep = Number(stepLink[1]);
    this.store.emit();
  }

  async check() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(this.text.trim().replace(STEP_LINK, ''));
    } catch (error) {
      this.compatibility = invalidJsonReport(this.store.texts.invalidJson, error);
      this.store.emit();
      return;
    }
    const reply = await this.store.request<Extract<AgentMessage, { type: 'compat' }>>(
      (requestId) => ({ type: 'check-import', requestId, trace: parsed }),
    );
    this.compatibility = reply.report;
    this.trace = reply.report.canReplay ? (parsed as TraceFile) : null;
    this.store.emit();
  }

  /** Takes the first number in the text: "#step=142", "142" and "step 142" all work. */
  setFocusStep(text: string) {
    const digits = /(\d+)/.exec(text);
    this.focusStep = digits ? Number(digits[1]) : null;
    this.store.emit();
  }

  /** After a check: a trace that carries its own focus step opens there. */
  adoptTraceFocus() {
    const focus = this.trace?.meta.focus;
    if (focus) this.setFocusStep(String(focus));
  }

  async replay(mode: 'animated' | 'instant') {
    const { store, trace } = this;
    if (!trace) return;
    store.setUIWithoutRefresh({ tab: 'log', selectedTransactionId: null });
    await store.request((requestId) => ({ type: 'replay', requestId, trace, mode }));
    const step = this.focusStep;
    if (step === null) return;
    // the replayed transaction that corresponds to the step: wait for it to arrive
    const replayed = await pollFor(
      () => store.txs.findLast((transaction) => transaction.replayOf === step),
      FOCUS_POLL_ATTEMPTS,
    );
    if (!replayed) {
      store.showToast(store.texts.traces.noFocus(step));
      return;
    }
    store.jump(replayed.id);
    store.setUI({ selectedTransactionId: replayed.id });
  }
}
