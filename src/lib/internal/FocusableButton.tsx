import { Box, Text } from 'ink';
import { useTheme } from '../theme';
import { useFieldFocus } from './useFieldFocus';
import { useFocusedInput } from './useFocusedInput';

/** Props of {@link FocusableButton}. */
export type FocusableButtonProps = {
  /** The focus id. It must be unique in the form, so build it from the owning widget uid. */
  focusId: string;
  label: string;
  /** A disabled button is skipped by Tab and ignores Enter and Space. */
  isDisabled?: boolean;
  /** Called when the focused button receives Enter or Space. */
  onPress: () => void;
};

/**
 * A bracketed button that a widget draws for a control the form definition does not declare, such
 * as Add and Remove of the repeater. A button declared in the form is the `button` widget, which
 * reports its clicks to the form.
 *
 * It draws the focus marker like every other widget. The owner wraps it in a `FocusPathProvider`,
 * which decides where the button sits in the Tab order.
 *
 * @example
 * <FocusPathProvider index={rows.length}>
 *   <FocusableButton focusId={`${uid}__add`} label="Add" onPress={addRow} />
 * </FocusPathProvider>
 */
export function FocusableButton({ focusId, label, isDisabled, onPress }: FocusableButtonProps) {
  const theme = useTheme();
  const { isFocused } = useFieldFocus({ uid: focusId, isDisabled });

  useFocusedInput(focusId, {
    onKey: (input, key) => {
      if (key.return || input === ' ') {
        onPress();
      }
    },
  });

  return (
    <Box>
      <Text color={isFocused ? theme.colors.focus : theme.colors.border}>
        {isFocused ? `${theme.glyphs.focusMarker} ` : '  '}
      </Text>
      <Text
        color={isDisabled ? theme.colors.disabled : theme.colors.value}
        inverse={isFocused && !isDisabled}
      >
        [ {label} ]
      </Text>
    </Box>
  );
}
