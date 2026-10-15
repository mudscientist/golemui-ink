import type { BoxProps } from 'ink';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

/**
 * A border style name of Ink's `Box` (`'round'`, `'single'`, `'classic'` and others), or a custom
 * style.
 */
export type ThemeBorderStyle = NonNullable<BoxProps['borderStyle']>;

/**
 * Colors, glyphs and the border style every ink widget reads before it renders.
 *
 * Color values are passed straight to Ink's `color` props, so they accept a chalk color name
 * ('cyan') or a hex string ('#00afff'). Glyphs are plain strings, so a host that knows its
 * terminal supports unicode can replace the ASCII defaults.
 */
export type Theme = {
  colors: {
    /** Undefined draws the terminal's own foreground, readable on dark and light backgrounds. */
    label: string | undefined;
    /** Undefined draws the terminal's own foreground, readable on dark and light backgrounds. */
    value: string | undefined;
    placeholder: string;
    focus: string;
    error: string;
    hint: string;
    border: string;
    disabled: string;
    /** The border and the text of an `info` alert. */
    info: string;
    /** The border and the text of a `success` alert. */
    success: string;
    /** The border and the text of a `warning` alert. */
    warning: string;
  };
  glyphs: {
    checkboxOn: string;
    checkboxOff: string;
    toggleOn: string;
    toggleOff: string;
    radioOn: string;
    radioOff: string;
    /** Drawn at the end of a closed select. */
    selectArrow: string;
    required: string;
    cursor: string;
    focusMarker: string;
  };
  /** The border of a repeater row and of an alert. */
  borderStyle: ThemeBorderStyle;
};

/**
 * The parts of a {@link Theme} a host replaces. Every key it leaves out keeps the value of
 * {@link defaultTheme}.
 *
 * @example
 * const theme: ThemeOverrides = { colors: { focus: '#00afff' }, glyphs: { checkboxOn: '[v]' } };
 */
export type ThemeOverrides = {
  colors?: Partial<Theme['colors']>;
  glyphs?: Partial<Theme['glyphs']>;
  borderStyle?: ThemeBorderStyle;
};

/**
 * The theme a form uses for every key the host does not replace. Every glyph is ASCII, so the
 * form renders the same in a terminal without a unicode font. The default border style draws box
 * drawing characters. `'classic'` is the ASCII border style.
 */
export const defaultTheme: Theme = {
  colors: {
    label: undefined,
    value: undefined,
    placeholder: 'gray',
    focus: 'cyan',
    error: 'red',
    hint: 'gray',
    border: 'gray',
    disabled: 'gray',
    info: 'blue',
    success: 'green',
    warning: 'yellow',
  },
  glyphs: {
    checkboxOn: '[x]',
    checkboxOff: '[ ]',
    toggleOn: '[on ]',
    toggleOff: '[off]',
    radioOn: '(*)',
    radioOff: '( )',
    selectArrow: 'v',
    required: '*',
    cursor: '_',
    focusMarker: '>',
  },
  borderStyle: 'round',
};

const ThemeContext = createContext<Theme>(defaultTheme);

// A key set to undefined keeps the default, the same as a key that is left out.
function definedEntries<Values extends object>(
  values: Partial<Values> | undefined,
): Partial<Values> {
  const entries = Object.entries(values ?? {}).filter(([, value]) => value !== undefined);
  return Object.fromEntries(entries) as Partial<Values>;
}

/** Props of {@link ThemeProvider}. */
export type ThemeProviderProps = {
  overrides?: ThemeOverrides;
  children: ReactNode;
};

/**
 * Gives every widget below it the default theme with the host overrides applied.
 *
 * @param props - The host overrides and the widget tree.
 * @returns The widget tree.
 */
export function ThemeProvider({ overrides, children }: ThemeProviderProps) {
  const colorOverrides = overrides?.colors;
  const glyphOverrides = overrides?.glyphs;
  const borderStyleOverride = overrides?.borderStyle;
  const theme = useMemo<Theme>(
    () => ({
      colors: { ...defaultTheme.colors, ...definedEntries(colorOverrides) },
      glyphs: { ...defaultTheme.glyphs, ...definedEntries(glyphOverrides) },
      borderStyle: borderStyleOverride ?? defaultTheme.borderStyle,
    }),
    [colorOverrides, glyphOverrides, borderStyleOverride],
  );
  return <ThemeContext value={theme}>{children}</ThemeContext>;
}

/**
 * Reads the theme of the form the widget renders in.
 *
 * @returns The theme this widget renders with.
 *
 * @example
 * const theme = useTheme();
 * return <Text color={theme.colors.label}>{templateData.label}</Text>;
 */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}
