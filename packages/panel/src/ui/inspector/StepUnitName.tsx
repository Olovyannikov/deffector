import type { UnitInfo } from '@deffector/protocol';
import { openSource } from '../../store';
import { formatLocation, onActivationKey, useStore } from '../common';

/** The unit of a step; a unit with a known location opens it in Sources. */
export function StepUnitName({ unit, node }: { unit: UnitInfo | undefined; node: string }) {
  const store = useStore();
  const name = unit?.name ?? node;
  const file = unit?.file;
  if (!unit || !file) return <span className="s-u">{name}</span>;
  const open = () => {
    void openSource(store, file, unit.line);
  };
  return (
    <span
      className="s-u src"
      role="link"
      tabIndex={0}
      title={`${formatLocation(file, unit.line)} · ${store.texts.openSource}`}
      onClick={open}
      onKeyDown={onActivationKey(open)}
    >
      {name}
    </span>
  );
}
