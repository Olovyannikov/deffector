import { decode, type Encoded, type FxOverride } from '@deffector/protocol';
import type { EffectHandler } from '../effector';
import { sleep } from '../platform';

const DEFAULT_DELAY_MS = 1000;

/** A call kept pending by a `pending` override, released when the override is removed. */
export interface HeldCall {
  params: unknown;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}

export interface OverrideHandlerParts {
  override: FxOverride;
  effectName: string;
  /** the effect's own handler (rejects when there is none) */
  callOriginal: EffectHandler;
  hold: (call: HeldCall) => void;
}

function decodeOptional(value: Encoded | undefined): unknown {
  return value === undefined ? undefined : decode(value);
}

/** What a forced failure rejects with: the given error, a message, or a default error. */
function failureOf(value: unknown, effectName: string): unknown {
  if (value === undefined || value === '') return new Error(`${effectName}: failed by deffector`);
  if (typeof value === 'string') return new Error(value);
  return value;
}

/** A handler typed in the Effects tab: `original` is the effect's own handler. */
function compileHandler(code: string | undefined, callOriginal: EffectHandler): EffectHandler {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- running code the developer typed into the Effects tab is the feature
  const factory = new Function('original', `"use strict"; return (${code || 'p => p'})`);
  const handler: unknown = factory(callOriginal);
  if (typeof handler !== 'function') throw new Error('the code must evaluate to a function');
  return handler as EffectHandler;
}

/** The handler that replaces an effect's own while the override is active. */
export function createOverrideHandler({
  override,
  effectName,
  callOriginal,
  hold,
}: OverrideHandlerParts): EffectHandler {
  switch (override.mode) {
    case 'pending':
      return (params) =>
        new Promise((resolve, reject) => {
          hold({ params, resolve, reject });
        });
    case 'done':
      return () => Promise.resolve(decodeOptional(override.value));
    case 'fail':
      return () => Promise.reject(failureOf(decodeOptional(override.value), effectName));
    case 'delay':
      return (params) =>
        sleep(Math.max(0, override.delay ?? DEFAULT_DELAY_MS)).then(() => callOriginal(params));
    case 'handler':
      return compileHandler(override.code, callOriginal);
    default:
      throw new Error('unknown override mode');
  }
}
