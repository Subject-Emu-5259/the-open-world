// Shared help-message formatter (v0.108.23 §63). Pure, no DOM: the
// client imports it for live help rendering, and the node harness
// imports it to prove the presentation structure.
//
// CONSTRAINT (from .21 §58, still load-bearing): the .20 coverage
// audit parses bullet lines with /^• ([a-z][a-z_-]*)/gm, so bullet
// TEXT stays byte-identical — this formatter only WRAPS it. A bullet
// line becomes one .help-entry card: the command portion (text up to
// the first " — ") as a styled .help-cmd token, the rest as
// .help-desc. Section headers become .help-section-title blocks;
// index and other non-bullet lines become quiet .help-note blocks.
// Blank lines produce no output (CSS margins do the spacing).
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

export function formatHelpMessage(text: string): string {
  const out: string[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    if (line.trim() === '') continue;
    const header = line.match(/^\*\*(\d+)\. (.+?)\*\*$/);
    if (header) {
      out.push(`<div class="help-section-title">${header[1]}. ${inline(header[2] ?? '')}</div>`);
      continue;
    }
    if (line.startsWith('• ')) {
      const body = line.slice(2);
      const dash = body.indexOf(' — ');
      const cmd = dash >= 0 ? body.slice(0, dash) : body;
      const desc = dash >= 0 ? body.slice(dash + 3) : '';
      out.push(
        `<div class="help-entry"><span class="help-cmd">${escapeHtml(cmd)}</span>` +
        (desc ? `<span class="help-desc">${inline(desc)}</span>` : '') +
        `</div>`,
      );
      continue;
    }
    if (/^\d+\. .+ — help /.test(line)) {
      out.push(`<div class="help-index-line">${inline(line)}</div>`);
      continue;
    }
    out.push(`<div class="help-note">${inline(line)}</div>`);
  }
  return out.join('\n');
}
