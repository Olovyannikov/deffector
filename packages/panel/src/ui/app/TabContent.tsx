import { EffectsView } from '../effects';
import { GraphView } from '../graph';
import { HealthView } from '../health';
import { Inspector } from '../inspector';
import { LogView } from '../log';
import { StoresView } from '../stores';
import { TracesView } from '../traces';
import { useStore } from '../common';

export function TabContent({ rowHeight }: { rowHeight: number }) {
  const { tab } = useStore().ui;
  return (
    <div className="body">
      {tab === 'log' && (
        <div className="split">
          <LogView rowHeight={rowHeight} />
          <div className="insp">
            <Inspector />
          </div>
        </div>
      )}
      {tab === 'stores' && <StoresView />}
      {tab === 'effects' && <EffectsView />}
      {tab === 'graph' && <GraphView />}
      {tab === 'traces' && <TracesView />}
      {tab === 'health' && <HealthView />}
    </div>
  );
}
