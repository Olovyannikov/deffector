import type { HelloInfo } from '@deffector/protocol';

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

function render(hello: HelloInfo | null) {
  const output = document.getElementById('out');
  if (!output) return;
  output.textContent = '';
  output.append(...(hello ? describeAgent(hello) : describeMissingAgent()));
}

async function readTabStatus(): Promise<HelloInfo | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) return null;
  try {
    const status: { hello: HelloInfo | null } | undefined = await chrome.runtime.sendMessage({
      deffector: 'status',
      tabId: tab.id,
    });
    return status?.hello ?? null;
  } catch {
    return null;
  }
}

readTabStatus().then(render, () => render(null));
