/**
 * Where the content script runs. localhost is listed in the manifest and works right after install;
 * any other origin is an optional host permission the user grants from the DevTools panel or the
 * toolbar popup. Granted origins get the same content script through a dynamic registration, and the
 * pages already open there get it injected at once.
 */
import { originPattern } from './originPattern';

const GRANTED_SCRIPT_ID = 'deffector-granted-sites';
const CONTENT_SCRIPT_FILE = 'content.js';

function builtInMatches(): Set<string> {
  const scripts = chrome.runtime.getManifest().content_scripts ?? [];
  return new Set(scripts.flatMap((script) => script.matches ?? []));
}

/** Keeps the dynamic content script in step with the granted optional host permissions. */
export async function syncGrantedSites(): Promise<void> {
  const { origins = [] } = await chrome.permissions.getAll();
  const builtIn = builtInMatches();
  const granted = origins.filter((origin) => !builtIn.has(origin));
  const registered = await chrome.scripting.getRegisteredContentScripts({
    ids: [GRANTED_SCRIPT_ID],
  });
  if (granted.length === 0) {
    if (registered.length > 0) {
      await chrome.scripting.unregisterContentScripts({ ids: [GRANTED_SCRIPT_ID] });
    }
    return;
  }
  const script: chrome.scripting.RegisteredContentScript = {
    id: GRANTED_SCRIPT_ID,
    matches: granted,
    js: [CONTENT_SCRIPT_FILE],
    runAt: 'document_start',
    allFrames: false,
  };
  if (registered.length > 0) await chrome.scripting.updateContentScripts([script]);
  else await chrome.scripting.registerContentScripts([script]);
}

export async function hasSiteAccess(origin: string): Promise<boolean> {
  const pattern = originPattern(origin);
  return pattern ? chrome.permissions.contains({ origins: [pattern] }) : false;
}

/** A small window with the "Allow" button: DevTools panels cannot call chrome.permissions. */
export async function openAccessRequest(origin: string): Promise<void> {
  const url = chrome.runtime.getURL(`grant.html?origin=${encodeURIComponent(origin)}`);
  await chrome.windows.create({ url, type: 'popup', width: 460, height: 280 });
}

/** Runs the content script in the open tabs of newly granted origins; returns those tab ids. */
export async function injectIntoOpenTabs(origins: string[]): Promise<number[]> {
  if (origins.length === 0) return [];
  const tabs = await chrome.tabs.query({ url: origins });
  const results = await Promise.all(
    tabs.map(async ({ id: tabId }) => {
      if (tabId === undefined) return undefined;
      try {
        await chrome.scripting.executeScript({ target: { tabId }, files: [CONTENT_SCRIPT_FILE] });
        return tabId;
      } catch {
        // a tab that cannot be scripted (an error page, the Web Store): nothing to debug there
        return undefined;
      }
    }),
  );
  const injected = results.filter((tabId): tabId is number => tabId !== undefined);
  return injected;
}
