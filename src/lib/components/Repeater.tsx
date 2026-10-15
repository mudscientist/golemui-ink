import type { InputWidget, NonFunctionWidget, Validator, WithWidget } from '@golemui/core';
import type { RepeaterProps } from '@golemui/gui-shared/internals';
import { useInputWidget, WidgetRenderer } from '@golemui/react';
import { Box, Text } from 'ink';
import { useEffect, useEffectEvent, useRef } from 'react';
import { Field } from '../internal/Field';
import { FocusableButton } from '../internal/FocusableButton';
import { useFocusManager } from '../internal/focus/FocusManager';
import { FocusPathProvider } from '../internal/focus/FocusPathContext';
import { useFocusInside } from '../internal/focus/useFocusInside';
import { useTheme } from '../theme';

type RepeaterRows = RepeaterProps<NonFunctionWidget<string>>;

// Inside a row, the header with the Remove button comes before the row fields, as in the DOM.
const ROW_HEADER_INDEX = 0;
const ROW_FIELDS_INDEX = 1;

/**
 * The `repeater` widget. Each row is a box with a header (the title and a Remove button) above
 * its fields, and one Add button follows the rows. `limit` disables Add.
 *
 * The rows arrive ready to render from `templateData.rows`, with the row index already applied to
 * every uid and path, so this component only owns the two buttons and the array value.
 *
 * The repeater emits `blur` once, when the focus leaves the whole repeater. The DOM repeater emits
 * it on every focus move inside it.
 */
export function Repeater(widgetInstance: WithWidget) {
  const widget = widgetInstance.widget as InputWidget<Record<string, unknown>[]>;
  const { uid, errors, value, isTouched, templateData, onValueChanged, onBlur } = useInputWidget<
    Record<string, unknown>[],
    RepeaterRows
  >(widget);

  const theme = useTheme();
  const { focus } = useFocusManager();
  const isRequired = (templateData.validator as Validator)?.required;

  const rows = templateData.rows ?? [];
  const rowCount = value?.length ?? 0;
  const addFocusId = `${uid}__add`;

  const isFocusInside = useFocusInside();
  const onBlurEvent = useEffectEvent(() => {
    onBlur();
  });
  const wasFocusInside = useRef(isFocusInside);
  useEffect(() => {
    if (wasFocusInside.current && !isFocusInside) {
      onBlurEvent();
    }
    wasFocusInside.current = isFocusInside;
  }, [isFocusInside]);

  // The Remove button of the last row disappears with its row, and the focus would move on past
  // Add. The focus moves to Add once the row is gone and Add is registered again: the limit may
  // have disabled Add before the removal.
  const shouldFocusAddRef = useRef(false);
  useEffect(() => {
    if (shouldFocusAddRef.current) {
      shouldFocusAddRef.current = false;
      focus(addFocusId);
    }
  }, [rows.length, addFocusId, focus]);

  const addRow = () => {
    onValueChanged([...(value ?? []), {}]);
  };

  const removeRow = (index: number) => {
    const remaining = (value ?? []).filter((_, rowIndex) => rowIndex !== index);
    shouldFocusAddRef.current = index === remaining.length;
    // The rows hold object references from the store, so they are cloned before they are written
    // back.
    onValueChanged(structuredClone(remaining));
  };

  const isAddDisabled = templateData.limit ? templateData.limit === rowCount : false;

  return (
    <Field
      theme={theme}
      label={templateData.label as string}
      size={templateData.size}
      isRequired={isRequired}
      isFocused={isFocusInside}
      isTouched={isTouched}
      errors={errors}
    >
      {rows.map((row, index) => (
        <FocusPathProvider key={row.uid} index={index}>
          <Box
            flexDirection="column"
            borderStyle={theme.borderStyle}
            borderColor={theme.colors.border}
            paddingX={1}
          >
            <FocusPathProvider index={ROW_HEADER_INDEX}>
              <Box>
                {templateData.title ? (
                  <Text color={theme.colors.label} bold>
                    {`${templateData.title} ${index + 1} `}
                  </Text>
                ) : null}
                <FocusableButton
                  focusId={`${uid}__remove__${index}`}
                  label={templateData.removeLabel ?? 'Remove'}
                  onPress={() => removeRow(index)}
                />
              </Box>
            </FocusPathProvider>
            <FocusPathProvider index={ROW_FIELDS_INDEX}>
              <WidgetRenderer widget={row} />
            </FocusPathProvider>
          </Box>
        </FocusPathProvider>
      ))}
      <FocusPathProvider index={rows.length}>
        <FocusableButton
          focusId={addFocusId}
          label={templateData.addLabel ?? 'Add'}
          isDisabled={isAddDisabled}
          onPress={addRow}
        />
      </FocusPathProvider>
    </Field>
  );
}
