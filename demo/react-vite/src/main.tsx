// the agent goes first: it must see units as they are created
import '@deffector/agent';
import { createRoot } from 'react-dom/client';
import { fork } from 'effector';
import { DeffectorProvider } from '@deffector/agent/react';
import { App } from './App';
import '@deffector-demo/shared/demo.css';

const scope = fork();

createRoot(document.getElementById('root')!).render(
  <DeffectorProvider value={scope} name="client">
    <App />
  </DeffectorProvider>,
);
