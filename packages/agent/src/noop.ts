/** Production build of @deffector/agent: same API, does nothing. */
export function attachDeffector(_options: unknown = {}) {
  return { agent: null, detach() {} };
}
export function registerScope(_scope: unknown, _options: unknown = {}) {
  return () => {};
}
export function getAgent() {
  return null;
}
export function createWindowTransport() {
  return {
    send() {},
    subscribe() {
      return () => {};
    },
  };
}
export function registerModel(_instance: unknown, _name?: string) {}
