export const PROTOCOL_VERSION = 1;

/** `source` of window messages posted by the agent and by the panel side (content script). */
export const AGENT_SOURCE = 'deffector-agent';
export const PANEL_SOURCE = 'deffector-panel';

/** A message as it travels through window.postMessage. */
export interface Envelope<T> {
  source: typeof AGENT_SOURCE | typeof PANEL_SOURCE;
  v: number;
  payload: T;
}
