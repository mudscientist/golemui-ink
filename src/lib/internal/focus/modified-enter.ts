import type { Key } from 'ink';

// Enter with modifiers in the xterm modifyOtherKeys form, `ESC [27;<modifier>;13~`, as Ink 7 passes
// it to `useInput`: as text, without the escape character.
const MODIFIED_ENTER = /^\[27;(\d+);13~$/;

const SHIFT_BIT = 1;
const ALT_BIT = 2;
const CTRL_BIT = 4;
const META_BIT = 8;

/** An input and its key, the two values Ink passes to `useInput`. */
export type KeyPress = {
  input: string;
  key: Key;
};

/**
 * Reads Enter with modifiers that a terminal sent in the xterm modifyOtherKeys form.
 *
 * Ghostty sends Shift+Enter as `ESC [27;2;13~` and Ctrl+Enter as `ESC [27;5;13~` by default. Ink 7
 * does not parse that form and passes `[27;2;13~` as text, which a text field would insert.
 *
 * @param input - The input Ink passed to `useInput`.
 * @param key - The key Ink passed with it.
 * @returns The input and the key Ink reports for Enter, with the modifiers of the sequence, or
 * undefined when the input is not such a sequence.
 *
 * @example
 * toModifiedEnter('[27;2;13~', key); // { input: '\r', key: { ...key, return: true, shift: true } }
 */
export function toModifiedEnter(input: string, key: Key): KeyPress | undefined {
  const match = MODIFIED_ENTER.exec(input);
  if (!match) {
    return undefined;
  }
  // The parameter is 1 plus a bit mask of the modifiers, so 1 means no modifier.
  const modifiers = Number(match[1]) - 1;
  if (modifiers < 0) {
    return undefined;
  }
  return {
    input: '\r',
    key: {
      ...key,
      return: true,
      shift: (modifiers & SHIFT_BIT) !== 0,
      // Ink reports Alt as `meta`, so both bits map to it.
      meta: (modifiers & (ALT_BIT | META_BIT)) !== 0,
      ctrl: (modifiers & CTRL_BIT) !== 0,
    },
  };
}
