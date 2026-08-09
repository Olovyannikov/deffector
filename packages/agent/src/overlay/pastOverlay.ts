import { KEY_EVENTS, OVERLAY_HOST_STYLE, OVERLAY_MARKUP, POINTER_EVENTS } from './overlayMarkup';

export interface OverlayTexts {
  title: (transactionId: number) => string;
  back: string;
  unlock: string;
  hint: string;
}

interface OverlayElements {
  host: HTMLElement;
  label: HTMLElement;
  back: HTMLElement;
  unlock: HTMLElement;
  hint: HTMLElement;
}

function swallow(event: Event) {
  event.stopPropagation();
  event.preventDefault();
}

function elementById(root: ShadowRoot, id: string): HTMLElement {
  return root.getElementById(id)!;
}

/**
 * While the app shows the past, a transparent layer covers the page so a click
 * cannot change the past by accident. A badge at the top says where you are and
 * returns to the present. Only in a browser; Shadow DOM keeps app styles out.
 */
export class PastOverlay {
  private elements: OverlayElements | null = null;

  constructor(
    private readonly onBack: () => void,
    private readonly onUnlock: () => void,
  ) {}

  show(transactionId: number, texts: OverlayTexts) {
    if (typeof document === 'undefined' || !document.body) return;
    const elements = this.elements || this.create();
    elements.label.textContent = texts.title(transactionId);
    elements.back.textContent = texts.back;
    elements.unlock.textContent = texts.unlock;
    elements.hint.textContent = texts.hint;
    if (elements.host.isConnected) return;
    document.body.appendChild(elements.host);
    // typing into a field that had focus would change the past too
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    for (const type of KEY_EVENTS) window.addEventListener(type, this.onKey, true);
  }

  hide() {
    const host = this.elements?.host;
    if (host?.isConnected) {
      for (const type of KEY_EVENTS) window.removeEventListener(type, this.onKey, true);
    }
    host?.remove();
  }

  private readonly onKey = (event: Event) => {
    if ((event as KeyboardEvent).key === 'Escape' && event.type === 'keydown') this.onBack();
    event.stopImmediatePropagation();
    event.preventDefault();
  };

  private create(): OverlayElements {
    const host = document.createElement('deffector-past');
    host.setAttribute('data-deffector', 'overlay');
    host.style.cssText = OVERLAY_HOST_STYLE;
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = OVERLAY_MARKUP;
    const veil = elementById(root, 'veil');
    for (const type of POINTER_EVENTS) veil.addEventListener(type, swallow, { passive: false });
    const back = elementById(root, 'back');
    back.addEventListener('click', (event) => {
      swallow(event);
      this.onBack();
    });
    const unlock = elementById(root, 'unlock');
    unlock.addEventListener('click', (event) => {
      swallow(event);
      this.onUnlock();
    });
    // keyboard input would still reach a focused field under the veil
    host.addEventListener('keydown', swallow);
    this.elements = {
      host,
      label: elementById(root, 'label'),
      back,
      unlock,
      hint: elementById(root, 'hint'),
    };
    return this.elements;
  }
}
