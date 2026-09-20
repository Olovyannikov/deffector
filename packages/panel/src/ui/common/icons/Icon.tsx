import { ICON_SHAPES, type IconName } from './iconShapes';

export function Icon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 16 16" className="ic" aria-hidden="true">
      {ICON_SHAPES[name]}
    </svg>
  );
}
