import { useEffect } from 'react';
import {
  clearLog,
  exportTraceToTracesTab,
  stepThroughHistory,
  TAB_IDS,
  type PanelStore,
} from '../../store';

/** Keys typed into a field stay there: digits must not switch tabs while editing a value. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  );
}

function handleShortcut(store: PanelStore, event: KeyboardEvent) {
  const hasModifier = event.ctrlKey || event.metaKey;
  const key = event.key.toLowerCase();
  if (hasModifier && key === 'k') {
    event.preventDefault();
    store.setUI({ isPaletteOpen: !store.ui.isPaletteOpen });
    return;
  }
  // the open palette handles its own keys
  if (store.ui.isPaletteOpen) return;
  if (event.key === 'Escape' && store.ui.isFiltersMenuOpen) {
    store.setUI({ isFiltersMenuOpen: false });
    return;
  }
  if (event.key === 'Escape' && store.timeline.cursor !== null) {
    event.preventDefault();
    store.jump(null);
    return;
  }
  if (hasModifier && (event.key === '[' || event.key === ']')) {
    event.preventDefault();
    stepThroughHistory(store, event.key === '[' ? -1 : 1);
    return;
  }
  if (hasModifier && key === 'l') {
    event.preventDefault();
    clearLog(store);
    return;
  }
  if (hasModifier && key === 's') {
    event.preventDefault();
    exportTraceToTracesTab(store);
    return;
  }
  if (!isTypingTarget(event.target) && !hasModifier && !event.altKey && /^[1-6]$/.test(event.key))
    store.setUI({ tab: TAB_IDS[Number(event.key) - 1] });
}

/**
 * Panel-wide keys: Ctrl+K palette, Esc back to the present, Ctrl+[ / Ctrl+] step through history,
 * Ctrl+L clear, Ctrl+S export, 1–6 switch tabs.
 */
export function useKeyboardShortcuts(store: PanelStore) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => handleShortcut(store, event);
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [store]);
}
