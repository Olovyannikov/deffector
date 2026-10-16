import DefaultTheme from 'vitepress/theme';
import Architecture from './components/Architecture.vue';
import Shot from './components/Shot.vue';
import './custom.css';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('Shot', Shot);
    app.component('Architecture', Architecture);
  },
};
