import type { InputWidget, Validator, WithWidget } from '@golemui/core';
import type { NumberinputProps } from '@golemui/gui-shared/internals';
import { useInputWidget } from '@golemui/react';
import { Box, Text } from 'ink';
import { Field } from '../internal/Field';
import { stepValue } from '../internal/numeric';
import { useFieldFocus } from '../internal/useFieldFocus';
import { useFocusedInput } from '../internal/useFocusedInput';
import { parseNumberText, useNumberText } from '../internal/useNumberText';
import { useTheme } from '../theme';

/**
 * The `number` widget. It accepts the characters a browser number input accepts and stores the
 * parsed number, or `undefined` while the text is not a number.
 *
 * Up and Down step the value and clamp it to `minimum` and `maximum`, as the arrow keys of the DOM
 * widget do. A typed value is never clamped. The validator reports it instead.
 */
export function NumberInput(widgetInstance: WithWidget) {
  const widget = widgetInstance.widget as InputWidget<number>;
  // The store holds `undefined` for an empty or unparsable field, so the value type carries it.
  const { uid, errors, value, isTouched, templateData, onValueChanged, onBlur } = useInputWidget<
    number | undefined,
    NumberinputProps
  >(widget);

  const theme = useTheme();
  const isDisabled = templateData.disabled as boolean;
  const isReadonly = templateData.readonly as boolean;
  const isRequired = (templateData.validator as Validator)?.required;

  const { isFocused, focusNext } = useFieldFocus({ uid, isDisabled, onBlur });
  const { text, cursor, handleKey, insertText, setNumber } = useNumberText({
    value,
    isFocused,
    onValueChanged,
  });

  useFocusedInput(uid, {
    onKey: (input, key) => {
      if (key.return) {
        focusNext();
        return;
      }
      if (isReadonly) {
        return;
      }
      if (key.upArrow || key.downArrow) {
        setNumber(
          stepValue(parseNumberText(text), key.upArrow ? 1 : -1, {
            step: templateData.step,
            minimum: templateData.minimum,
            maximum: templateData.maximum,
          }),
        );
        return;
      }
      handleKey(input, key);
    },
    onPaste: (pastedText) => {
      if (isReadonly) {
        return;
      }
      insertText(pastedText);
    },
  });

  const placeholder = templateData.placeholder ?? '';
  const showPlaceholder = !isFocused && text === '' && placeholder !== '';

  return (
    <Field
      theme={theme}
      label={templateData.label as string}
      hint={templateData.hint}
      size={templateData.size}
      isRequired={isRequired}
      isFocused={isFocused}
      isTouched={isTouched}
      errors={errors}
    >
      <Box>
        <Text color={isFocused ? theme.colors.focus : theme.colors.border}>
          {isFocused ? `${theme.glyphs.focusMarker} ` : '  '}
        </Text>
        {showPlaceholder ? (
          <Text color={theme.colors.placeholder}>{placeholder}</Text>
        ) : (
          <Text color={isDisabled ? theme.colors.disabled : theme.colors.value}>
            {text.slice(0, cursor)}
            {isFocused ? theme.glyphs.cursor : ''}
            {text.slice(cursor)}
          </Text>
        )}
      </Box>
    </Field>
  );
}
