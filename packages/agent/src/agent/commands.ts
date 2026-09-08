import {
  decode,
  encode,
  type AgentMessage,
  type Encoded,
  type IgnoreRule,
  type PanelCommand,
  type TimelineState,
  type Tx,
} from '@deffector/protocol';
import type { Collector } from '../collector';
import type { History, RawTransaction } from '../history';
import { isLocale, type Locale } from '../i18n';
import type { EffectOverrides } from '../overrides';
import type { Registry } from '../registry';
import { traceToTest } from '../trace';
import { errorMessage } from '../utils';
import type { DevtoolsEdits } from './edits';
import { buildGraph } from './graph';
import type { HealthMonitor } from './health';
import type { InspectorSlot } from './inspectorSlot';
import type { PanelConnection } from './panelConnection';
import type { Recording } from './recording';
import type { Replayer } from './replay';
import { resolveSourceUrl } from './sources';
import type { TimeTravel } from './timeTravel';
import type { TraceExchange } from './traceExchange';

/** a reconnect (service worker restart) comes within a second or two */
const RECONNECT_GRACE_MS = 3000;

export interface CommandParts {
  registry: Registry;
  history: History;
  collector: Collector;
  overrides: EffectOverrides;
  connection: PanelConnection;
  recording: Recording;
  health: HealthMonitor;
  inspectorSlot: InspectorSlot;
  timeTravel: TimeTravel;
  edits: DevtoolsEdits;
  replayer: Replayer;
  traces: TraceExchange;
  timeline: TimelineState;
  setLocale(locale: Locale): void;
  encode(transaction: RawTransaction): Tx;
  stateValues(scopeId: string, transactionId: number | null): Record<string, unknown>;
  jump(transactionId: number | null): void;
}

type CommandOf<Type extends PanelCommand['type']> = Extract<PanelCommand, { type: Type }>;

type CommandHandlers = {
  [Type in PanelCommand['type']]: (command: CommandOf<Type>) => void | Promise<void>;
};

function decodeAll(values: Record<string, Encoded>): Record<string, unknown> {
  const decoded: Record<string, unknown> = {};
  for (const key of Object.keys(values)) decoded[key] = decode(values[key]);
  return decoded;
}

/** Ignore rules are regular expressions over the transaction label; invalid ones are skipped. */
function compileIgnoreRules(rules: IgnoreRule[]): RegExp[] {
  const patterns: RegExp[] = [];
  for (const rule of rules) {
    try {
      patterns.push(new RegExp(rule.pattern, 'i'));
    } catch {
      /* invalid pattern: skipped */
    }
  }
  return patterns;
}

/** What the agent does for each panel command. */
export class CommandHandler {
  private readonly handlers: CommandHandlers;

  constructor(private readonly parts: CommandParts) {
    this.handlers = this.createHandlers();
  }

  async handle(command: PanelCommand) {
    const handler = this.handlers[command.type] as
      ((command: PanelCommand) => void | Promise<void>) | undefined;
    // a newer panel may send commands this agent does not know
    if (handler) await handler(command);
  }

  private reply(message: AgentMessage) {
    this.parts.connection.send(message);
  }

  private replyOk(requestId: string) {
    this.reply({ type: 'result', requestId, ok: true });
  }

  private onConnect(locale: unknown) {
    const { connection, recording, history, health, inspectorSlot } = this.parts;
    connection.isListening = true;
    if (isLocale(locale)) this.parts.setLocale(locale);
    recording.resume();
    // the locale may have changed: texts in encoded transactions too
    for (const transaction of history.transactions) transaction.encoded = undefined;
    health.scanCycles();
    connection.sendEverything();
    inspectorSlot.check();
    inspectorSlot.startWatching();
  }

  private onDisconnect() {
    const { connection, inspectorSlot, recording, timeline, timeTravel } = this.parts;
    connection.isListening = false;
    inspectorSlot.stopWatching();
    recording.schedulePause(RECONNECT_GRACE_MS);
    if (timeline.mode === 'past') timeTravel.goLive();
  }

  private sendState(requestId: string, scopeId: string, transactionId: number | null) {
    const values = this.parts.stateValues(scopeId, transactionId);
    const encoded: Record<string, Encoded> = {};
    for (const key of Object.keys(values)) encoded[key] = encode(values[key]);
    this.reply({ type: 'state', requestId, scopeId, txId: transactionId, values: encoded });
  }

  private setNote(transactionId: number, text: string) {
    const { history, connection, encode: encodeTransaction } = this.parts;
    const transaction = history.get(transactionId);
    if (!transaction) return;
    transaction.note = text.trim() || undefined;
    transaction.encoded = undefined;
    connection.send({ type: 'tx-update', tx: encodeTransaction(transaction) });
  }

  private checkConsistency(requestId: string, scopeId: string) {
    const { health, registry } = this.parts;
    const mismatched = health.checkConsistency(scopeId);
    this.reply({
      type: 'result',
      requestId,
      ok: mismatched.length === 0,
      message: mismatched.map((id) => registry.get(id)?.info.name ?? id).join(', '),
    });
  }

  private createHandlers(): CommandHandlers {
    const { parts } = this;
    const { connection, edits, recording, timeTravel, traces, replayer, overrides } = parts;
    return {
      connect: (command) => this.onConnect(command.locale),
      disconnect: () => this.onDisconnect(),
      // relays (the standalone server) ping a fresh connection to learn who is there
      ping: () => connection.sendHello(),
      reclaim: () => {
        parts.inspectorSlot.install();
        parts.inspectorSlot.check();
        parts.health.refreshStaticDiagnostics();
        connection.scheduleFlush();
      },
      'get-state': (command) => this.sendState(command.requestId, command.scopeId, command.txId),
      jump: (command) => parts.jump(command.txId),
      edit: (command) => {
        const values = { [command.node]: decode(command.value) };
        edits.edit(command.scopeId, values, command.mode, command.label);
        this.replyOk(command.requestId);
      },
      'edit-many': (command) => {
        const values = decodeAll(command.values);
        edits.edit(command.scopeId, values, command.mode || 'live', command.label, 'preset');
        this.replyOk(command.requestId);
      },
      dispatch: (command) => {
        edits.dispatch(command.scopeId, command.node, decode(command.payload));
        this.replyOk(command.requestId);
      },
      'set-recording': (command) => recording.setRecording(command.on),
      clear: () => {
        timeTravel.goLive();
        recording.rebase();
      },
      commit: () => {
        timeTravel.goLive();
        recording.rebase();
      },
      revert: () => edits.revert(),
      skip: (command) => replayer.skip(command.txId),
      export: (command) => {
        const trace = traces.export(command.scopeId, command.focus);
        this.reply({
          type: 'trace',
          requestId: command.requestId,
          trace,
          test: traceToTest(trace),
        });
      },
      'check-import': (command) => {
        const report = traces.checkImport(command.trace);
        this.reply({ type: 'compat', requestId: command.requestId, report });
      },
      replay: async (command) => {
        await replayer.replay(command.trace, command.mode);
        this.replyOk(command.requestId);
      },
      'get-graph': (command) => {
        this.reply({ type: 'graph', requestId: command.requestId, ...buildGraph(parts.registry) });
      },
      note: (command) => this.setNote(command.txId, command.text),
      'set-ignore': (command) => {
        parts.collector.ignorePatterns = compileIgnoreRules(command.rules);
      },
      'set-lock': (command) => timeTravel.setLock(command.on),
      'fx-override': (command) => {
        try {
          overrides.set(command.override);
        } catch (error) {
          this.reply({
            type: 'result',
            requestId: 'fx-override',
            ok: false,
            message: errorMessage(error),
          });
        }
        connection.sendOverrides();
      },
      'fx-clear': (command) => {
        overrides.clear(command.node);
        connection.sendOverrides();
      },
      'check-consistency': (command) => this.checkConsistency(command.requestId, command.scopeId),
      'resolve-source': (command) => {
        const url = resolveSourceUrl(command.file);
        this.reply({ type: 'source', requestId: command.requestId, url, line: command.line });
      },
    };
  }
}
