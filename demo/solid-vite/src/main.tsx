// the agent goes first: it must see units as they are created
import '@deffector/agent';
import { render } from 'solid-js/web';
import { fork } from 'effector';
import { DeffectorProvider } from '@deffector/agent/solid';
import { App } from './App';
import '@deffector-demo/shared/demo.css';

const scope = fork();

render(
  () => (
    <DeffectorProvider value={scope} name="client">
      <App />
    </DeffectorProvider>
  ),
  document.getElementById('root')!,
);
