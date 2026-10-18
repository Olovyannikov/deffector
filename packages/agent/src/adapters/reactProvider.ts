import { createElement, useEffect, useState } from 'react';
import type { Scope } from 'effector';
import { registerScope } from '..';
import type { DeffectorProviderProps, EffectorProvider } from './reactTypes';

/**
 * A drop-in replacement for the given effector-react Provider. deffector can render the app with
 * another scope through it: a forked copy of the past for time travel, or a fresh scope for
 * replaying a trace.
 *
 * Written without JSX: the JSX runtime (`react/jsx-runtime`) is missing before React 16.14, and
 * webpack 5 cannot resolve it from an ES module with React 17. Hooks only, so React 16.8+ works.
 */
export function createDeffectorProvider(Provider: EffectorProvider) {
  function DeffectorProvider({ value, name = undefined, children = null }: DeffectorProviderProps) {
    const [scope, setScope] = useState<Scope>(value);
    // a new scope from the app replaces whatever deffector rendered
    const [appScope, setAppScope] = useState<Scope>(value);
    if (appScope !== value) {
      setAppScope(value);
      setScope(value);
    }
    useEffect(() => registerScope(value, { name, switcher: setScope }), [value, name]);
    return createElement(Provider, { value: scope }, children);
  }
  return DeffectorProvider;
}
