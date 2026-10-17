import { h } from 'vue';
import DefaultTheme from 'vitepress/theme';
import Architecture from './components/Architecture.vue';
import AuthorNote from './components/AuthorNote.vue';
import GitHubStars from './components/GitHubStars.vue';
import Shot from './components/Shot.vue';
import './custom.css';

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      'nav-bar-content-after': () => h(GitHubStars),
      'doc-after': () => h(AuthorNote),
    }),
  enhanceApp({ app }) {
    app.component('Shot', Shot);
    app.component('Architecture', Architecture);
  },
};
