import type { KeyboardEvent } from 'react';

/** Keyboard counterpart of a click on an element with a link or option role: Enter or Space. */
export function onActivationKey(action: () => void) {
  return (event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    action();
  };
}
