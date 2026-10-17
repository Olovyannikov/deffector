import type { HelloInfo } from '@deffector/protocol';
import { originPattern } from './site-access';

const isRussian = (chrome.i18n?.getUILanguage?.() || navigator.language)
  .toLowerCase()
  .startsWith('ru');

/** Values come from the page: build DOM nodes, never HTML strings. */
function createElement(tag: string, text?: string, children: Node[] = []): HTMLElement {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  for (const child of children) element.appendChild(child);
  return element;
}

const createText = (text: string) => document.createTextNode(text);

function describeAgent(hello: HelloInfo): Node[] {
  const version = String(hello.effector.version);
  const { withSid, total } = hello.sidCoverage;
  return [
    createElement('b', isRussian ? `effector ${version} найден` : `effector ${version} detected`),
    createText(isRussian ? 'Откройте DevTools → вкладка ' : 'Open DevTools → the '),
    createElement('code', 'deffector'),
    createText(isRussian ? '.' : ' tab.'),
    createElement(
      'p',
      isRussian
        ? `sid есть у ${withSid} из ${total} сторов.`
        : `${withSid} of ${total} stores have a sid.`,
    ),
  ];
}

function describeMissingAgent(): Node[] {
  return [
    createElement('b', isRussian ? 'Агент deffector не найден' : 'No deffector agent on this page'),
    createText(
      isRussian
        ? 'Добавьте первым импортом приложения:'
        : 'Add it as the first import of your app:',
    ),
    createElement('p', undefined, [createElement('code', "import '@deffector/agent'")]),
    createElement('p', isRussian ? 'и перезагрузите страницу.' : 'then reload the page.'),
  ];
}

function show(nodes: Node[]) {
  const output = document.getElementById('out');
  if (!output) return;
  output.textContent = '';
  output.append(...nodes);
}

function describeGranted(): Node[] {
  return [
    createElement('b', isRussian ? 'Доступ выдан' : 'Access granted'),
    createText(isRussian ? 'Откройте DevTools → вкладка ' : 'Open DevTools → the '),
    createElement('code', 'deffector'),
    createText(isRussian ? '.' : ' tab.'),
  ];
}

function describeRefused(): Node[] {
  return [createElement('b', isRussian ? 'Доступ не выдан' : 'Access was not granted')];
}

/** A site outside localhost that the user has not allowed yet: offer to allow it. */
function describeMissingAccess(origin: string, pattern: string): Node[] {
  const allow = createElement(
    'button',
    isRussian ? 'Разрешить на этом сайте' : 'Allow on this site',
  );
  allow.addEventListener('click', async () => {
    const granted = await chrome.permissions.request({ origins: [pattern] }).catch(() => false);
    // the background injects the content script into the open tab on permissions.onAdded
    show(granted ? describeGranted() : describeRefused());
  });
  return [
    createElement('b', isRussian ? 'Нет доступа к этому сайту' : 'No access to this site'),
    createElement('code', new URL(origin).host),
    createElement(
      'p',
      isRussian
        ? 'На localhost deffector работает сам. Для другого адреса разрешите его один раз:'
        : 'deffector runs on localhost by itself. For another address, allow it once:',
    ),
    createElement('p', undefined, [allow]),
  ];
}

interface TabStatus {
  hello: HelloInfo | null;
  origin: string | null;
  granted: boolean;
}

async function readTabStatus(): Promise<TabStatus> {
  // the click on the toolbar button grants activeTab, so the tab's URL is readable here
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) return { hello: null, origin: null, granted: false };
  const origin = tab.url ? new URL(tab.url).origin : null;
  const status: { hello: HelloInfo | null } | undefined = await chrome.runtime
    .sendMessage({ deffector: 'status', tabId: tab.id })
    .catch(() => undefined);
  const access: { granted: boolean } | undefined = origin
    ? await chrome.runtime.sendMessage({ deffector: 'site-access', origin }).catch(() => undefined)
    : undefined;
  return { hello: status?.hello ?? null, origin, granted: !!access?.granted };
}

function render({ hello, origin, granted }: TabStatus) {
  if (hello) {
    show(describeAgent(hello));
    return;
  }
  const pattern = origin ? originPattern(origin) : null;
  if (origin && pattern && !granted) {
    show(describeMissingAccess(origin, pattern));
    return;
  }
  show(describeMissingAgent());
}

readTabStatus().then(render, () => render({ hello: null, origin: null, granted: false }));
