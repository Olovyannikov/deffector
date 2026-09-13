import type { Encoded } from '@deffector/protocol';
import { appStorageKey, readStoredList, writeStoredList } from './persistence';
import type { PanelStore } from './PanelStore';

/** Values of the writable stores saved under a name, to bring the app back to that state in one click. */
export interface Preset {
  name: string;
  values: Record<string, Encoded>;
}

export class PresetLibrary {
  items: Preset[] = [];

  constructor(private readonly store: PanelStore) {}

  private get storageKey() {
    return appStorageKey('presets', this.store.hello?.app.name);
  }

  load() {
    this.items = readStoredList<Preset>(this.storageKey);
  }

  /** A preset with the same name is replaced. */
  save(name: string, values: Record<string, Encoded>) {
    this.items = [...this.items.filter((preset) => preset.name !== name), { name, values }];
    writeStoredList(this.storageKey, this.items);
    this.store.emit();
  }

  remove(name: string) {
    this.items = this.items.filter((preset) => preset.name !== name);
    writeStoredList(this.storageKey, this.items);
    this.store.emit();
  }

  async apply(preset: Preset) {
    await this.store.request((requestId) => ({
      type: 'edit-many',
      requestId,
      scopeId: this.store.viewScopeId,
      values: preset.values,
      label: `✎ preset “${preset.name}”`,
    }));
    this.store.scopeState.refresh();
  }
}
