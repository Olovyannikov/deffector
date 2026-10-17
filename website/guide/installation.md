# Installation

deffector has two halves: the **agent**, a package your app imports, and a **panel** — the browser
extension or the standalone app. Requirements: effector 22.6 or newer, Chrome or Edge 116+, Firefox
140+, Node 22 for building from source.

## The agent

```sh
npm install @deffector/agent
```

Keep it a regular dependency: application code imports it, and in production builds it resolves to
a no-op (see [Production builds](#production-builds)). Framework adapters are optional peer
dependencies — install only the ones you use (`effector-react`, `effector-vue`, `effector-solid`).

Then follow the [Quick start](/guide/quick-start).

## The browser extension

**Chrome and Edge:** install deffector from the
[Chrome Web Store](https://chromewebstore.google.com/detail/cnnimkkficcbbkaohlafpnbgpkhpkfjn). Edge installs it from there too
(allow extensions from other stores when Edge asks).

**Firefox,** or the latest code from the repository: build it from source and load it unpacked.

```sh
git clone https://github.com/mxmvshnvsk/deffector.git
cd deffector
npm install
npm run build   # agent, demo model, extension (Chrome + Firefox), standalone
```

The build writes two folders:

- `packages/extension/dist` — Chrome and Edge (Manifest V3, Chrome 116+);
- `packages/extension/dist-firefox` — Firefox (Manifest V3 with background scripts, Firefox 140+).

### Chrome

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select `packages/extension/dist`.

### Edge

1. Open `edge://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select `packages/extension/dist`.

### Firefox

1. Open `about:debugging`.
2. Choose **This Firefox**.
3. Click **Load Temporary Add-on** and select `packages/extension/dist-firefox/manifest.json`.

Firefox removes temporary add-ons when it restarts; load it again after a restart.

### Check that it works

Open a page of your app that imports the agent. The toolbar icon turns from grey to coloured, and its
popup says “effector _version_ detected” and how many stores have a `sid`. Open DevTools: the
**deffector** tab is next to Elements, Console and the others. The panel follows the DevTools theme
(dark or light) and the browser language (English or Russian; the **RU** / **EN** button in the
toolbar switches it).

On a page without an agent the popup says “No deffector agent on this page” and shows the import to
add.

### Sites other than localhost

On `localhost` and `127.0.0.1` (any port) the extension works right after installation. On any other
address — a staging server, a preview deployment, a local domain — Chrome lets it in only after you
allow that site once: the panel shows “deffector has no access to _host_” with an **Allow on this
site** button (the toolbar popup offers the same). The extension then connects to the open page and to
every page of that site from then on. Allowed sites are listed in `chrome://extensions` → deffector →
**Details** → **Site access**, where you can also remove them.

### Rebuilding

After `npm run build`, press ↻ on the extension card in `chrome://extensions` and reopen DevTools.
While you work on the extension itself, rebuild on change:

```sh
npm run watch -w @deffector/extension
```

## The standalone app

For SSR servers, Node scripts, tests and React Native:

```sh
npx @deffector/standalone              # panel on http://localhost:8686
```

From a clone of the repository: `npm run standalone`. See
[Node, SSR, React Native](/guide/node-ssr).

## Production builds

Every entry point of `@deffector/agent` has a `production` export condition that points to a no-op
with the same API: `import '@deffector/agent'` does nothing, `DeffectorProvider` is the plain
effector `Provider`, `attachDeffector` and `registerScope` return empty handles. Bundlers pick that
condition in production mode (Vite and webpack do), so the import can stay in your code.

The Node entry (`@deffector/agent/node`) also does nothing when `NODE_ENV=production`, unless you pass
`skipInProduction: false`.
