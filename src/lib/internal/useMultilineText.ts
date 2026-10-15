import { type Key } from 'ink';
import { useCallback, useRef, useState } from 'react';
import {
  countGraphemes,
  indexAfterGraphemes,
  nextGraphemeIndex,
  previousGraphemeIndex,
} from './graphemes';

/** The edited text, the caret, and the column that Up and Down aim for. */
type MultilineTextState = {
  text: string;
  /** Index of the character the caret sits before. Ranges from 0 to `text.length`. */
  cursor: number;
  /**
   * The column, in graphemes, that a run of Up and Down presses keeps. A line shorter than it
   * puts the caret at its end, and the next longer line puts it back at this column.
   */
  goalColumn: number | undefined;
};

/** Where the caret sits once the text is split into lines. */
export type CaretPosition = {
  line: number;
  /** The string index inside the line. */
  column: number;
};

/** What {@link useMultilineText} returns. */
export type MultilineText = {
  text: string;
  cursor: number;
  /**
   * Applies one key press. Enter inserts a line break.
   *
   * @param canEdit - False for a readonly field, where only the caret moves.
   * @returns True when the key changed the text or moved the caret.
   */
  handleKey: (input: string, key: Key, canEdit: boolean) => boolean;
  /**
   * Inserts a pasted text at the caret. Line breaks stay, other control characters are removed.
   *
   * @returns True when the text changed.
   */
  insertText: (text: string) => boolean;
  /** Replaces the whole text and puts the caret at the end. */
  setText: (text: string) => void;
};

// A paste can use CR LF or a lone CR for its line breaks, and the stored value uses LF, as the
// value of a browser textarea does. A terminal cannot draw the other control characters.
function cleanInsertedText(text: string): string {
  const withLineFeeds = text.replace(/\r\n?/g, '\n');
  let result = '';
  for (const character of withLineFeeds) {
    const code = character.codePointAt(0) ?? 0;
    if (character === '\n' || (code >= 32 && code !== 127)) {
      result += character;
    }
  }
  return result;
}

/**
 * Converts a caret index into a line and a column.
 *
 * @param text - The full text, line breaks included.
 * @param cursor - The caret index.
 * @returns The zero-based line, and the string index of the caret inside that line.
 *
 * @example
 * toCaretPosition('ab\ncd', 4); // { line: 1, column: 1 }
 */
export function toCaretPosition(text: string, cursor: number): CaretPosition {
  const before = text.slice(0, cursor);
  const lineStart = before.lastIndexOf('\n') + 1;
  return { line: before.split('\n').length - 1, column: cursor - lineStart };
}

function lineStartIndex(lines: string[], line: number): number {
  let start = 0;
  for (let index = 0; index < line; index++) {
    start += lines[index].length + 1;
  }
  return start;
}

function moveVertically(current: MultilineTextState, step: -1 | 1): MultilineTextState {
  const { text, cursor } = current;
  const lines = text.split('\n');
  const { line, column } = toCaretPosition(text, cursor);
  const targetLine = line + step;
  if (targetLine < 0 || targetLine >= lines.length) {
    return current;
  }
  const goalColumn = current.goalColumn ?? countGraphemes(lines[line].slice(0, column));
  const targetStart = lineStartIndex(lines, targetLine);
  return {
    text,
    cursor: targetStart + indexAfterGraphemes(lines[targetLine], goalColumn),
    goalColumn,
  };
}

function insertAtCursor(current: MultilineTextState, insertedText: string): MultilineTextState {
  const { text, cursor } = current;
  if (insertedText === '') {
    return current;
  }
  return {
    text: text.slice(0, cursor) + insertedText + text.slice(cursor),
    cursor: cursor + insertedText.length,
    goalColumn: undefined,
  };
}

function moveCaret(current: MultilineTextState, key: Key): MultilineTextState | undefined {
  const { text, cursor } = current;
  if (key.upArrow) {
    return moveVertically(current, -1);
  }
  if (key.downArrow) {
    return moveVertically(current, 1);
  }
  if (key.leftArrow) {
    return { text, cursor: previousGraphemeIndex(text, cursor), goalColumn: undefined };
  }
  if (key.rightArrow) {
    return { text, cursor: nextGraphemeIndex(text, cursor), goalColumn: undefined };
  }
  if (key.home || key.end) {
    const lines = text.split('\n');
    const { line } = toCaretPosition(text, cursor);
    const start = lineStartIndex(lines, line);
    return {
      text,
      cursor: key.home ? start : start + lines[line].length,
      goalColumn: undefined,
    };
  }
  return undefined;
}

function editText(current: MultilineTextState, input: string, key: Key): MultilineTextState {
  const { text, cursor } = current;
  if (key.backspace) {
    if (cursor === 0) {
      return current;
    }
    const start = previousGraphemeIndex(text, cursor);
    return {
      text: text.slice(0, start) + text.slice(cursor),
      cursor: start,
      goalColumn: undefined,
    };
  }
  if (key.delete) {
    if (cursor >= text.length) {
      return current;
    }
    const end = nextGraphemeIndex(text, cursor);
    return { text: text.slice(0, cursor) + text.slice(end), cursor, goalColumn: undefined };
  }
  // Every Enter inserts a line break, with or without modifiers. Ctrl+S submits the form.
  if (key.return) {
    return insertAtCursor(current, '\n');
  }
  if (input.length === 0 || key.ctrl || key.meta) {
    return current;
  }
  // An input of several characters is a paste from a terminal without bracketed paste.
  return insertAtCursor(current, cleanInsertedText(input));
}

/** Options for {@link useMultilineText}. */
export type MultilineTextOptions = {
  /** The text it starts with. The caret starts at its end. */
  initialText?: string;
  /** Called with the whole text after every edit that changed it. */
  onTextChanged?: (text: string) => void;
};

/**
 * Keeps a text of several lines and the caret position inside it.
 *
 * The caret moves and deletes by grapheme. Up and Down keep the column across shorter lines, as a
 * text editor does. `handleKey` and `insertText` are new functions on every render. Call them from
 * the handlers of `useFocusedInput`, which always run the last render.
 *
 * @param options - The initial text and the change callback.
 * @returns The text, the caret index, the key and paste handlers, and a setter.
 *
 * @example
 * const editor = useMultilineText({ initialText: value, onTextChanged: onValueChanged });
 * useFocusedInput(uid, {
 *   onKey: (input, key) => { editor.handleKey(input, key, !isReadonly); },
 *   onPaste: (text) => { editor.insertText(text); },
 * });
 */
export function useMultilineText({
  initialText = '',
  onTextChanged,
}: MultilineTextOptions = {}): MultilineText {
  const [state, setState] = useState<MultilineTextState>(() => ({
    text: initialText,
    cursor: initialText.length,
    goalColumn: undefined,
  }));
  // The authoritative copy lives in a ref so two key events in one tick both read the newest text.
  const stateRef = useRef(state);

  function applyChange(next: MultilineTextState): boolean {
    const previous = stateRef.current;
    if (next === previous) {
      return false;
    }
    stateRef.current = next;
    setState(next);
    if (next.text !== previous.text) {
      onTextChanged?.(next.text);
    }
    return next.text !== previous.text || next.cursor !== previous.cursor;
  }

  function handleKey(input: string, key: Key, canEdit: boolean): boolean {
    const moved = moveCaret(stateRef.current, key);
    if (moved) {
      return applyChange(moved);
    }
    if (!canEdit) {
      return false;
    }
    return applyChange(editText(stateRef.current, input, key));
  }

  function insertText(text: string): boolean {
    return applyChange(insertAtCursor(stateRef.current, cleanInsertedText(text)));
  }

  // Stable, because a widget calls it from an effect that lists it as a dependency.
  const setText = useCallback((text: string) => {
    if (stateRef.current.text === text) {
      return;
    }
    stateRef.current = { text, cursor: text.length, goalColumn: undefined };
    setState(stateRef.current);
  }, []);

  return { text: state.text, cursor: state.cursor, handleKey, insertText, setText };
}
