import { allSettled, fork, serialize } from 'effector';
import { EffectorNext } from '@effector/next';
import * as model from '@deffector-demo/shared';
import { registerScope } from '@deffector/agent/node';
import { App } from '../components/App';
import { Bridge } from '../components/Bridge';

export const dynamic = 'force-dynamic';

let requestCount = 0;
const nextRequestName = () => {
  requestCount += 1;
  return `request #${requestCount}`;
};

export default async function Page() {
  // server: a scope per request, filled before render and serialized for the client
  const scope = fork();
  registerScope(scope, { name: nextRequestName() });
  await allSettled(model.email.changed, { scope, params: 'ssr@example.com' });
  await allSettled(model.incremented, { scope });
  await allSettled(model.incremented, { scope });
  return (
    <EffectorNext values={serialize(scope)}>
      <Bridge>
        <App />
      </Bridge>
    </EffectorNext>
  );
}
