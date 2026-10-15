import { Box, Text } from 'ink';
import { useEffect } from 'react';
import { useTheme } from '../theme';
import { useFocusedInput } from './useFocusedInput';
import { toCaretPosition, useMultilineText } from './useMultilineText';
import { useWindow } from './useWindow';

/** Props of {@link MultilineEditor}. */
export type MultilineEditorProps = {
  /** The uid of the widget, which registered it with `useFieldFocus`. */
  uid: string;
  /** The value held by the form store. */
  value: string | undefined;
  isFocused: boolean;
  isDisabled: boolean;
  /** A readonly editor moves the caret but does not change the text. */
  isReadonly: boolean;
  placeholder: string;
  /** How many lines the editor shows at least. */
  minimumRows: number;
  /** Grows the editor to show every line instead of scrolling. */
  autoGrow: boolean;
  /** Called with the whole text after every edit, like the DOM `input` event. */
  onValueChanged: (text: string) => void;
};

/**
 * An editable text of several lines with a caret: the body of `textarea`.
 *
 * Enter inserts a line break, so Tab, Shift+Tab and Ctrl+S are the keys that leave the field or
 * submit the form. A paste keeps its line breaks. While the editor is not focused the store value
 * wins, so a host calling `setData` replaces what is shown.
 *
 * @example
 * <MultilineEditor uid={uid} value={value} isFocused={isFocused} isDisabled={false}
 *   isReadonly={false} placeholder="" minimumRows={6} autoGrow={false}
 *   onValueChanged={onValueChanged} />
 */
export function MultilineEditor({
  uid,
  value,
  isFocused,
  isDisabled,
  isReadonly,
  placeholder,
  minimumRows,
  autoGrow,
  onValueChanged,
}: MultilineEditorProps) {
  const theme = useTheme();
  const storeText = value ?? '';
  const editor = useMultilineText({ initialText: storeText, onTextChanged: onValueChanged });
  const { text, cursor, setText } = editor;

  useEffect(() => {
    if (!isFocused) {
      setText(storeText);
    }
  }, [storeText, isFocused, setText]);

  useFocusedInput(uid, {
    onKey: (input, key) => {
      editor.handleKey(input, key, !isReadonly);
    },
    onPaste: (pastedText) => {
      if (isReadonly) {
        return;
      }
      editor.insertText(pastedText);
    },
  });

  const lines = text.split('\n');
  const caret = toCaretPosition(text, cursor);
  const rows = autoGrow ? Math.max(minimumRows, lines.length) : minimumRows;
  const { start, end } = useWindow({
    itemCount: lines.length,
    visibleRows: rows,
    highlightedIndex: caret.line,
  });
  const showPlaceholder = !isFocused && text === '' && placeholder !== '';

  return (
    <Box>
      <Text color={isFocused ? theme.colors.focus : theme.colors.border}>
        {isFocused ? `${theme.glyphs.focusMarker} ` : '  '}
      </Text>
      <Box flexDirection="column" flexGrow={1} height={rows} overflow="hidden">
        {showPlaceholder ? (
          <Text color={theme.colors.placeholder}>{placeholder}</Text>
        ) : (
          lines.slice(start, end).map((line, index) => {
            const lineIndex = start + index;
            const drawn =
              isFocused && lineIndex === caret.line
                ? line.slice(0, caret.column) + theme.glyphs.cursor + line.slice(caret.column)
                : line;
            return (
              <Text key={lineIndex} color={isDisabled ? theme.colors.disabled : theme.colors.value}>
                {/* An empty Text has no height in Ink, so an empty line draws one space. */}
                {drawn === '' ? ' ' : drawn}
              </Text>
            );
          })
        )}
      </Box>
    </Box>
  );
}
