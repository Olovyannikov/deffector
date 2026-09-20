import type { ReactNode } from 'react';

export type IconName =
  'clear' | 'export' | 'import' | 'first' | 'back' | 'forward' | 'filter' | 'search';

/** Strokes of the toolbar icons on a 16×16 grid. */
export const ICON_SHAPES: Record<IconName, ReactNode> = {
  clear: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M4.2 11.8l7.6-7.6" />
    </>
  ),
  export: <path d="M8 10V2M5 5l3-3 3 3M3 10v3h10v-3" />,
  import: <path d="M8 2v8M5 7l3 3 3-3M3 10v3h10v-3" />,
  first: <path d="M4 3v10M12 3L6 8l6 5" />,
  back: <path d="M10 3L5 8l5 5" />,
  forward: <path d="M6 3l5 5-5 5" />,
  filter: <path d="M2.5 3.5h11l-4.2 5v4l-2.6 1.2V8.5z" />,
  search: (
    <>
      <circle cx="7" cy="7" r="4.2" />
      <path d="M10.2 10.2l3.3 3.3" />
    </>
  ),
};
