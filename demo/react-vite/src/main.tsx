// the agent goes first: it must see units as they are created
import '@deffector/agent';
import { attachDeffectorNode } from '@deffector/agent/node';
import { createRoot } from 'react-dom/client';
import { fork } from 'effector';
import { DeffectorProvider } from '@deffector/agent/react';
import { App } from './App';
import '@deffector-demo/shared/demo.css';

// ?standalone also connects to the standalone app (npx @deffector/standalone), next to the extension:
// handy in a browser without the extension, in a WebView, or with the panel on a second screen
if (new URLSearchParams(window.location.search).has('standalone')) {
  attachDeffectorNode({ name: 'react demo' });
}

const scope = fork();

createRoot(document.getElementById('root')!).render(
  <DeffectorProvider value={scope} name="client">
    <App />
  </DeffectorProvider>,
);
