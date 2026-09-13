import type { AgentMessage, Encoded, FxOverride } from '@deffector/protocol';
import { copyText } from '../clipboard';
import type { PanelStore } from './PanelStore';

/** `live` runs like allSettled in the scope; `silent` forks a new scope from the values. */
export type EditMode = 'live' | 'silent';

// ------------------------------------------------------------- recording and history

export function toggleRecording(store: PanelStore) {
  store.send({ type: 'set-recording', on: !store.timeline.recording });
}

export function clearLog(store: PanelStore) {
  store.send({ type: 'clear' });
}

/** Makes the current state the base and clears the history. */
export function commitHistory(store: PanelStore) {
  store.send({ type: 'commit' });
}

/** Returns the state to the last commit. */
export function revertHistory(store: PanelStore) {
  store.send({ type: 'revert' });
}

/** Skips a transaction (or restores a skipped one): the agent recomputes the state without it. */
export function toggleSkip(store: PanelStore, txId: number) {
  store.send({ type: 'skip', txId });
}

export function setTransactionNote(store: PanelStore, txId: number, text: string) {
  store.send({ type: 'note', txId, text });
}

/** Opens Traces and builds a trace that opens at the selected transaction after a replay. */
export function exportTraceToTracesTab(store: PanelStore) {
  store.setUI({ tab: 'traces' });
  void store.exportTrace(store.ui.selectedTransactionId ?? undefined);
}

export function toggleLocale(store: PanelStore) {
  store.setLocale(store.locale === 'ru' ? 'en' : 'ru');
}

/** Takes the effector inspector back from another devtool that replaced it. */
export function reclaimInspector(store: PanelStore) {
  store.send({ type: 'reclaim' });
}

// ------------------------------------------------------------- stores and units

export async function editStoreValue(
  store: PanelStore,
  node: string,
  value: Encoded,
  mode: EditMode,
) {
  await store.request((requestId) => ({
    type: 'edit',
    requestId,
    scopeId: store.storesScopeId,
    node,
    value,
    mode,
    label: mode === 'silent' ? '✎ devtools · silent' : '✎ devtools',
  }));
  store.scopeState.refresh();
}

/** Launches an event or effect in the scope the app renders, like a call from the app. */
export async function dispatchUnit(store: PanelStore, node: string, payload: Encoded) {
  await store.request((requestId) => ({
    type: 'dispatch',
    requestId,
    scopeId: store.viewScopeId,
    node,
    payload,
  }));
}

export async function applySnapshot(
  store: PanelStore,
  values: Record<string, Encoded>,
  mode: EditMode,
) {
  await store.request((requestId) => ({
    type: 'edit-many',
    requestId,
    scopeId: store.storesScopeId,
    values,
    label: store.texts.snapshot.label,
    mode,
  }));
  store.scopeState.refresh();
}

/** Recomputes derived stores from their sources; disagreements arrive as diagnostics. */
export async function checkConsistency(store: PanelStore) {
  await store.request((requestId) => ({
    type: 'check-consistency',
    requestId,
    scopeId: store.liveScopeId,
  }));
}

// ------------------------------------------------------------- effects

export function setEffectOverride(store: PanelStore, override: FxOverride) {
  store.send({ type: 'fx-override', override });
}

/** `node` null removes every override. */
export function clearEffectOverride(store: PanelStore, node: string | null) {
  store.send({ type: 'fx-clear', node });
}

// ------------------------------------------------------------- sources

/**
 * Opens a unit's file in the Sources panel when the host can and the agent resolves the URL;
 * otherwise copies `file:line` for the editor.
 */
export async function openSource(store: PanelStore, file: string, line?: number) {
  const reply = await store.request<Extract<AgentMessage, { type: 'source' }>>((requestId) => ({
    type: 'resolve-source',
    requestId,
    file,
    line,
  }));
  if (reply.url && store.opener) {
    store.opener(reply.url, line);
    return;
  }
  const location = line ? `${file}:${line}` : file;
  await copyText(location);
  store.showToast(store.texts.sourceCopied(location));
}
