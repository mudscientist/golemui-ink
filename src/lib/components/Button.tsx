import type { ActionWidget, WithWidget } from '@golemui/core';
import type { ButtonProps } from '@golemui/gui-shared/internals';
import { useActionWidget } from '@golemui/react';
import { Box, Text } from 'ink';
import { useEffect, useEffectEvent } from 'react';
import { useFocusManager } from '../internal/focus/FocusManager';
import { useFieldFocus } from '../internal/useFieldFocus';
import { useFocusedInput } from '../internal/useFocusedInput';
import { useTheme } from '../theme';

/**
 * The `button` widget, drawn as a bracketed label. Focus shows as the focus marker in front of it,
 * like every other widget, plus inverse video for a terminal with colors. Enter and Space both
 * activate it.
 *
 * A submit button also takes Ctrl+S from any field of the form when it is the first submit button
 * in Tab order, the button that a browser clicks for Enter in a form field.
 *
 * `variant`, `icon` and `iconPosition` have no terminal equivalent and are ignored.
 */
export function Button(widgetInstance: WithWidget) {
  const widget = widgetInstance.widget as ActionWidget;
  const { uid, templateData, onClick, onSubmit } = useActionWidget<ButtonProps>(widget);

  const theme = useTheme();
  const isDisabled = templateData.disabled as boolean;
  const isSubmit = templateData.actionType === 'submit';
  const { isFocused } = useFieldFocus({ uid, isDisabled });
  const { setSubmitHandler } = useFocusManager();

  // The click event is what a host listens to, so it is emitted before the submit runs validation
  // and possibly reports the form as invalid. `onSubmit` does nothing for an action that is not a
  // submit.
  const press = () => {
    onClick();
    onSubmit();
  };

  useFocusedInput(uid, {
    onKey: (input, key) => {
      if (key.return || input === ' ') {
        press();
      }
    },
  });

  const onSubmitKey = useEffectEvent(press);
  useEffect(() => {
    if (!isSubmit) {
      return;
    }
    // The manager calls it from Ink's input event, the way an effect hands a callback to an event
    // source outside React.
    setSubmitHandler(uid, () => onSubmitKey());
    return () => {
      setSubmitHandler(uid, undefined);
    };
  }, [uid, isSubmit, setSubmitHandler]);

  return (
    <Box flexGrow={templateData.size ?? 1} flexBasis={0}>
      <Text color={isFocused ? theme.colors.focus : theme.colors.border}>
        {isFocused ? `${theme.glyphs.focusMarker} ` : '  '}
      </Text>
      <Text
        color={isDisabled ? theme.colors.disabled : theme.colors.value}
        inverse={isFocused && !isDisabled}
      >
        [ {templateData.label as string} ]
      </Text>
    </Box>
  );
}
