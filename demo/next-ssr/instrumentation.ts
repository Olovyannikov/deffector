// Server side: every request's scope goes to the standalone app (npm run standalone).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { attachDeffectorNode } = await import('@deffector/agent/node');
    attachDeffectorNode({ name: 'next-ssr (server)', maxTransactions: 2000 });
  }
}
