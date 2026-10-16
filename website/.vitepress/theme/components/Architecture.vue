<script setup>
import { computed } from 'vue';
import { useData } from 'vitepress';

// How the pieces talk to each other. Labels follow the page language.
const { lang } = useData();

const L = {
  en: {
    title: 'deffector architecture',
    tab: 'Browser tab',
    app: 'your app + effector',
    hooks: 'inspector hooks',
    ext: 'Browser extension (Chrome, Edge, Firefox)',
    content: 'content script',
    bg: 'background',
    panel: 'DevTools → deffector',
    node: 'Node · SSR · React Native',
    server: 'server / app + effector',
    standalone: 'Standalone app: npx @deffector/standalone',
    relay: 'relay (server.mjs)',
    web: 'panel at :8686',
  },
  ru: {
    title: 'Архитектура deffector',
    tab: 'Вкладка браузера',
    app: 'ваше приложение + effector',
    hooks: 'хуки инспектора',
    ext: 'Расширение браузера (Chrome, Edge, Firefox)',
    content: 'content script',
    bg: 'background',
    panel: 'DevTools → deffector',
    node: 'Node · SSR · React Native',
    server: 'сервер / приложение + effector',
    standalone: 'Отдельное приложение: npx @deffector/standalone',
    relay: 'ретранслятор (server.mjs)',
    web: 'панель на :8686',
  },
};

const t = computed(() => (lang.value.startsWith('ru') ? L.ru : L.en));
</script>

<template>
  <figure class="arch">
    <svg viewBox="0 0 900 390" role="img" :aria-label="t.title" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker
          id="arch-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0 0 L10 5 L0 10 z" class="head" />
        </marker>
      </defs>

      <!-- browser tab -->
      <rect x="10" y="14" width="280" height="176" rx="10" class="group" />
      <text x="26" y="38" class="glabel">{{ t.tab }}</text>
      <rect x="30" y="54" width="240" height="40" rx="6" class="box" />
      <text x="150" y="79" class="label">{{ t.app }}</text>
      <rect x="30" y="130" width="240" height="40" rx="6" class="box accent" />
      <text x="150" y="155" class="label mono">@deffector/agent</text>
      <line x1="150" y1="95" x2="150" y2="128" class="edge" marker-end="url(#arch-arrow)" />
      <text x="158" y="116" class="small">{{ t.hooks }}</text>

      <!-- extension -->
      <rect x="320" y="14" width="570" height="176" rx="10" class="group" />
      <text x="336" y="38" class="glabel">{{ t.ext }}</text>
      <rect x="340" y="130" width="150" height="40" rx="6" class="box" />
      <text x="415" y="155" class="label">{{ t.content }}</text>
      <rect x="530" y="130" width="150" height="40" rx="6" class="box" />
      <text x="605" y="155" class="label">{{ t.bg }}</text>
      <rect x="720" y="130" width="150" height="40" rx="6" class="box accent" />
      <text x="795" y="155" class="label">{{ t.panel }}</text>
      <line
        x1="272"
        y1="150"
        x2="338"
        y2="150"
        class="edge"
        marker-start="url(#arch-arrow)"
        marker-end="url(#arch-arrow)"
      />
      <text x="305" y="124" class="small mid">postMessage</text>
      <line
        x1="492"
        y1="150"
        x2="528"
        y2="150"
        class="edge"
        marker-start="url(#arch-arrow)"
        marker-end="url(#arch-arrow)"
      />
      <text x="510" y="124" class="small mid">port</text>
      <line
        x1="682"
        y1="150"
        x2="718"
        y2="150"
        class="edge"
        marker-start="url(#arch-arrow)"
        marker-end="url(#arch-arrow)"
      />
      <text x="700" y="124" class="small mid">port</text>

      <!-- node -->
      <rect x="10" y="210" width="280" height="166" rx="10" class="group" />
      <text x="26" y="234" class="glabel">{{ t.node }}</text>
      <rect x="30" y="250" width="240" height="40" rx="6" class="box" />
      <text x="150" y="275" class="label">{{ t.server }}</text>
      <rect x="30" y="318" width="240" height="40" rx="6" class="box accent" />
      <text x="150" y="343" class="label mono">@deffector/agent/node</text>
      <line x1="150" y1="291" x2="150" y2="316" class="edge" marker-end="url(#arch-arrow)" />

      <!-- standalone -->
      <rect x="320" y="210" width="570" height="166" rx="10" class="group" />
      <text x="336" y="234" class="glabel">{{ t.standalone }}</text>
      <rect x="440" y="318" width="190" height="40" rx="6" class="box" />
      <text x="535" y="343" class="label">{{ t.relay }}</text>
      <rect x="700" y="318" width="170" height="40" rx="6" class="box accent" />
      <text x="785" y="343" class="label">{{ t.web }}</text>
      <line
        x1="272"
        y1="338"
        x2="438"
        y2="338"
        class="edge"
        marker-start="url(#arch-arrow)"
        marker-end="url(#arch-arrow)"
      />
      <text x="355" y="312" class="small mid mono">ws /agent</text>
      <line
        x1="632"
        y1="338"
        x2="698"
        y2="338"
        class="edge"
        marker-start="url(#arch-arrow)"
        marker-end="url(#arch-arrow)"
      />
      <text x="665" y="312" class="small mid mono">ws /panel</text>
    </svg>
  </figure>
</template>

<style scoped>
.arch {
  margin: 24px 0;
  overflow-x: auto;
}

.arch svg {
  display: block;
  width: 100%;
  min-width: 640px;
  height: auto;
  font-family: var(--vp-font-family-base);
}

.group {
  fill: var(--vp-c-bg-soft);
  stroke: var(--vp-c-divider);
  stroke-width: 1;
}

.box {
  fill: var(--vp-c-bg);
  stroke: var(--vp-c-border);
  stroke-width: 1;
}

.box.accent {
  stroke: var(--vp-c-brand-1);
  stroke-width: 1.6;
}

.glabel {
  fill: var(--vp-c-text-2);
  font-size: 13px;
  font-weight: 600;
}

.label {
  fill: var(--vp-c-text-1);
  font-size: 13px;
  text-anchor: middle;
}

.small {
  fill: var(--vp-c-text-2);
  font-size: 11.5px;
}

.mid {
  text-anchor: middle;
}

.mono {
  font-family: var(--vp-font-family-mono);
}

.edge {
  stroke: var(--vp-c-text-2);
  stroke-width: 1.4;
}

.head {
  fill: var(--vp-c-text-2);
}
</style>
