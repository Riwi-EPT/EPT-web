/**
 * Trigger a browser download of `data` as a pretty-printed JSON file.
 *
 * A standalone module on purpose: jsdom implements neither `URL.createObjectURL` nor a
 * real anchor click, so tests mock this one function instead of stubbing browser
 * internals. Keeping the whole side effect here is what makes the modal testable.
 */
export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // Always release the object URL, even if the click throws.
    URL.revokeObjectURL(url);
  }
}

/**
 * Name for an exported bundle, e.g.
 * `ept-exam-versions_A-B_2026-08-11_WITH-ANSWER-KEYS.json`.
 *
 * The suffix is deliberate and not decoration: the file contains every correct answer,
 * and it will outlive the admin session that produced it. Anyone glancing at a Downloads
 * folder, an email attachment or a ticket should be able to tell what they are holding.
 */
export function exportFilename(codes: string[], now = new Date()): string {
  const date = now.toISOString().slice(0, 10);
  const joined = codes.join("-") || "none";
  return `ept-exam-versions_${joined}_${date}_WITH-ANSWER-KEYS.json`;
}
