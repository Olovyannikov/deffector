<script setup>
import { withBase } from 'vitepress';

// A panel screenshot in the theme of the page: dark-<name>.png or light-<name>.png
defineProps({
  name: { type: String, required: true },
  alt: { type: String, required: true },
});
</script>

<template>
  <figure class="shot">
    <img class="shot-dark" :src="withBase(`/screens/dark-${name}.png`)" :alt="alt" loading="lazy" />
    <img
      class="shot-light"
      :src="withBase(`/screens/light-${name}.png`)"
      :alt="alt"
      loading="lazy"
    />
    <figcaption v-if="$slots.default"><slot /></figcaption>
  </figure>
</template>
