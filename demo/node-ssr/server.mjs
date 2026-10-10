// 1. npm run standalone            (panel on http://localhost:8686)
// 2. npm run dev -w @deffector-demo/node-ssr   (this server on http://localhost:5176)
// Every request forks its own scope ("request #N"); deffector shows them all.
import { attachDeffectorNode, registerScope } from '@deffector/agent/node';
import { createServer } from 'node:http';
import { allSettled, fork, serialize } from 'effector';
import * as model from '@deffector-demo/shared';

attachDeffectorNode({
  name: 'node-ssr demo',
  maxTransactions: 2000,
  onStatus: (status) => console.log(`[deffector] standalone ${status}`),
});

// a long-lived server scope: counters shared between requests
const serverScope = fork();
registerScope(serverScope, { name: 'server' });

const HTML_ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const escapeHtml = (value) => String(value).replace(/[&<>"]/g, (char) => HTML_ENTITIES[char]);

let requestCount = 0;

/** Signs up a user in a fresh scope, the way an SSR page fills its data before rendering. */
async function signUpInNewScope(url) {
  requestCount += 1;
  const scope = fork();
  registerScope(scope, { name: `request #${requestCount} ${url.pathname}${url.search}` });
  const email = url.searchParams.get('email') || 'guest@example.com';
  const name = url.searchParams.get('name') || 'Guest';
  await allSettled(model.email.changed, { scope, params: email });
  await allSettled(model.name.changed, { scope, params: name });
  await allSettled(model.password.changed, { scope, params: 'server-side-secret' });
  await allSettled(model.termsToggled, { scope });
  await allSettled(model.submitPressed, { scope });
  return scope;
}

function renderPage(scope) {
  const user = scope.getState(model.$user);
  const signupResult = user
    ? `Signed up: <b>${escapeHtml(user.name)}</b> (${escapeHtml(user.id)})`
    : `Error: <b>${escapeHtml(scope.getState(model.$serverError))}</b>`;
  const values = serialize(scope);
  return `<!doctype html><meta charset="utf-8"><title>deffector · node-ssr</title>
<style>body{font:14px system-ui;max-width:640px;margin:32px auto;padding:0 16px}pre{background:#f1f3f4;padding:8px;border-radius:6px;overflow:auto}</style>
<h1>node-ssr demo</h1>
<p>Rendered for request #${requestCount}. ${signupResult}</p>
<p>Server counter: <b>${serverScope.getState(model.$count)}</b> · <a href="/inc">increment</a></p>
<p>Try <a href="/?email=taken@example.com">an email that is taken</a> or <a href="/?email=ann@example.com&name=Ann">another user</a>.</p>
<p>Open <a href="http://localhost:8686">http://localhost:8686</a> to inspect the scopes of every request.</p>
<h3>serialize(scope)</h3><pre>${escapeHtml(JSON.stringify(values, null, 2))}</pre>`;
}

async function handleRequest(request, response) {
  const url = new URL(request.url, 'http://localhost');
  if (url.pathname === '/favicon.ico') {
    response.writeHead(404).end();
    return;
  }
  if (url.pathname === '/inc') {
    await allSettled(model.incremented, { scope: serverScope });
    response.writeHead(302, { location: '/' }).end();
    return;
  }
  const scope = await signUpInNewScope(url);
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(renderPage(scope));
}

createServer(handleRequest).listen(5176, () =>
  console.log('node-ssr demo on http://localhost:5176'),
);
