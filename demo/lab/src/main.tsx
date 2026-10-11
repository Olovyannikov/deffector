// The agent must be attached before the model creates its units, so everything
// after it is imported dynamically. ?noagent — the same page without deffector,
// to measure its overhead; ?grace=<ms> — how long the agent records with no panel.
async function main() {
  const params = new URLSearchParams(window.location.search);
  const withAgent = !params.has('noagent');
  if (withAgent) {
    const { attachDeffector } = await import('@deffector/agent');
    if (params.has('grace')) attachDeffector({ graceMs: Number(params.get('grace')) });
  }
  const { start } = await import('./start');
  await start(withAgent);
}

void main();
