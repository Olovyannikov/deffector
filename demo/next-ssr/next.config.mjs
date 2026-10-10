/** @type {import('next').NextConfig} */
export default {
  // the browser agent is shipped as TypeScript sources in this monorepo
  transpilePackages: ['@deffector/agent', '@deffector/protocol'],
  // one effector instance on the server: the agent hooks into the effector the app uses
  serverExternalPackages: ['effector', '@deffector-demo/shared'],
};
