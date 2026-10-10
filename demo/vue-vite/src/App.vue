<script setup lang="ts">
import BugsToCatch from './BugsToCatch.vue';
import CounterCard from './CounterCard.vue';
import SignupForm from './SignupForm.vue';
</script>

<template>
  <main>
    <h1>deffector demo <small>Vue</small></h1>
    <div class="grid">
      <SignupForm />
      <div>
        <CounterCard />
        <BugsToCatch />
      </div>
    </div>
  </main>
</template>
