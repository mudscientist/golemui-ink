import { useEffect } from 'react';
import { isRealNumber, VALID_NUMBER_INPUT_CHARS } from './numeric';
import { useDraftText } from './useDraftText';

// The "valid floating-point number" of the HTML standard, which a browser number input accepts as
// its value: no leading '+', at least one digit before an exponent, and digits after a '.'.
const HTML_FLOATING_POINT_NUMBER = /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?$/;

/**
 * Parses the text of a number field the way a browser number input does.
 *
 * @param text - The text the user typed.
 * @returns The number, or undefined when the text is empty or is not a valid number, which is when
 * a browser number input reports `NaN`.
 *
 * @example
 * parseNumberText('1.5e3'); // 1500
 * parseNumberText('1.'); // undefined
 */
export function parseNumberText(text: string): number | undefined {
  if (!HTML_FLOATING_POINT_NUMBER.test(text)) {
    return undefined;
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toText(value: number | undefined): string {
  return isRealNumber(value) ? String(value) : '';
}

/** Options for {@link useNumberText}. */
export type NumberTextOptions = {
  /** The value held by the form store. */
  value: number | undefined;
  /** Whether the widget holds focus. An unfocused widget shows the store value. */
  isFocused: boolean;
  /** Called after every edit with the parsed number, or undefined when the text is not one. */
  onValueChanged: (value: number | undefined) => void;
};

/**
 * Keeps the text of a numeric terminal input and reports the parsed number.
 *
 * It accepts the characters a browser number input accepts (digits, `.`, `,`, `e`, `E`, `+`, `-`),
 * anywhere in the text. The text stays on screen while the widget holds the focus, so a draft
 * such as `-` or `1e` stays visible while the store already holds `undefined`. When the focus
 * leaves, the field shows the store value again, which empties a draft that is not a number.
 *
 * @param options - The store value, the focus state, and the change callback.
 * @returns The draft text API of `useDraftText`, plus `setNumber`, which writes a stepped number.
 *
 * @example
 * const { text, cursor, handleKey, insertText, setNumber } = useNumberText({ value, isFocused, onValueChanged });
 * useFocusedInput(uid, {
 *   onKey: (input, key) => {
 *     if (key.upArrow) { setNumber(stepValue(parseNumberText(text), 1, { step })); return; }
 *     handleKey(input, key);
 *   },
 *   onPaste: (pastedText) => { insertText(pastedText); },
 * });
 */
export function useNumberText({ value, isFocused, onValueChanged }: NumberTextOptions) {
  const storeText = toText(value);
  const draft = useDraftText({
    initialText: storeText,
    onTextChanged: (text) => onValueChanged(parseNumberText(text)),
    acceptsInsert: (text) => VALID_NUMBER_INPUT_CHARS.test(text),
  });
  const { setText } = draft;

  useEffect(() => {
    if (!isFocused) {
      setText(storeText);
    }
  }, [storeText, isFocused, setText]);

  // A step writes a value that is a number, so the field and the store change together.
  const setNumber = (nextValue: number) => {
    setText(toText(nextValue));
    onValueChanged(nextValue);
  };

  return { ...draft, setNumber };
}
