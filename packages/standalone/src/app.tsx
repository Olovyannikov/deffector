import { mountPanel, type MountedPanel } from '@deffector/panel';
import { mountAgentSelector } from './agentSelector';
import { createWebSocketTransport } from './webSocketTransport';

const query = new URLSearchParams(window.location.search);
const isRussian = (query.get('lang') || navigator.language).toLowerCase().startsWith('ru');

function detectTheme(): 'light' | 'dark' {
  const requested = query.get('theme');
  if (requested) return requested === 'light' ? 'light' : 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

const transport = createWebSocketTransport(query.get('agent') || 'auto');
const theme = detectTheme();
document.documentElement.dataset.theme = theme;
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('index.html has no #root element');
const panel: MountedPanel = mountPanel(rootElement, {
  transport,
  theme,
  locale: isRussian ? 'ru' : 'en',
});
// for e2e tests and debugging the panel itself
(window as Window & { __deffectorPanel?: MountedPanel }).__deffectorPanel = panel;

mountAgentSelector(transport, isRussian);
