import type {
  AgentMessage,
  Diagnostic,
  FxOverride,
  GraphEdge,
  GraphNode,
  HelloInfo,
  PanelCommand,
  PanelTransport,
  ScopeInfo,
  TimelineState,
  TraceFile,
  Tx,
  UnitInfo,
} from '@deffector/protocol';
import { detectLocale, textsByLocale, type Locale, type Texts } from '../i18n';
import { PresetLibrary } from './presets';
import { SavedFilterList } from './savedFilters';
import { ScopeStateCache } from './scopeState';
import { TraceImport } from './traceImport';
import { TransactionLog } from './transactionLog';
import { createInitialTimeline, createInitialUIState, type UIState } from './uiState';

const TOAST_DURATION_MS = 2600;

let requestCounter = 0;

type HelloMessage = Extract<AgentMessage, { type: 'hello' }>;

/**
 * Panel state: everything the agent sent plus UI state. A tiny external store
 * for useSyncExternalStore: every change bumps `version`.
 *
 * Tests and debugging snippets reach it through `window.__deffectorPanel.store`
 * and read `units`, `txs`, `setUI` and `exportTrace`.
 */
export class PanelStore {
  version = 0;

  connection: 'waiting' | 'connected' = 'waiting';

  hello: HelloInfo | null = null;

  units = new Map<string, UnitInfo>();

  scopes: ScopeInfo[] = [];

  diagnostics: Diagnostic[] = [];

  timeline: TimelineState = createInitialTimeline();

  /** the unit graph, requested when the Graph tab opens */
  graph: { nodes: GraphNode[]; edges: GraphEdge[] } | null = null;

  /** the last exported trace and the test generated from it */
  exported: { trace: TraceFile; test: string } | null = null;

  effectOverrides: FxOverride[] = [];

  toastMessage: string | null = null;

  /** set by the host (the extension): opens a file in the Sources panel */
  opener: ((url: string, line?: number) => void) | null = null;

  locale: Locale;

  ui: UIState = createInitialUIState();

  readonly presets = new PresetLibrary(this);

  readonly savedFilters = new SavedFilterList(this);

  readonly traceImport = new TraceImport(this);

  readonly scopeState = new ScopeStateCache(this);

  private readonly transactionLog = new TransactionLog();

  private listeners = new Set<() => void>();

  private pendingRequests = new Map<string, (message: AgentMessage) => void>();

  private unsubscribeTransport: (() => void) | null = null;

  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly transport: PanelTransport,
    locale?: Locale,
  ) {
    this.locale = locale || detectLocale();
    this.presets.load();
    this.unsubscribeTransport = transport.subscribe((message) => this.receive(message));
  }

  get texts(): Texts {
    return textsByLocale[this.locale];
  }

  /** recorded transactions, oldest first */
  get txs(): Tx[] {
    return this.transactionLog.list;
  }

  transaction(id: number): Tx | undefined {
    return this.transactionLog.get(id);
  }

  start() {
    this.send({ type: 'connect', locale: this.locale });
  }

  dispose() {
    this.unsubscribeTransport?.();
  }

  // ------------------------------------------------------------- subscription

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getVersion = () => this.version;

  emit() {
    this.version += 1;
    for (const listener of this.listeners) listener();
  }

  // ------------------------------------------------------------- talking to the agent

  send(command: PanelCommand) {
    this.transport.send(command);
  }

  /** Sends a command with a fresh request id and resolves with the agent's reply to it. */
  request<Reply extends AgentMessage>(
    makeCommand: (requestId: string) => PanelCommand,
  ): Promise<Reply> {
    requestCounter += 1;
    const requestId = `r${requestCounter}`;
    return new Promise((resolve) => {
      this.pendingRequests.set(requestId, (message) => resolve(message as Reply));
      this.send(makeCommand(requestId));
    });
  }

  private receive(message: AgentMessage) {
    this.resolvePendingRequest(message);
    this.applyMessage(message);
    this.emit();
  }

  private resolvePendingRequest(message: AgentMessage) {
    if (!('requestId' in message) || !message.requestId) return;
    const resolve = this.pendingRequests.get(message.requestId);
    if (!resolve) return;
    this.pendingRequests.delete(message.requestId);
    resolve(message);
  }

  private applyMessage(message: AgentMessage) {
    switch (message.type) {
      case 'hello':
        this.applyHello(message);
        break;
      case 'overrides':
        this.effectOverrides = message.items;
        break;
      case 'result':
        if (!message.ok && message.message && message.requestId === 'fx-override')
          this.showToast(message.message);
        break;
      case 'units':
        for (const unit of message.units) this.units.set(unit.id, unit);
        break;
      case 'scopes':
        this.scopes = message.scopes;
        break;
      case 'txs':
        this.transactionLog.merge(message.txs);
        this.scopeState.scheduleRefresh();
        break;
      case 'tx-update':
        this.transactionLog.replace(message.tx);
        break;
      case 'cleared':
        this.transactionLog.clear();
        this.ui = { ...this.ui, selectedTransactionId: null };
        this.scopeState.scheduleRefresh();
        break;
      case 'diagnostics':
        this.diagnostics = message.items;
        break;
      case 'timeline':
        this.timeline = message.state;
        this.scopeState.scheduleRefresh();
        break;
      case 'state':
        this.scopeState.accept({
          scopeId: message.scopeId,
          txId: message.txId,
          values: message.values,
        });
        break;
      case 'reset':
        this.reset();
        break;
      default:
        // replies (trace, compat, graph, source) only resolve their request
        break;
    }
  }

  private applyHello({ info, listening }: HelloMessage) {
    const isNewInstance = this.hello?.instance !== info.instance;
    // the page reloaded: what the panel holds belongs to the previous agent
    if (this.hello && isNewInstance) this.reset();
    this.connection = 'connected';
    // the agent started after the panel (page load) or lost the panel: ask for everything
    if (!listening) this.send({ type: 'connect', locale: this.locale });
    this.hello = info;
    if (isNewInstance) {
      this.presets.load();
      this.savedFilters.load();
      this.savedFilters.sendIgnoreRules();
    }
  }

  reset() {
    this.connection = 'waiting';
    this.effectOverrides = [];
    this.hello = null;
    this.units.clear();
    this.scopes = [];
    this.transactionLog.clear();
    this.diagnostics = [];
    this.graph = null;
    this.scopeState.clear();
    this.ui = { ...this.ui, selectedTransactionId: null };
    this.emit();
  }

  // ------------------------------------------------------------- UI state

  /** Changes UI state and fetches what the new view needs (the graph, store values). */
  setUI(patch: Partial<UIState>) {
    this.ui = { ...this.ui, ...patch };
    if (patch.tab === 'graph' && !this.graph) this.loadGraph();
    if (patch.tab === 'stores' || patch.selectedTransactionId !== undefined)
      this.scopeState.refresh();
    this.emit();
  }

  /** Changes UI state without requesting anything from the agent. */
  setUIWithoutRefresh(patch: Partial<UIState>) {
    this.ui = { ...this.ui, ...patch };
    this.emit();
  }

  setLocale(locale: Locale) {
    this.locale = locale;
    this.send({ type: 'connect', locale });
    this.emit();
  }

  showToast(text: string) {
    this.toastMessage = text;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastMessage = null;
      this.emit();
    }, TOAST_DURATION_MS);
    this.emit();
  }

  // ------------------------------------------------------------- derived

  unitName(id: string): string {
    return this.units.get(id)?.name ?? id;
  }

  scopeName(id: string): string {
    return this.scopes.find((scope) => scope.id === id)?.name ?? id;
  }

  /** scope the app renders: a time-travel fork while in the past */
  get viewScopeId(): string {
    return this.timeline.viewScopeId || this.timeline.liveScopeId || 'global';
  }

  get liveScopeId(): string {
    return this.timeline.liveScopeId || 'global';
  }

  /** scope shown in Stores: the scope filter if one is picked, otherwise what the app renders */
  get storesScopeId(): string {
    return this.ui.scopeFilter !== 'all' ? this.ui.scopeFilter : this.viewScopeId;
  }

  /** The picked transaction, else the one time travel shows, else the newest. */
  selectedTransaction(): Tx | null {
    const { selectedTransactionId } = this.ui;
    if (selectedTransactionId !== null) return this.transaction(selectedTransactionId) || null;
    if (this.timeline.cursor !== null) return this.transaction(this.timeline.cursor) || null;
    return this.txs.at(-1) ?? null;
  }

  // ------------------------------------------------------------- actions that change panel state

  loadGraph() {
    void this.request<Extract<AgentMessage, { type: 'graph' }>>((requestId) => ({
      type: 'get-graph',
      requestId,
    })).then(({ nodes, edges }) => {
      this.graph = { nodes, edges };
      this.emit();
    });
  }

  /** Time travel: the app shows the state right after `txId`; null returns to the present. */
  jump(txId: number | null) {
    this.send({ type: 'jump', txId });
    if (txId !== null) this.ui = { ...this.ui, selectedTransactionId: txId };
    this.emit();
  }

  /** Covers the page while it shows the past, so clicks cannot change it. */
  setLock(isLocked: boolean) {
    // optimistic: the agent confirms with a timeline message
    this.timeline = { ...this.timeline, locked: isLocked };
    this.send({ type: 'set-lock', on: isLocked });
    this.emit();
  }

  /** `focus`: the step the trace opens at after a replay. */
  async exportTrace(focus?: number) {
    const reply = await this.request<Extract<AgentMessage, { type: 'trace' }>>((requestId) => ({
      type: 'export',
      requestId,
      scopeId: this.liveScopeId,
      focus,
    }));
    this.exported = { trace: reply.trace, test: reply.test };
    this.emit();
    return reply;
  }
}
