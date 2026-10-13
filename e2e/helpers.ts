import { expect, type Locator, type Page } from '@playwright/test';

/** The parts of an exported trace the tests look at. */
export interface ExportedTrace {
  format: string;
  meta: { focus?: number };
}

/** The test handle the panel puts on `window.__deffectorPanel`. */
export interface PanelWindow {
  __deffectorPanel: {
    store: {
      exportTrace: (focusTxId?: number) => Promise<{ trace: ExportedTrace }>;
      units: Map<string, { id: string; name: string; sid?: string }>;
      /** the agent's last `timeline` message */
      timeline: { liveScopeId: string | null };
    };
  };
}

export async function clickTimes(target: Locator, times: number) {
  for (let i = 0; i < times; i++) await target.click();
}

/** Rows of the panel's current list (Log, Stores…) that mention `text`. */
export const panelRows = (panel: Page, text: string | RegExp) =>
  panel.locator('.row', { hasText: text });

export async function openTab(panel: Page, name: string | RegExp) {
  await panel.getByRole('tab', { name }).click();
}

export async function exportTrace(panel: Page, focusTxId?: number): Promise<ExportedTrace> {
  return panel.evaluate(async (focus) => {
    const { store } = (window as unknown as PanelWindow).__deffectorPanel;
    return (await store.exportTrace(focus)).trace;
  }, focusTxId);
}

/** Pastes a trace into Traces and checks it against the app, ready to replay. */
export async function importTrace(panel: Page, trace: ExportedTrace) {
  await openTab(panel, 'Traces');
  await panel.getByLabel('trace to import').fill(JSON.stringify(trace));
  await panel.getByRole('button', { name: 'Check compatibility' }).click();
}

export async function replayTraceInstantly(panel: Page, trace: ExportedTrace) {
  await importTrace(panel, trace);
  await panel.getByRole('button', { name: 'Apply instantly' }).click();
}

export async function findUnitSid(panel: Page, unitName: string): Promise<string | undefined> {
  return panel.evaluate((name) => {
    const { store } = (window as unknown as PanelWindow).__deffectorPanel;
    return [...store.units.values()].find((unit) => unit.name === name)?.sid;
  }, unitName);
}

/** The scope the panel treats as the app's present ('global' when it knows of none). */
export async function readLiveScopeId(panel: Page): Promise<string> {
  return panel.evaluate(() => {
    const { store } = (window as unknown as PanelWindow).__deffectorPanel;
    return store.timeline.liveScopeId ?? 'global';
  });
}

/** Fills the demo's sign-up form so that it can be submitted. */
export async function fillSignupForm(
  app: Page,
  user: { email: string; password: string; name: string },
) {
  await app.getByTestId('email').fill(user.email);
  await app.getByTestId('password').fill(user.password);
  await app.getByTestId('name').fill(user.name);
  await app.getByTestId('terms').check();
}

/** Opens Health and returns its list. */
export async function openHealth(panel: Page) {
  await openTab(panel, /Health/);
  return panel.locator('.hl');
}

/** Selects an effect in Effects → Override effects and picks how its next calls behave. */
export async function overrideEffect(panel: Page, effectName: string, mode: string) {
  await openTab(panel, 'Effects');
  await panel.locator('summary', { hasText: 'Override effects' }).click();
  const selects = panel.locator('details.fxo select');
  await selects.first().selectOption({ label: effectName });
  await selects.nth(1).selectOption(mode);
}

/** Saves the current Log filter under `name` in the Saved filters popover (left open). */
export async function saveLogFilter(panel: Page, pattern: string, name: string) {
  await panel.getByPlaceholder('Filter by name (regex)').fill(pattern);
  await panel.getByRole('button', { name: 'Saved filters' }).click();
  await panel.getByPlaceholder('Name', { exact: true }).fill(name);
  await panel.getByRole('button', { name: 'Save current filter' }).click();
}

export async function openCommandPalette(panel: Page) {
  // the shortcut is handled by the panel document: focus it first
  await panel.locator('.tb').click({ position: { x: 300, y: 5 } });
  await panel.keyboard.press('Control+k');
}

export { expect };
