export function attachDeffectorNode(_options: unknown = {}) {
  return { detach() {} };
}
export function getAgent() {
  return null;
}
export function registerScope(_scope: unknown, _options: unknown = {}) {
  return () => {};
}
export function createWebSocketTransport() {
  return {
    send() {},
    subscribe() {
      return () => {};
    },
    close() {},
  };
}
export function registerModel(_instance: unknown, _name?: string) {}
