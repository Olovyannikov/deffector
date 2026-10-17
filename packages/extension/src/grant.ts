/**
 * The window that asks the user to let deffector run on one more site. It exists because DevTools
 * panels cannot call chrome.permissions; the background worker opens it with ?origin=.
 * After the grant the background registers the content script for the site and injects it into
 * the open pages (permissions.onAdded), so this page only asks.
 */
import { originPattern } from './site-access';

const isRussian = (chrome.i18n?.getUILanguage?.() || navigator.language)
  .toLowerCase()
  .startsWith('ru');
const CLOSE_DELAY_MS = 900;

const origin = new URLSearchParams(window.location.search).get('origin') ?? '';
const pattern = originPattern(origin);
const output = document.getElementById('out');

function createElement(tag: string, text?: string, children: Node[] = []): HTMLElement {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  for (const child of children) element.appendChild(child);
  return element;
}

function show(...nodes: Node[]) {
  if (!output) return;
  output.textContent = '';
  output.append(...nodes);
}

async function requestAccess(sitePattern: string) {
  let granted = false;
  try {
    granted = await chrome.permissions.request({ origins: [sitePattern] });
  } catch {
    granted = false;
  }
  if (!granted) {
    show(
      createElement('h1', isRussian ? 'Доступ не выдан' : 'Access was not granted'),
      createElement(
        'p',
        isRussian
          ? 'deffector не будет работать на этом сайте. Можно попробовать ещё раз из панели.'
          : 'deffector will not run on this site. You can try again from the panel.',
      ),
    );
    return;
  }
  show(createElement('h1', isRussian ? 'Готово' : 'Done'));
  setTimeout(() => window.close(), CLOSE_DELAY_MS);
}

function render() {
  if (!pattern) {
    show(createElement('h1', isRussian ? 'Неизвестный адрес' : 'Unknown address'));
    return;
  }
  const allow = createElement('button', isRussian ? 'Разрешить' : 'Allow');
  const cancel = createElement('button', isRussian ? 'Отмена' : 'Cancel');
  allow.addEventListener('click', () => {
    requestAccess(pattern);
  });
  cancel.addEventListener('click', () => window.close());
  show(
    createElement(
      'h1',
      isRussian ? 'Разрешить deffector на этом сайте?' : 'Allow deffector on this site?',
    ),
    createElement('p', undefined, [createElement('code', new URL(origin).host)]),
    createElement(
      'p',
      isRussian
        ? 'Расширение будет подключаться к агенту deffector в приложении на этом адресе. Данные никуда не отправляются.'
        : 'The extension will connect to the deffector agent of the app on this address. No data leaves your computer.',
    ),
    allow,
    cancel,
  );
}

render();
