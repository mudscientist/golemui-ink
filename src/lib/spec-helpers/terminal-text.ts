// Plain string helpers, shared by the specs and the end-to-end tests. Nothing here imports Ink.

// Built from the escape character code so no source line carries a literal control character.
const ESCAPE_CHARACTER = String.fromCharCode(27);

/** Keys the specs send through the fake stdin. */
export const keys = {
  tab: '\t',
  enter: '\r',
  space: ' ',
  backspace: String.fromCharCode(127),
  delete: `${ESCAPE_CHARACTER}[3~`,
  escape: ESCAPE_CHARACTER,
  shiftTab: `${ESCAPE_CHARACTER}[Z`,
  up: `${ESCAPE_CHARACTER}[A`,
  down: `${ESCAPE_CHARACTER}[B`,
  right: `${ESCAPE_CHARACTER}[C`,
  left: `${ESCAPE_CHARACTER}[D`,
  home: `${ESCAPE_CHARACTER}[H`,
  end: `${ESCAPE_CHARACTER}[F`,
  pageUp: `${ESCAPE_CHARACTER}[5~`,
  pageDown: `${ESCAPE_CHARACTER}[6~`,
  ctrlS: String.fromCharCode(19),
  // Shift+Enter in the xterm modifyOtherKeys form, which Ghostty sends by default.
  shiftEnterModifyOtherKeys: `${ESCAPE_CHARACTER}[27;2;13~`,
};

/**
 * Wraps a text in the markers a terminal sends around a paste when bracketed paste is on.
 *
 * @param text - The pasted text.
 * @returns The bytes to write to the fake stdin.
 *
 * @example
 * await form.press(bracketedPaste('joan@example.com\n'));
 */
export function bracketedPaste(text: string): string {
  return `${ESCAPE_CHARACTER}[200~${text}${ESCAPE_CHARACTER}[201~`;
}

// The vertical border of a box: '|' for the 'classic' style, U+2502 for 'single' and 'round'.
const BOX_VERTICAL_LINE = String.fromCharCode(0x2502);
const VERTICAL_BORDER = new RegExp(`^[|${BOX_VERTICAL_LINE}] | [|${BOX_VERTICAL_LINE}]$`, 'g');

/**
 * Returns the frame line that holds the focus, with every run of spaces collapsed to one.
 *
 * Every focusable widget draws the focus marker in front of its value, so one line of the frame is
 * enough to name the focused widget in a tab order assertion. The border of a box around the line,
 * a repeater row for example, is removed.
 *
 * @param frame - A frame without escape sequences, from `frame()`.
 * @returns The focused line, or an empty string when no widget holds the focus.
 *
 * @example
 * expect(focusedLine(form.frame())).toBe('> [ Save ]');
 */
export function focusedLine(frame: string): string {
  const focused = frame.split('\n').find((line) => line.includes('> '));
  if (focused === undefined) {
    return '';
  }
  return focused.replace(/\s+/g, ' ').trim().replace(VERTICAL_BORDER, '').trim();
}
