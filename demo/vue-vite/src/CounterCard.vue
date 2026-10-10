<script setup lang="ts">
import { useUnit } from 'effector-vue/composition';
import * as model from '@deffector-demo/shared';

const { count, isEven, increment, decrement } = useUnit({
  count: model.$count,
  isEven: model.$isEven,
  increment: model.incremented,
  decrement: model.decremented,
});
</script>

<template>
  <section class="card">
    <h2>Counter</h2>
    <div class="row">
      <button type="button" data-testid="dec" @click="decrement()">−</button>
      <b data-testid="count" class="count">{{ count }}</b>
      <button type="button" data-testid="inc" @click="increment()">+</button>
      <span class="muted">{{ isEven ? 'even' : 'odd' }}</span>
    </div>
  </section>
</template>
