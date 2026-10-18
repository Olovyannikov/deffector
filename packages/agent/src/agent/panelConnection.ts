import type {
  AgentMessage,
  AgentTransport,
  HelloInfo,
  PanelCommand,
  TimelineState,
  Tx,
  UnitInfo,
} from '@deffector/protocol';
import type { Diagnostics } from '../diagnostics';
import type { History, RawTransaction } from '../history';
import type { EffectOverrides } from '../overrides';
import type { Registry } from '../registry';
import type { Scopes } from '../scopes';
import { errorMessage } from '../utils';

/** one huge message can exceed the extension messaging limit: big lists go in chunks */
const UNITS_PER_MESSAGE = 2000;
const TRANSACTIONS_PER_MESSAGE = 200;
/**
 * …and by size: payloads can be large (forest passes element drafts), and the
 * standalone app refuses messages over 64 MB. JSON length is close to bytes.
 */
const TRANSACTION_CHARS_PER_MESSAGE = 4 * 1024 * 1024;

/** transactions waiting for the panel; older ones are dropped */
const MAX_UNSENT_TRANSACTIONS = 2000;

/** updates are batched: a burst of transactions goes as one message */
const FLUSH_DELAY_MS = 40;

export interface PanelConnectionParts {
  registry: Registry;
  scopes: Scopes;
  history: History;
  diagnostics: Diagnostics;
  overrides: EffectOverrides;
  encode(transaction: RawTransaction): Tx;
  helloInfo(): HelloInfo;
  timelineState(): TimelineState;
  /** static diagnostics are recomputed before the panel gets everything */
  refreshStaticDiagnostics(): void;
  onInternalError(error: unknown): void;
}

function requestIdOf(command: PanelCommand): string {
  return ('requestId' in command && command.requestId) || '';
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    result.push(items.slice(start, start + size));
  }
  return result;
}

/** Transactions split into messages, each within the count and size limits. */
export function transactionBatches(
  txs: Tx[],
  maxCount = TRANSACTIONS_PER_MESSAGE,
  maxChars = TRANSACTION_CHARS_PER_MESSAGE,
): Tx[][] {
  const batches: Tx[][] = [];
  let batch: Tx[] = [];
  let batchChars = 0;
  for (const tx of txs) {
    const chars = JSON.stringify(tx).length;
    if (batch.length && (batch.length >= maxCount || batchChars + chars > maxChars)) {
      batches.push(batch);
      batch = [];
      batchChars = 0;
    }
    batch.push(tx);
    batchChars += chars;
  }
  if (batch.length) batches.push(batch);
  return batches;
}

/**
 * The agent's side of the panel connection: transports, the `hello`
 * handshake, and updates (units, scopes, transactions, diagnostics) batched
 * into messages while a panel listens.
 */
export class PanelConnection {
  private readonly transports = new Set<AgentTransport>();

  /** a panel sent `connect` and listens to updates */
  isListening = false;

  private unsentTransactions: RawTransaction[] = [];

  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly parts: PanelConnectionParts) {}

  /** Start talking over a transport; commands that fail are answered with an error result. */
  attach(transport: AgentTransport, handle: (command: PanelCommand) => Promise<void>): () => void {
    this.transports.add(transport);
    const unsubscribe = transport.subscribe((command) => {
      handle(command).catch((error: unknown) =>
        this.send({
          type: 'result',
          requestId: requestIdOf(command),
          ok: false,
          message: errorMessage(error),
        }),
      );
    });
    this.sendHello();
    return () => {
      unsubscribe();
      this.transports.delete(transport);
    };
  }

  send(message: AgentMessage) {
    for (const transport of this.transports) {
      try {
        transport.send(message);
      } catch (error) {
        this.parts.onInternalError(error);
      }
    }
  }

  sendHello() {
    this.send({ type: 'hello', info: this.parts.helloInfo(), listening: this.isListening });
  }

  sendTimeline() {
    this.send({ type: 'timeline', state: this.parts.timelineState() });
  }

  sendOverrides() {
    this.send({ type: 'overrides', items: this.parts.overrides.list() });
  }

  queueTransaction(transaction: RawTransaction) {
    this.unsentTransactions.push(transaction);
    if (this.unsentTransactions.length > MAX_UNSENT_TRANSACTIONS) this.unsentTransactions.shift();
  }

  dropUnsentTransactions() {
    this.unsentTransactions = [];
  }

  scheduleFlush() {
    if (!this.isListening || this.flushTimer) return;
    this.flushTimer = setTimeout(this.flush, FLUSH_DELAY_MS);
  }

  private sendTransactions(transactions: RawTransaction[]) {
    const txs = transactions.map((transaction) => this.parts.encode(transaction));
    for (const batch of transactionBatches(txs)) this.send({ type: 'txs', txs: batch });
  }

  private sendUnits(units: UnitInfo[]) {
    for (const chunk of chunks(units, UNITS_PER_MESSAGE))
      this.send({ type: 'units', units: chunk });
  }

  private readonly flush = () => {
    this.flushTimer = null;
    if (!this.isListening) return;
    const { registry, scopes, diagnostics } = this.parts;
    const units = registry.takeUnsent();
    if (units.length) {
      const records = units.map((unit) => registry.get(unit.id)!).filter(Boolean);
      registry.fillLocations(records);
    }
    this.sendUnits(units);
    if (scopes.hasUnsentChanges) {
      scopes.hasUnsentChanges = false;
      this.send({ type: 'scopes', scopes: scopes.list() });
      // a scope registered after the panel connected may be the new live one
      this.sendTimeline();
    }
    if (this.unsentTransactions.length) {
      const transactions = this.unsentTransactions;
      this.unsentTransactions = [];
      this.sendTransactions(transactions);
    }
    if (diagnostics.hasUnsentChanges) {
      diagnostics.hasUnsentChanges = false;
      this.send({ type: 'diagnostics', items: diagnostics.list() });
    }
  };

  /** A panel connected: it gets the whole state, then updates. */
  sendEverything() {
    const { registry, scopes, history, diagnostics } = this.parts;
    registry.takeUnsent();
    this.sendHello();
    registry.fillLocations();
    const units = registry.allInfos();
    // at least one message, so the panel knows the list is complete even when empty
    if (!units.length) this.send({ type: 'units', units });
    this.sendUnits(units);
    scopes.hasUnsentChanges = false;
    this.send({ type: 'scopes', scopes: scopes.list() });
    this.sendTransactions(history.transactions);
    this.parts.refreshStaticDiagnostics();
    diagnostics.hasUnsentChanges = false;
    this.send({ type: 'diagnostics', items: diagnostics.list() });
    this.sendOverrides();
    this.sendTimeline();
    this.unsentTransactions = [];
  }
}
