import type { InputWidget, Validator, WithWidget } from '@golemui/core';
import type { OptionValue, SelectProps } from '@golemui/gui-shared/internals';
import { useInputWidget } from '@golemui/react';
import { Box, Text } from 'ink';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Field } from '../internal/Field';
import { message } from '../internal/messages';
import { updateOptions } from '../internal/options';
import { useFieldFocus } from '../internal/useFieldFocus';
import { useFocusedInput } from '../internal/useFocusedInput';
import { useWindow } from '../internal/useWindow';
import { useTheme } from '../theme';

// The DOM select is a native list, which has no height prop. The terminal panel shows this many
// options and scrolls.
const VISIBLE_PANEL_ROWS = 8;

/**
 * The `select` widget. The closed field shows the selected label. Enter or Space opens a panel
 * below it, Up and Down move the highlight, Enter picks, and Escape closes without a change.
 *
 * A stored value that matches no option is reported as a validation issue, as the DOM select does:
 * only while there are options, once per value, and withdrawn when the value becomes valid or
 * empty.
 */
export function Select(widgetInstance: WithWidget) {
  const widget = widgetInstance.widget as InputWidget<OptionValue>;
  const {
    uid,
    errors,
    value,
    isTouched,
    templateData,
    onValueChanged,
    onBlur,
    injectValidationIssues,
  } = useInputWidget<OptionValue, SelectProps>(widget);

  const theme = useTheme();
  const isDisabled = templateData.disabled as boolean;
  const isReadonly = templateData.readonly as boolean;
  const isRequired = (templateData.validator as Validator)?.required;

  const options = useMemo(
    () =>
      updateOptions(templateData.options, {
        labelField: templateData.labelField,
        valueField: templateData.valueField,
      }),
    [templateData.options, templateData.labelField, templateData.valueField],
  );

  const selectedIndex = options.findIndex((option) => option.value === value);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const { isFocused } = useFieldFocus({
    uid,
    isDisabled,
    onBlur: () => {
      setIsOpen(false);
      onBlur();
    },
  });

  const invalidOptionMessage = templateData.invalidOptionMessage as string | undefined;
  const hasValue = value !== undefined && value !== null && value !== '';
  const isUnknownValue = hasValue && options.length > 0 && selectedIndex === -1;

  // The value that was last reported as unknown, so a render with the same value does not
  // report it again.
  const reportedValueRef = useRef<{ value: OptionValue } | undefined>(undefined);
  useEffect(() => {
    if (isUnknownValue) {
      if (reportedValueRef.current?.value === value) {
        return;
      }
      reportedValueRef.current = { value };
      const text = message('invalidOption', invalidOptionMessage, { value: String(value) });
      // An empty message means that the host wants no error for an unknown value.
      injectValidationIssues(text ? [text] : null);
      return;
    }
    if (reportedValueRef.current) {
      reportedValueRef.current = undefined;
      injectValidationIssues(null);
    }
  }, [isUnknownValue, value, invalidOptionMessage, injectValidationIssues]);

  const pick = (index: number) => {
    const option = options[index];
    if (!option) {
      return;
    }
    // The reported issue belongs to the value being replaced, so it is cleared first.
    reportedValueRef.current = undefined;
    injectValidationIssues(null);
    onValueChanged(option.value);
    setIsOpen(false);
  };

  useFocusedInput(uid, {
    onKey: (input, key) => {
      if (!isOpen) {
        if ((key.return || input === ' ') && !isReadonly && options.length > 0) {
          setHighlightedIndex(Math.max(0, selectedIndex));
          setIsOpen(true);
        }
        return;
      }
      if (key.escape) {
        setIsOpen(false);
        return;
      }
      if (key.upArrow) {
        setHighlightedIndex((current) => Math.max(0, current - 1));
        return;
      }
      if (key.downArrow) {
        setHighlightedIndex((current) => Math.min(options.length - 1, current + 1));
        return;
      }
      if (key.return) {
        pick(highlightedIndex);
      }
    },
  });

  const { start, end } = useWindow({
    itemCount: options.length,
    visibleRows: VISIBLE_PANEL_ROWS,
    highlightedIndex,
  });

  const selectedLabel = selectedIndex >= 0 ? options[selectedIndex].label : undefined;
  const closedText = selectedLabel ?? message('selectAnOption', templateData.placeholder);
  let closedColor = theme.colors.value;
  if (isDisabled) {
    closedColor = theme.colors.disabled;
  } else if (selectedLabel === undefined) {
    closedColor = theme.colors.placeholder;
  }

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
        <Text color={closedColor}>
          [ {closedText} {theme.glyphs.selectArrow}]
        </Text>
      </Box>
      {isOpen && (
        <Box
          flexDirection="column"
          height={Math.min(VISIBLE_PANEL_ROWS, options.length)}
          overflow="hidden"
        >
          {options.slice(start, end).map((option, index) => {
            const optionIndex = start + index;
            return (
              <Text
                key={`${option.value}`}
                color={theme.colors.value}
                inverse={optionIndex === highlightedIndex}
              >
                {'  '}
                {option.label}
              </Text>
            );
          })}
        </Box>
      )}
    </Field>
  );
}
