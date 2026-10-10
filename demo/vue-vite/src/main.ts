// the agent goes first: it must see units as they are created
import '@deffector/agent';
import { createApp } from 'vue';
import { fork } from 'effector';
import { withDeffector } from '@deffector/agent/vue';
import App from './App.vue';
import '@deffector-demo/shared/demo.css';

const scope = fork();

// withDeffector provides the scope to effector-vue (like EffectorScopePlugin)
// and lets deffector swap it for time travel and replay
createApp(withDeffector(App, { scope, name: 'client' })).mount('#app');
