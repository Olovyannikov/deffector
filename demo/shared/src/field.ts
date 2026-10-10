import {
  createEvent,
  createStore,
  type EventCallable,
  type Store,
  type StoreWritable,
} from 'effector';

export interface FormField<T> {
  changed: EventCallable<T>;
  reset: EventCallable<void>;
  $value: StoreWritable<T>;
  $touched: StoreWritable<boolean>;
  /** `null` when the value is valid */
  $error: Store<string | null>;
}

/** A tiny form field factory: shows up as one group in deffector's Stores tab. */
export function createField<T>(initial: T, validate: (value: T) => string | null): FormField<T> {
  const changed = createEvent<T>();
  const reset = createEvent();
  const $value = createStore<T>(initial)
    .on(changed, (_, value) => value)
    .reset(reset);
  const $touched = createStore(false)
    .on(changed, () => true)
    .reset(reset);
  const $error = $value.map((value) => validate(value));
  return { changed, reset, $value, $touched, $error };
}
