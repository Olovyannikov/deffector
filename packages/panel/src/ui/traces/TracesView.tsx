import { useStore } from '../common';
import { ExportCard } from './ExportCard';
import { ImportCard } from './ImportCard';
import { TestCard } from './TestCard';

export function TracesView() {
  const { exported } = useStore();
  const json = exported ? JSON.stringify(exported.trace, null, 2) : '';
  return (
    <div className="trw">
      <ExportCard json={json} />
      <ImportCard />
      {exported && <TestCard test={exported.test} />}
    </div>
  );
}
