# Contributing

deffector is an npm workspaces monorepo. Everything runs from the repository root.

```sh
git clone https://github.com/mxmvshnvsk/deffector.git
cd deffector
npm install
npm run build
```

## Repository layout

| Path                  | What is there                                                                                                                                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/protocol`   | message types, the `$t`-tagged value encoding, the trace format and the compatibility check                                                                                                                                |
| `packages/agent`      | runs in the page: hooks `setInspector` / `setGraphInspector`, groups steps into transactions, keeps snapshots, time travel, edits, replay, effect overrides, health checks; adapters for React, Vue, Solid; the Node entry |
| `packages/panel`      | the UI (React), shared by the extension and the standalone app; `src/i18n.ts` holds every text in English and Russian                                                                                                      |
| `packages/extension`  | the MV3 extension for Chrome/Edge (`dist/`) and Firefox (`dist-firefox/`): content script ⇄ background ⇄ DevTools panel                                                                                                    |
| `packages/standalone` | `npx @deffector/standalone`: serves the panel and relays agents over WebSocket                                                                                                                                             |
| `demo/*`              | one effector model (`demo/shared`) in React, Vue, Solid, Next.js, Node SSR, global mode and without the plugin; `demo/lab` for big graphs and edge cases                                                                   |
| `e2e`                 | Playwright tests that load the extension and drive every demo                                                                                                                                                              |
| `assets/brand`        | the logo, icons and social preview                                                                                                                                                                                         |
| `website`             | this documentation (VitePress)                                                                                                                                                                                             |

## Scripts

| Command                                 | What it does                                                                                        |
| --------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `npm run build`                         | agent, demo model, extension (Chrome and Firefox), standalone                                       |
| `npm run watch -w @deffector/extension` | rebuilds the extension on change                                                                    |
| `npm test`                              | unit tests (vitest), `packages/*/test`                                                              |
| `npx playwright install chromium`       | once, before the first e2e run                                                                      |
| `npm run e2e`                           | Playwright: starts the demos, loads the extension and drives every demo (run `npm run build` first) |
| `npm run lint`                          | ESLint (Airbnb rules for TypeScript, React, Vue) and `prettier --check`                             |
| `npm run lint:fix`                      | ESLint with `--fix`, then `prettier --write`                                                        |
| `npm run format`                        | `prettier --write .`                                                                                |
| `npm run typecheck`                     | `tsc --noEmit` for the main and the Solid projects                                                  |
| `npm run dev:react` … `npm run dev:lab` | the [demos](/reference/demos)                                                                       |
| `npm run standalone`                    | the standalone app on http://localhost:8686                                                         |
| `npm run docs:dev`                      | this site with hot reload                                                                           |
| `npm run docs:build`                    | builds this site into `website/.vitepress/dist`                                                     |

Two opt-in Playwright runs produce material rather than check behaviour:

```sh
PERF=perf.json npx playwright test e2e/perf.spec.ts     # overhead numbers, see Performance
SHOTS=shots npx playwright test e2e/screens.spec.ts     # panel screenshots in both themes
```

And one vitest config checks the agent against an effector build with the
[upstream changes](/reference/upstream):

```sh
EFFECTOR_DIST=/path/to/effector/npm/effector npx vitest run -c vitest.upstream.config.ts
```

## Working on the panel

The panel is plain React with its own small store (`packages/panel/src/store.ts`). Every user-visible
string lives in `packages/panel/src/i18n.ts` (and the agent's own texts — Health items, notes — in
`packages/agent/src/i18n.ts`); add both languages. The extension and the standalone app mount the same
panel, so check both: `npm run build`, reload the extension, and `npm run standalone`.

## Working on these docs

```sh
npm run docs:dev        # prints the address, e.g. http://localhost:5173/deffector/
```

Pages are Markdown in `website/` — English at the root, Russian under `website/ru/` with the same
file names. Keep the two in step. Screenshots live in `website/public/screens/` (`dark-*` and
`light-*` pairs switch with the site theme). The site is deployed to GitHub Pages by `.github/workflows/docs.yml`
(Settings → Pages → Source: GitHub Actions; for a custom domain set the `DOCS_BASE` variable to `/`).
