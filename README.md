# golemui-ink

Terminal widgets for [GolemUI](https://golemui.com) form definitions. A form definition in JSON,
or built with the `gui` builder, renders in a terminal through [Ink](https://github.com/vadimdemedes/ink).

`golemui-ink` is an independent package. It is not part of GolemUI and is not maintained by the
GolemUI project. It uses the published `@golemui/*` packages.

## Status

In development. The package is not published on npm yet, so the install command below works only
after the first release.

## Requirements

- Node 22 or later.
- React 19.2 or later, and Ink 7.
- A real terminal. Without one, for example when stdin is a pipe, the form shows its values and
  one notice line, and reads no keys.

The host program calls Ink's `render`. This package exports components only. It never starts an
Ink instance itself.

## Install

```bash
npm install golemui-ink @golemui/core@2.1.0-rc.0 @golemui/react@2.1.0-rc.0 @golemui/gui-shared@2.1.0-rc.0 ink@^7 react
```

This version of `golemui-ink` locks the `@golemui/*` packages at `2.1.0-rc.0`. Install every
`@golemui/*` package at exactly that version. `golemui-ink` uses internal parts of
`@golemui/gui-shared`, and those parts can change in any GolemUI release.

## Quick start

A complete program in an empty folder. The `.tsx` file runs with [tsx](https://tsx.is), because
Node does not run JSX.

1. Create `package.json`. Ink and the `@golemui/*` packages are ES modules only.

   ```json
   {
     "private": true,
     "type": "module"
   }
   ```

2. Install the packages of the [Install](#install) section, and `tsx`:

   ```bash
   npm install --save-dev tsx
   ```

3. Create `tsconfig.json`. tsx reads the `jsx` option from it.

   ```json
   {
     "compilerOptions": {
       "jsx": "react-jsx",
       "module": "esnext",
       "moduleResolution": "bundler",
       "target": "es2022",
       "strict": true,
       "skipLibCheck": true
     }
   }
   ```

4. Create `main.tsx`:

   ```tsx
   import { type FormSubmitEvent } from '@golemui/core';
   import { gui, type GuiFormInitConfig } from '@golemui/gui-shared';
   import { GuiForm } from 'golemui-ink';
   import { render } from 'ink';

   const config: GuiFormInitConfig = {
     formDef: [
       gui.layouts.grid([
         gui.inputs.textInput('login.email', {
           label: 'Email',
           placeholder: 'example@domain.com',
         }),
         gui.inputs.password('login.password', {
           label: 'Password',
           placeholder: 'Enter your password...',
         }),
         gui.actions.button({ label: 'Sign up', actionType: 'submit' }),
       ]),
     ],
     data: { login: { email: '', password: '' } },
   };

   const instance = render(
     <GuiForm
       config={config}
       formSubmit={(event: FormSubmitEvent) => {
         console.log(JSON.stringify(event.data, null, 2));
         instance.unmount();
       }}
     />,
   );
   ```

5. Run it in a terminal:

   ```bash
   npx tsx main.tsx
   ```

Tab moves between the fields. Enter on the button prints the form data and ends the program.

## Usage

`GuiForm` takes these props:

| Prop                  | Description                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------- |
| `config`              | The form definition, the data and the custom widget loaders (`GuiFormInitConfig`).       |
| `formSubmit`          | Receives the submit event.                                                               |
| `formEvent`           | Receives the events that the widgets declare under `on`.                                 |
| `formHealth`          | Receives every change of the form health.                                                |
| `formHealthBoundary`  | Replaces the red box that shows an errored form health. The form stays visible below it. |
| `widgetErrorFallback` | Replaces the red box that shows a widget that threw while it rendered.                   |
| `theme`               | Replaces colors and glyphs of the default theme. See [Theme](#theme).                    |
| `ref`                 | Receives the `setData` and `setMeta` handle of the form.                                 |

The widgets load through dynamic imports. `GuiForm` loads its own widgets and the
`customWidgetLoaders` of the config before the first frame. The whole widget tree then mounts in
one React commit, and the focus starts on the first field of the definition.

A custom widget must render Ink components, for example `Box` and `Text`. This version exports no
focus API, so a custom widget cannot take the keyboard focus.

## Keyboard

- Tab moves to the next field. Shift+Tab moves to the previous field. The order is the order in
  which the widgets are drawn.
- Enter in a text field moves to the next field. In a browser, a click outside the input does
  the same. It marks the field as touched and runs the validation that a blur runs.
- Left, Right, Home, End, Backspace and Delete edit the text at the caret. They move and delete
  one visible character, also when the character has several code points (an emoji, for example).
- Space toggles a checkbox. Enter on a checkbox moves to the next field, as in a text field.
- A paste into a text field is inserted as one text. Line breaks and other control characters are
  removed, as a browser does for a single-line input.
- Space or Enter on a button clicks it. When its `actionType` is `submit`, it also submits the
  form.
- Ctrl+C ends the program. This is the Ink default.

## Widgets

The set implements six widget types. A form that uses any other type shows a form health error
that names the type.

| Type           | In the terminal                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------ |
| `grid`         | Stacks, rows, a fixed number of columns, or `columns: 'auto'`. Gaps are counted in terminal cells.                 |
| `textinput`    | One line with a caret.                                                                                             |
| `password`     | Like `textinput`, but draws one `*` for each character.                                                            |
| `checkbox`     | The glyph and the label on one line.                                                                               |
| `button`       | The label between brackets. The focus marker shows the focus, and also inverse video when the terminal has colors. |
| `markdownText` | The markdown source as plain text.                                                                                 |

## Differences from the DOM widget sets

- `markdownText` does not parse the markdown, so markup characters stay visible.
- A grid does not stack its children in a narrow terminal.
- `flex` is not implemented. It is deprecated since GolemUI 2.0. Use `grid`.
- `password` has no reveal toggle. `showPasswordIcon` and the related props are ignored.
- `button` ignores `variant`, `icon` and `iconPosition`.
- A placeholder is hidden while its field has the focus.
- A validation error replaces the hint of its field. It does not show below the hint.

## Theme

Every widget reads its colors and glyphs from the form theme. The `theme` prop replaces single
keys of `defaultTheme`. Every key that it leaves out, or sets to `undefined`, keeps its default.
Colors go to the `color` props of Ink unchanged, so a chalk color name and a hex string both work.
A color with no default uses the terminal's own foreground color, which is readable on a dark and
on a light background. The default glyphs are ASCII, so the form looks the same in a terminal
without a unicode font.

```tsx
import { GuiForm } from 'golemui-ink';

<GuiForm
  config={{ formDef }}
  theme={{
    colors: { focus: '#00afff' },
    glyphs: { checkboxOn: '[v]' },
  }}
/>;
```

| Key                  | Default | Used for                                      |
| -------------------- | ------- | --------------------------------------------- |
| `colors.label`       | none    | Field labels.                                 |
| `colors.value`       | none    | Field values and button labels.               |
| `colors.placeholder` | `gray`  | Placeholders.                                 |
| `colors.focus`       | `cyan`  | The focus marker.                             |
| `colors.error`       | `red`   | Validation errors.                            |
| `colors.hint`        | `gray`  | Hints.                                        |
| `colors.border`      | `gray`  | The space of the focus marker when unfocused. |
| `colors.disabled`    | `gray`  | Values of disabled fields.                    |
| `glyphs.checkboxOn`  | `[x]`   | A checked checkbox.                           |
| `glyphs.checkboxOff` | `[ ]`   | An unchecked checkbox.                        |
| `glyphs.required`    | `*`     | The mark after the label of a required field. |
| `glyphs.cursor`      | `_`     | The caret of the focused text field.          |
| `glyphs.focusMarker` | `>`     | The mark in front of the focused widget.      |

## Links

- Form definitions and the `gui` builder: [golemui.com](https://golemui.com)
- Issues: [github.com/mudscientist/golemui-ink/issues](https://github.com/mudscientist/golemui-ink/issues)

## License

[MIT](LICENSE)
