/** @type {import('next').NextConfig} */
export default {
  // one effector instance on the server: the agent hooks into the effector the app uses
  serverExternalPackages: ['effector', '@deffector-demo/shared'],
};
