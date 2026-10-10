import type { StandaloneTransport } from './webSocketTransport';

/** An agent connected to the relay, as /targets.json lists it. */
interface Target {
  id: string;
  name: string;
  url: string;
  effector: string;
  since: number;
  panels: number;
}

const REFRESH_INTERVAL_MS = 2000;

function getElement<ElementType extends HTMLElement>(id: string): ElementType {
  const element = document.getElementById(id);
  if (!element) throw new Error(`index.html has no #${id} element`);
  return element as ElementType;
}

function describeTarget(target: Target): string {
  return `${target.name} · effector ${target.effector}${target.url ? ` · ${target.url}` : ''}`;
}

function createOption(value: string, label: string): HTMLOptionElement {
  const option = document.createElement('option');
  option.value = value;
  // names and urls come from the agents: text nodes only
  option.textContent = label;
  return option;
}

/**
 * The header's agent selector: polls the relay for connected agents and switches the panel
 * between them.
 */
export function mountAgentSelector(transport: StandaloneTransport, isRussian: boolean): void {
  const select = getElement<HTMLSelectElement>('target');
  select.addEventListener('change', () => transport.select(select.value));
  getElement('target-label').textContent = isRussian ? 'Агент' : 'Agent';
  const autoLabel = isRussian ? 'авто: последний подключившийся' : 'auto: the newest one';

  const refresh = async () => {
    try {
      const response = await fetch('/targets.json', { cache: 'no-store' });
      const targets: Target[] = await response.json();
      const options: [string, string][] = [
        ['auto', autoLabel],
        ...targets.map((target): [string, string] => [target.id, describeTarget(target)]),
      ];
      // rebuild only when the list changed, so an open dropdown is not reset every poll
      const optionsKey = JSON.stringify(options);
      if (select.dataset.key !== optionsKey) {
        select.replaceChildren(...options.map(([value, label]) => createOption(value, label)));
        select.dataset.key = optionsKey;
      }
      const selectedAgentId = transport.getSelectedAgentId();
      select.value = targets.some((target) => target.id === selectedAgentId)
        ? selectedAgentId
        : 'auto';
      getElement('count').textContent = String(targets.length);
    } catch {
      /* server restarting */
    }
  };
  refresh();
  setInterval(refresh, REFRESH_INTERVAL_MS);
}
