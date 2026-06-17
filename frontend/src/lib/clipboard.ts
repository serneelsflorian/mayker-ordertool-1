/**
 * Copy text to the clipboard.
 *
 * Returns `true` on success and `false` when the Clipboard API is unavailable
 * (e.g. an insecure context) or rejects, so callers can still surface an
 * appropriate confirmation to the user.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
