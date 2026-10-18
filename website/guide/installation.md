# Installation

deffector has two halves: the **agent**, a package your app imports, and a **panel** — the browser
extension or the standalone app.

## Requirements

| What                       | Minimum                                                                                                                                                | Tested with                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| effector                   | 22.6                                                                                                                                                   | 23.4.4, 22.8.6                                              |
| React                      | React 16.8 with effector-react 22                                                                                                                      | React 16.8, 16.14, 17.0, 19.3; effector-react 22.5, 23.3    |
| Vue                        | Vue 3.0 with effector-vue 22                                                                                                                           | Vue 3.0, 3.2, 3.3, 3.5; effector-vue 22.2, 23.0, 23.2       |
| Solid                      | solid-js 1.3 with effector-solid 0.22                                                                                                                  | solid-js 1.3, 1.4, 1.5, 1.6, 1.9; effector-solid 0.22, 0.23 |
| Next.js                    | 13.4 (App Router, `@effector/next`)                                                                                                                    | 15.5                                                        |
| Browser with the extension | Chrome or Edge 116, Firefox 140 (Firefox for Android 142)                                                                                              | latest Chrome                                               |
| Standalone app             | Node 18                                                                                                                                                | Node 22                                                     |
| Agent in a Node process    | Node 22 (global `WebSocket`); older: pass `WebSocket` from `ws`                                                                                        | Node 22                                                     |
| React Native               | any version (it has a global `WebSocket`)                                                                                                              | —                                                           |
| TypeScript                 | 5.0 with `moduleResolution` `"bundler"`, `"node16"` or `"nodenext"`                                                                                    | 5.9                                                         |
| Bundler                    | one that reads the `exports` field: Vite, webpack 5, Next.js, esbuild, Rollup; Parcel 2 with `packageExports` (see [Parcel](/guide/frameworks#parcel)) | Vite 7, Next.js 15, Parcel 2.9                              |
| Building from source       | Node 22                                                                                                                                                | Node 22                                                     |

The framework adapters are optional: plain effector needs only `effector`. Vue 2 has no adapter
(effector-vue supports scopes only on Vue 3), but its apps work in [global mode](/guide/frameworks#global-mode-without-fork). The babel/swc plugin is
optional too; without it the panel shows less — see
[Without the babel/swc plugin](/guide/frameworks#without-the-babel-swc-plugin).

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

**Firefox 140+:** download `deffector-firefox-<version>.xpi` from
[GitHub Releases](https://github.com/mxmvshnvsk/deffector/releases), then open `about:addons` → ⚙ → **Install Add-on From File…** (or drag the
file onto a Firefox window). The file is signed by Mozilla, so the add-on stays after a restart; to
update it, install the newer file the same way.

**Chrome or Edge without the store:** the same releases have `deffector-chrome-<version>.zip`. Unzip it
and load the folder as described below (**Load unpacked**).

**The latest code from the repository:** build it from source and load it unpacked.

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
3. Click **Load unpacked** and select `packages/extension/dist` (or the folder unzipped from a release).

### Edge

1. Open `edge://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select `packages/extension/dist` (or the folder unzipped from a release).

### Firefox from source

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
