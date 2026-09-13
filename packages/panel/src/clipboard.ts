/** Copies text; DevTools pages often lack the clipboard permission, so a failure only returns false. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Like `copyText`, but falls back to a hidden textarea and execCommand when the Clipboard API fails. */
export async function copyTextWithFallback(text: string): Promise<boolean> {
  if (await copyText(text)) return true;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  const isCopied = document.execCommand('copy');
  textarea.remove();
  return isCopied;
}
