// The model here is compiled without the effector babel/swc plugin.
// deffector still works, but: units have no sid (Health warns), names come only
// from explicit { name } options, and a trace can be matched only by names.
// `effector/enable_debug_traces` gives source locations back at a runtime cost.
import 'effector/enable_debug_traces';
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
