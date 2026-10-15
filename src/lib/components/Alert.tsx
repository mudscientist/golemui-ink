import type { DisplayWidget, WithWidget } from '@golemui/core';
import type { AlertProps } from '@golemui/gui-shared/internals';
import { useDisplayWidget } from '@golemui/react';
import { Box, Text } from 'ink';
import { useTheme, type Theme } from '../theme';

function levelColor(level: AlertProps['level'], theme: Theme): string {
  switch (level) {
    case 'info':
      return theme.colors.info;
    case 'success':
      return theme.colors.success;
    case 'warning':
      return theme.colors.warning;
    case 'error':
      return theme.colors.error;
    default:
      return theme.colors.border;
  }
}

/**
 * The `alert` display widget, drawn as a box whose border and text take the color of the level.
 *
 * It is not focusable, so Tab never stops on it, the same as the DOM `gui-alert`.
 */
export function Alert(widgetInstance: WithWidget) {
  const widget = widgetInstance.widget as DisplayWidget;
  const { templateData } = useDisplayWidget<AlertProps>(widget);

  const theme = useTheme();
  const color = levelColor(templateData.level, theme);

  return (
    <Box flexGrow={templateData.size ?? 1} flexBasis={0}>
      <Box borderStyle={theme.borderStyle} borderColor={color} paddingX={1} flexGrow={1}>
        <Text color={color}>{(templateData.text as string | undefined) ?? ''}</Text>
      </Box>
    </Box>
  );
}
