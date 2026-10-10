// Global mode: no fork(), no Provider — the app works with the global graph.
// deffector supports it, with a warning: jumps write values in place with
// launch(), so watchers and effects react. Prefer fork() for reliable time travel.
import '@deffector/agent';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import '@deffector-demo/shared/demo.css';

createRoot(document.getElementById('root')!).render(<App />);
