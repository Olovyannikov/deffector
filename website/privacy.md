---
outline: false
---

# Privacy policy

_Last updated: October 17, 2026_

deffector is a developer tool for apps built with effector: the browser extension “deffector — effector
DevTools”, the npm packages `@deffector/agent` and `@deffector/standalone`, and this documentation site.

## The extension collects nothing

The extension does not collect, store on a server, sell or share any personal or browsing data. It
makes no network requests of its own and contains no analytics, ads or trackers.

What it does on your computer:

- **On every page** a small content script checks whether the page runs the deffector agent (the
  `@deffector/agent` package, which a developer adds to their own app). On pages without it, the
  script does nothing else.
- **On pages with the agent** it passes messages between the agent and the deffector panel in Chrome
  DevTools: the app's events, store values and effect calls, shown so the developer can debug them.
  These messages stay inside your browser and are kept only in memory while DevTools is open.
- **Panel settings** (language, filters, presets) are saved in the extension's local storage on your
  computer.
- **Traces** are exported only when you press the export button, as a file you download or copy. Values
  that look like secrets (passwords, tokens) are masked in them.

## The standalone app

`@deffector/standalone` runs on your computer and by default accepts connections only from it
(127.0.0.1). It relays messages between your app and the panel and stores nothing.

## This site

The site is hosted on GitHub Pages, which may log visits as described in
[GitHub's privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).
To show the number of stars, the site asks the public GitHub API for the repository's star count; it
sets no cookies.

## Contact

Questions about this policy:
[GitHub issues](https://github.com/mxmvshnvsk/deffector/issues).
