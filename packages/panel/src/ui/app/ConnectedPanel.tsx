import type { HelloInfo } from '@deffector/protocol';
import { useStore } from '../common';
import { FiltersMenu } from '../filters';
import { Palette } from '../palette';
import { TimeBar } from '../time-bar';
import { TabBar } from './TabBar';
import { TabContent } from './TabContent';
import { TimelineBanners } from './TimelineBanners';
import { Toolbar } from './Toolbar';

/** The whole panel once an agent is connected. */
export function ConnectedPanel({ hello, rowHeight }: { hello: HelloInfo; rowHeight: number }) {
  const store = useStore();
  const { ui } = store;
  return (
    <>
      <Toolbar hello={hello} />
      <TabBar />
      <TimelineBanners />
      <TabContent rowHeight={rowHeight} />
      <TimeBar />
      {ui.isPaletteOpen && <Palette />}
      {ui.isFiltersMenuOpen && <FiltersMenu />}
      {store.toastMessage && (
        <div className="toast" role="status">
          {store.toastMessage}
        </div>
      )}
    </>
  );
}
