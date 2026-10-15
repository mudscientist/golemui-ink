import type { InputWidget, Validator, WithWidget } from '@golemui/core';
import type { TextareaProps } from '@golemui/gui-shared/internals';
import { useInputWidget } from '@golemui/react';
import { Text } from 'ink';
import { Field } from '../internal/Field';
import { MultilineEditor } from '../internal/MultilineEditor';
import { useFieldFocus } from '../internal/useFieldFocus';
import { useTheme } from '../theme';

// The DOM widget sets its height in pixels. One terminal row stands for about 20 pixels of a
// browser textarea line.
const PIXELS_PER_ROW = 20;
const DEFAULT_MINIMUM_HEIGHT = 120;
const MINIMUM_ROWS = 3;

/**
 * The `textarea` widget. Enter inserts a line break. Tab leaves the field, and Ctrl+S submits the
 * form.
 *
 * `maxLength` never blocks a key. It only drives the counter, as in the DOM widget, and the counter
 * turns to the error color once the text is longer than the limit.
 */
export function TextArea(widgetInstance: WithWidget) {
  const widget = widgetInstance.widget as InputWidget<string>;
  const { uid, errors, value, isTouched, templateData, onValueChanged, onBlur } = useInputWidget<
    string,
    TextareaProps
  >(widget);

  const theme = useTheme();
  const isDisabled = templateData.disabled as boolean;
  const isReadonly = templateData.readonly as boolean;
  const validator = templateData.validator as Validator | undefined;
  const isRequired = validator?.required;
  // The DOM reads the limit from the validator only, although the props type declares it too.
  const maxLength = validator?.maxLength as number | undefined;

  const { isFocused } = useFieldFocus({ uid, isDisabled, onBlur });

  const minimumRows = Math.max(
    MINIMUM_ROWS,
    Math.round((templateData.minimumHeight ?? DEFAULT_MINIMUM_HEIGHT) / PIXELS_PER_ROW),
  );
  const length = (value ?? '').length;
  const counted = templateData.counterMode === 'current' ? length : (maxLength ?? 0) - length;

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
      <MultilineEditor
        uid={uid}
        value={value}
        isFocused={isFocused}
        isDisabled={isDisabled}
        isReadonly={isReadonly}
        placeholder={templateData.placeholder ?? ''}
        minimumRows={minimumRows}
        autoGrow={templateData.autoGrow ?? false}
        onValueChanged={onValueChanged}
      />
      {Boolean(maxLength) && (
        <Text color={length > (maxLength ?? 0) ? theme.colors.error : theme.colors.hint}>
          {counted} / {maxLength}
        </Text>
      )}
    </Field>
  );
}
