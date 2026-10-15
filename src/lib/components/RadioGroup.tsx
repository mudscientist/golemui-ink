import type { InputWidget, Validator, WithWidget } from '@golemui/core';
import type { OptionValue, RadiogroupProps } from '@golemui/gui-shared/internals';
import { useInputWidget } from '@golemui/react';
import { Box, Text } from 'ink';
import { useMemo } from 'react';
import { Field } from '../internal/Field';
import { updateOptions } from '../internal/options';
import { useFieldFocus } from '../internal/useFieldFocus';
import { useFocusedInput } from '../internal/useFocusedInput';
import { useTheme } from '../theme';

/**
 * The `radiogroup` widget. The arrows select the next or the previous option and wrap around, as
 * the arrow keys of browser radio buttons do. Space selects the marked option, which matters when
 * no option is selected yet. Enter moves to the next field.
 *
 * Both arrow axes work whatever the `direction` is. A stored value that matches no option selects
 * nothing, shows no error, and marks the first option, as in the DOM widget.
 */
export function RadioGroup(widgetInstance: WithWidget) {
  const widget = widgetInstance.widget as InputWidget<OptionValue>;
  const { uid, errors, value, isTouched, templateData, onValueChanged, onBlur } = useInputWidget<
    OptionValue,
    RadiogroupProps
  >(widget);

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

  // The arrows always select, so the marked option is the selected one, or the first one while
  // nothing is selected. That is the option a browser gives the tab stop.
  const selectedIndex = options.findIndex((option) => option.value === value);
  const markedIndex = Math.max(0, selectedIndex);

  const { isFocused, focusNext } = useFieldFocus({ uid, isDisabled, onBlur });

  const select = (index: number) => {
    const option = options[index];
    if (option && option.value !== value) {
      onValueChanged(option.value);
    }
  };

  useFocusedInput(uid, {
    onKey: (input, key) => {
      if (key.return) {
        focusNext();
        return;
      }
      if (isReadonly || options.length === 0) {
        return;
      }
      if (key.upArrow || key.leftArrow) {
        select((markedIndex - 1 + options.length) % options.length);
        return;
      }
      if (key.downArrow || key.rightArrow) {
        select((markedIndex + 1) % options.length);
        return;
      }
      if (input === ' ') {
        select(markedIndex);
      }
    },
  });

  const isRow = templateData.direction === 'row';

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
      <Box flexDirection={isRow ? 'row' : 'column'} columnGap={isRow ? 2 : 0}>
        {options.map((option, index) => {
          const isMarked = isFocused && index === markedIndex;
          const glyph = option.value === value ? theme.glyphs.radioOn : theme.glyphs.radioOff;
          return (
            <Box key={`${option.value}`}>
              <Text color={isFocused ? theme.colors.focus : theme.colors.border}>
                {isMarked ? `${theme.glyphs.focusMarker} ` : '  '}
              </Text>
              <Text
                color={isDisabled ? theme.colors.disabled : theme.colors.value}
                inverse={isMarked}
              >
                {glyph} {option.label}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Field>
  );
}
