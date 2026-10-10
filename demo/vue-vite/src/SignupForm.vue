<script setup lang="ts">
import { useUnit } from 'effector-vue/composition';
import * as model from '@deffector-demo/shared';
import TextField from './TextField.vue';

const form = useUnit({
  terms: model.$terms,
  termsToggled: model.termsToggled,
  submit: model.submitPressed,
  reset: model.formReset,
  canSubmit: model.$canSubmit,
  submitting: model.$submitting,
  user: model.$user,
  serverError: model.$serverError,
  attempts: model.$attempts,
  suggestions: model.$suggestions,
  emailChanged: model.email.changed,
  initials: model.$nameInitials,
});
</script>

<template>
  <section class="card">
    <h2>Sign up</h2>
    <TextField label="Email" type="text" :field="model.email" test-id="email" />
    <div v-if="form.suggestions.value.length" class="sugg">
      <button
        v-for="suggestion in form.suggestions.value"
        :key="suggestion"
        type="button"
        @click="form.emailChanged(suggestion)"
      >
        {{ suggestion }}
      </button>
    </div>
    <TextField label="Password" type="password" :field="model.password" test-id="password" />
    <TextField label="Name" type="text" :field="model.name" test-id="name" />
    <label class="check"
      ><input
        type="checkbox"
        data-testid="terms"
        :checked="form.terms.value"
        @change="form.termsToggled()"
      />
      I accept the terms</label
    >
    <div class="row">
      <button
        type="button"
        data-testid="submit"
        :class="{ pri: form.canSubmit.value }"
        @click="form.submit()"
      >
        {{ form.submitting.value ? 'Sending…' : 'Create account' }}
      </button>
      <button type="button" @click="form.reset()">Reset</button>
      <span class="muted"
        >attempts: {{ form.attempts.value }} · initials: {{ form.initials.value || '—' }}</span
      >
    </div>
    <p v-if="form.serverError.value" class="err" data-testid="server-error">
      {{ form.serverError.value }}
    </p>
    <p v-if="form.user.value" class="ok" data-testid="user">
      Welcome, {{ form.user.value.name }} ({{ form.user.value.id }})
    </p>
  </section>
</template>
