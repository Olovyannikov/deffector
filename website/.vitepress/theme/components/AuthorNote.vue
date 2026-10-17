<script setup>
import { computed } from 'vue';
import { useData } from 'vitepress';
import { AUTHOR, REPOSITORY_URL } from '../project.mjs';

// The credit line at the end of every guide page
const { lang } = useData();
const isRussian = computed(() => lang.value.startsWith('ru'));
</script>

<template>
  <aside class="author-note">
    <template v-if="isRussian">
      deffector делает
      <a :href="AUTHOR.url" target="_blank" rel="noopener">{{ AUTHOR.name }}</a
      >. Если он экономит вам время, поставьте
      <a :href="REPOSITORY_URL" target="_blank" rel="noopener">звезду на GitHub</a>
      — так о проекте узнает больше людей.
    </template>
    <template v-else>
      deffector is made by
      <a :href="AUTHOR.url" target="_blank" rel="noopener">{{ AUTHOR.name }}</a
      >. If it saves you time,
      <a :href="REPOSITORY_URL" target="_blank" rel="noopener">star it on GitHub</a>
      — it helps others find it.
    </template>
  </aside>
</template>

<style scoped>
.author-note {
  margin-top: 48px;
  border-top: 1px solid var(--vp-c-divider);
  padding-top: 20px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

.author-note a {
  font-weight: 500;
  color: var(--vp-c-brand-1);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.author-note a:hover {
  color: var(--vp-c-brand-2);
}
</style>
