import type { FxOverride } from '@deffector/protocol';
import type { EffectHandler, Scope } from '../effector';
import type { Registry } from '../registry';
import type { Scopes } from '../scopes';
import { createOverrideHandler, type HeldCall } from './overrideHandler';

interface ActiveOverride {
  override: FxOverride;
  restore: () => void;
  /** calls held by a `pending` override: released with the original handler when it is removed */
  heldCalls: HeldCall[];
  originalHandler: EffectHandler | undefined;
}

/** Held calls go on with the effect's real handler. */
function releaseHeldCall(call: HeldCall, handler: EffectHandler | undefined) {
  let result: unknown;
  try {
    result = handler ? handler(call.params) : Promise.reject(new Error('no handler'));
  } catch (error) {
    call.reject(error);
    return;
  }
  Promise.resolve(result).then(call.resolve, call.reject);
}

/**
 * Effect handler overrides from the Effects tab: keep a call pending, resolve
 * or reject it with a given value, add latency, or run your own handler.
 * Applied to the effect's default handler (every scope and the global graph)
 * and, for effects with a sid, to `scope.handlers.sidMap` of every known scope
 * (a scope handler set by fork({ handlers }) would win over the default).
 */
export class EffectOverrides {
  private readonly active = new Map<string, ActiveOverride>();

  constructor(
    private readonly registry: Registry,
    private readonly scopes: Scopes,
  ) {}

  list(): FxOverride[] {
    return [...this.active.values()].map((active) => active.override);
  }

  set(override: FxOverride) {
    this.clear(override.node);
    const effect = this.registry.get(override.node);
    if (!effect || effect.info.kind !== 'effect')
      throw new Error(`not an effect: ${override.node}`);
    const effectName = effect.info.name;
    const runnerScope = effect.node.scope?.runner?.scope;
    if (!runnerScope) throw new Error(`effect runner not found for ${effectName}`);
    const originalHandler = runnerScope.handler;
    const heldCalls: HeldCall[] = [];
    const handler = createOverrideHandler({
      override,
      effectName,
      callOriginal: (params) => {
        if (!originalHandler) return Promise.reject(new Error(`no handler used in ${effectName}`));
        return originalHandler(params);
      },
      hold: (call) => heldCalls.push(call),
    });
    runnerScope.handler = handler;
    const restores = [
      () => {
        runnerScope.handler = originalHandler;
      },
      ...this.overrideInScopes(effect.info.sid, handler),
    ];
    this.active.set(override.node, {
      override,
      heldCalls,
      originalHandler,
      restore: () => restores.forEach((restore) => restore()),
    });
  }

  /** A scope handler (fork({ handlers }), by sid) would win over the default one. */
  private overrideInScopes(sid: string | null, handler: EffectHandler): (() => void)[] {
    if (!sid) return [];
    const restores: (() => void)[] = [];
    for (const { scope } of this.scopes.knownScopes()) {
      const handlersBySid = scope.handlers && scope.handlers.sidMap;
      if (!handlersBySid) continue;
      const hadOwn = Object.hasOwn(handlersBySid, sid);
      const previous = handlersBySid[sid];
      handlersBySid[sid] = handler;
      restores.push(() => {
        if (hadOwn) handlersBySid[sid] = previous;
        else delete handlersBySid[sid];
      });
    }
    return restores;
  }

  clear(nodeId: string | null) {
    const ids = nodeId === null ? [...this.active.keys()] : [nodeId];
    for (const id of ids) {
      const active = this.active.get(id);
      if (!active) continue;
      active.restore();
      this.active.delete(id);
      for (const call of active.heldCalls) releaseHeldCall(call, active.originalHandler);
    }
  }

  /** A new scope (time travel, replay) gets the active sid overrides too. */
  applyTo(scope: Scope) {
    for (const active of this.active.values()) {
      const effect = this.registry.get(active.override.node);
      const sid = effect?.info.sid;
      const handler = effect?.node.scope?.runner?.scope?.handler;
      if (sid && handler && scope.handlers) scope.handlers.sidMap[sid] = handler;
    }
  }
}
