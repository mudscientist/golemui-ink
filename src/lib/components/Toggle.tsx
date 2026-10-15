import type { InputWidget, Validator, WithWidget } from '@golemui/core';
import type { ToggleProps } from '@golemui/gui-shared/internals';
import { useInputWidget } from '@golemui/react';
import { Box, Text } from 'ink';
import { Field } from '../internal/Field';
import { useFieldFocus } from '../internal/useFieldFocus';
import { useFocusedInput } from '../internal/useFocusedInput';
import { useTheme } from '../theme';

/**
 * The `toggle` widget. Space flips the value. Enter moves to the next field, as on a checkbox.
 *
 * It draws like the checkbox, with the on and off glyphs of the theme. `togglePosition: 'right'`
 * puts the glyph after the label.
 */
export function Toggle(widgetInstance: WithWidget) {
  const widget = widgetInstance.widget as InputWidget<boolean>;
  const { uid, errors, value, isTouched, templateData, onValueChanged, onBlur } = useInputWidget<
    boolean,
    ToggleProps
  >(widget);

  const theme = useTheme();
  const isDisabled = templateData.disabled as boolean;
  const isReadonly = templateData.readonly as boolean;
  const isRequired = (templateData.validator as Validator)?.required;

  const { isFocused, focusNext } = useFieldFocus({ uid, isDisabled, onBlur });

  useFocusedInput(uid, {
    onKey: (input, key) => {
      if (key.return) {
        focusNext();
        return;
      }
      if (isReadonly) {
        return;
      }
      if (input === ' ') {
        onValueChanged(!value);
      }
    },
  });

  const glyph = value ? theme.glyphs.toggleOn : theme.glyphs.toggleOff;
  const isGlyphLast = templateData.togglePosition === 'right';

  const glyphText = (
    <Text color={isDisabled ? theme.colors.disabled : theme.colors.value}>
      {isGlyphLast ? ` ${glyph}` : `${glyph} `}
    </Text>
  );
  const labelText = (
    <Text color={theme.colors.label} bold={isFocused}>
      {templateData.label as string}
      {isRequired ? theme.glyphs.required : ''}
    </Text>
  );

  return (
    <Field
      theme={theme}
      hint={templateData.hint}
      size={templateData.size}
      isFocused={isFocused}
      isTouched={isTouched}
      errors={errors}
    >
      <Box>
        <Text color={isFocused ? theme.colors.focus : theme.colors.border}>
          {isFocused ? `${theme.glyphs.focusMarker} ` : '  '}
        </Text>
        {isGlyphLast ? labelText : glyphText}
        {isGlyphLast ? glyphText : labelText}
      </Box>
    </Field>
  );
}
