/** How long the object URL of a download lives: the browser has started the download by then. */
const REVOKE_DELAY_MS = 1000;

export function downloadJson(fileName: string, json: string) {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}

/** `my-app-2025-01-31-12-00-00.deffector.json`: the app name made file-safe, and the time. */
export function traceFileName(appName: string | undefined): string {
  const safeName = (appName || 'app').replace(/[^\w.-]+/g, '-');
  const time = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return `${safeName}-${time}.deffector.json`;
}
