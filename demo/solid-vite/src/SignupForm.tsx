import { createUniqueId, For, Show } from 'solid-js';
import { useUnit } from 'effector-solid';
import * as model from '@deffector-demo/shared';
import { TextField } from './TextField';

export function SignupForm() {
  const termsId = createUniqueId();
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
  return (
    <section class="card">
      <h2>Sign up</h2>
      <TextField label="Email" type="text" field={model.email} testId="email" />
      <Show when={form.suggestions().length}>
        <div class="sugg">
          <For each={form.suggestions()}>
            {(suggestion) => (
              <button type="button" onClick={() => form.emailChanged(suggestion)}>
                {suggestion}
              </button>
            )}
          </For>
        </div>
      </Show>
      <TextField label="Password" type="password" field={model.password} testId="password" />
      <TextField label="Name" type="text" field={model.name} testId="name" />
      <label class="check" for={termsId}>
        <input
          id={termsId}
          type="checkbox"
          data-testid="terms"
          checked={form.terms()}
          onChange={() => form.termsToggled()}
        />{' '}
        I accept the terms
      </label>
      <div class="row">
        <button
          type="button"
          data-testid="submit"
          classList={{ pri: form.canSubmit() }}
          onClick={() => form.submit()}
        >
          {form.submitting() ? 'Sending…' : 'Create account'}
        </button>
        <button type="button" onClick={() => form.reset()}>
          Reset
        </button>
        <span class="muted">
          attempts: {form.attempts()} · initials: {form.initials() || '—'}
        </span>
      </div>
      <Show when={form.serverError()}>
        <p class="err" data-testid="server-error">
          {form.serverError()}
        </p>
      </Show>
      <Show when={form.user()}>
        {(user) => (
          <p class="ok" data-testid="user">
            Welcome, {user().name} ({user().id})
          </p>
        )}
      </Show>
    </section>
  );
}
