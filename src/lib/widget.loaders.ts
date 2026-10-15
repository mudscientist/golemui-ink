import type { WidgetLoaders, WithWidget } from '@golemui/core';
import type { ComponentType } from 'react';

/**
 * The widget types this set implements.
 *
 * The full `GolemWidget` union would require a loader for every catalog type, and `Partial<...>`
 * would accept a misspelled key. A form that uses another type fails through form health with a
 * message that names the type.
 */
export type InkWidgetType =
  | 'button'
  | 'checkbox'
  | 'currency'
  | 'grid'
  | 'markdownText'
  | 'number'
  | 'password'
  | 'textarea'
  | 'textinput'
  | 'toggle';

/** Lazy loaders for every widget the ink set renders, keyed by widget type. */
export const widgetLoaders: WidgetLoaders<ComponentType<WithWidget>, InkWidgetType> = {
  // INTERACTIVE
  button: async () => (await import('./components/Button')).Button,

  // CONTROLS
  checkbox: async () => (await import('./components/Checkbox')).Checkbox,
  currency: async () => (await import('./components/Currency')).Currency,
  number: async () => (await import('./components/NumberInput')).NumberInput,
  password: async () => (await import('./components/Password')).Password,
  textarea: async () => (await import('./components/TextArea')).TextArea,
  textinput: async () => (await import('./components/TextInput')).TextInput,
  toggle: async () => (await import('./components/Toggle')).Toggle,

  // LAYOUTS
  grid: async () => (await import('./components/Grid')).Grid,

  // DISPLAY
  markdownText: async () => (await import('./components/MarkdownText')).MarkdownText,
};
