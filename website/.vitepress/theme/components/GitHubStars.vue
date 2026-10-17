<script setup>
import { computed, onMounted, ref } from 'vue';
import { useData } from 'vitepress';
import { REPOSITORY, REPOSITORY_URL } from '../project.mjs';

// "Star" pill in the navigation bar with the live star count (hidden while it is 0)

const CACHE_KEY = `github-stars:${REPOSITORY}`;
const CACHE_TTL_MS = 60 * 60 * 1000;

const { lang } = useData();
const stars = ref(null);
const label = computed(() =>
  lang.value.startsWith('ru') ? 'Поставить звезду на GitHub' : 'Star on GitHub',
);
const formattedStars = computed(() =>
  stars.value === null
    ? ''
    : new Intl.NumberFormat(lang.value, { notation: 'compact' }).format(stars.value),
);

function readCache() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? 'null');
    return cached && Date.now() - cached.savedAt < CACHE_TTL_MS ? cached.stars : null;
  } catch {
    return null;
  }
}

function writeCache(count) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ stars: count, savedAt: Date.now() }));
  } catch {
    // storage can be unavailable (private mode); the count is only a nicety
  }
}

onMounted(async () => {
  stars.value = readCache();
  if (stars.value !== null) return;
  try {
    // unauthenticated GitHub API: 60 requests an hour per visitor, hence the cache
    const response = await fetch(`https://api.github.com/repos/${REPOSITORY}`);
    if (!response.ok) return;
    const { stargazers_count: count } = await response.json();
    stars.value = count;
    writeCache(count);
  } catch {
    // offline or rate limited: the button works without the count
  }
});
</script>

<template>
  <a
    class="github-stars"
    :href="REPOSITORY_URL"
    target="_blank"
    rel="noopener"
    :aria-label="stars ? `${label} (${stars})` : label"
  >
    <svg class="star" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 .25a.75.75 0 0 1 .67.42l1.88 3.8 4.2.61a.75.75 0 0 1 .41 1.28l-3.04 2.96.72 4.18a.75.75 0 0 1-1.09.79L8 12.32l-3.75 1.97a.75.75 0 0 1-1.09-.79l.72-4.18L.84 6.36a.75.75 0 0 1 .41-1.28l4.2-.61L7.33.67A.75.75 0 0 1 8 .25Z"
      />
    </svg>
    <span class="text">Star</span>
    <span v-if="stars" class="count">{{ formattedStars }}</span>
  </a>
</template>

<style scoped>
.github-stars {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 12px;
  border: 1px solid var(--vp-button-alt-border);
  border-radius: 20px;
  padding: 0 10px;
  line-height: 28px;
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-button-alt-text);
  background-color: var(--vp-button-alt-bg);
  transition:
    border-color 0.25s,
    background-color 0.25s;
}

.github-stars:hover {
  border-color: var(--vp-button-alt-hover-border);
  background-color: var(--vp-button-alt-hover-bg);
}

.star {
  color: #e3b341;
}

.count {
  border-left: 1px solid var(--vp-c-divider);
  padding-left: 6px;
  font-variant-numeric: tabular-nums;
}

/* no room in the navigation bar on phones: the GitHub icon stays */
@media (max-width: 767px) {
  .github-stars {
    display: none;
  }
}
</style>
