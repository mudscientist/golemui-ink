import type { InputWidget, Validator, WithWidget } from '@golemui/core';
import type { CurrencyProps } from '@golemui/gui-shared/internals';
import { useInputWidget } from '@golemui/react';
import { Box, Text } from 'ink';
import { Field } from '../internal/Field';
import { stepValue } from '../internal/numeric';
import { useFieldFocus } from '../internal/useFieldFocus';
import { useFocusedInput } from '../internal/useFocusedInput';
import { parseNumberText, useNumberText } from '../internal/useNumberText';
import { useTheme } from '../theme';

/** The fraction digits to format with, resolved the way the DOM currency widget resolves them. */
type FractionDigits = {
  minimumFractionDigits: number;
  maximumFractionDigits: number;
};

function resolveFractionDigits(props: CurrencyProps): FractionDigits {
  // The maximum is resolved first and the minimum is then clamped below it, otherwise
  // `maximumFractionDigits: 0` with the default minimum of 2 makes Intl.NumberFormat throw.
  const maximumFractionDigits =
    props.maximumFractionDigits ?? Math.max(props.minimumFractionDigits ?? 2, 2);
  return {
    maximumFractionDigits,
    minimumFractionDigits: Math.min(props.minimumFractionDigits ?? 2, maximumFractionDigits),
  };
}

// The same values the DOM widget leaves unformatted. A numeric string from the store is formatted.
function hasAmount(value: unknown): boolean {
  return (
    value !== undefined &&
    value !== null &&
    value !== '' &&
    !(typeof value === 'number' && Number.isNaN(value))
  );
}

function formatCurrency(value: number, locale: string | undefined, props: CurrencyProps): string {
  try {
    return new Intl.NumberFormat(locale ?? 'en', {
      style: 'currency',
      currency: props.currency ?? 'USD',
      ...resolveFractionDigits(props),
    }).format(value);
  } catch (error) {
    // An unknown locale or currency code must not stop the form, so the plain number is shown.
    console.warn('Invalid locale or currency', error);
    return value.toString();
  }
}

/**
 * The `currency` widget. It is typed like the number widget and stores a plain number.
 *
 * Up and Down step the value by `step`, without bounds, as in the DOM widget. The formatted amount
 * replaces the typed text when the field loses the focus. While the field has the focus, the
 * formatted amount shows after the typed text, as the DOM widget shows it above the input.
 */
export function Currency(widgetInstance: WithWidget) {
  const widget = widgetInstance.widget as InputWidget<number>;
  // The store holds `undefined` for an empty or unparsable field, so the value type carries it.
  const { uid, errors, value, isTouched, templateData, onValueChanged, onBlur } = useInputWidget<
    number | undefined,
    CurrencyProps
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
          stepValue(parseNumberText(text), key.upArrow ? 1 : -1, { step: templateData.step }),
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

  const valueColor = isDisabled ? theme.colors.disabled : theme.colors.value;
  const placeholder = templateData.placeholder ?? '';
  const formatted = hasAmount(value)
    ? formatCurrency(value as number, templateData.lang, templateData)
    : '';
  const showPlaceholder = !isFocused && formatted === '' && placeholder !== '';

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
        {showPlaceholder && <Text color={theme.colors.placeholder}>{placeholder}</Text>}
        {isFocused && (
          <Text color={valueColor}>
            {text.slice(0, cursor)}
            {theme.glyphs.cursor}
            {text.slice(cursor)}
          </Text>
        )}
        {isFocused && formatted !== '' && <Text color={theme.colors.hint}>{`  ${formatted}`}</Text>}
        {!isFocused && !showPlaceholder && <Text color={valueColor}>{formatted}</Text>}
      </Box>
    </Field>
  );
}
