import {
  AGENT_SOURCE,
  PANEL_SOURCE,
  PROTOCOL_VERSION,
  type AgentTransport,
  type PanelCommand,
} from '@deffector/protocol';

/**
 * Page ⇄ content script bridge. The extension's content script (isolated world)
 * relays these messages to the DevTools panel through a runtime port.
 * window.postMessage is visible to the page itself, so this channel is not a
 * security boundary: it only carries debugging data of the same page.
 */
export function createWindowTransport(targetWindow: Window = window): AgentTransport {
  return {
    send(message) {
      targetWindow.postMessage(
        { source: AGENT_SOURCE, v: PROTOCOL_VERSION, payload: message },
        '*',
      );
    },
    subscribe(listener) {
      const onMessage = (event: MessageEvent) => {
        if (event.source !== targetWindow) return;
        const envelope = event.data;
        if (!envelope || envelope.source !== PANEL_SOURCE || !envelope.payload) return;
        listener(envelope.payload as PanelCommand);
      };
      targetWindow.addEventListener('message', onMessage);
      return () => targetWindow.removeEventListener('message', onMessage);
    },
  };
}
