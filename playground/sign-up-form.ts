import { gui, type GuiFormInitConfig } from '@golemui/gui-shared';

// The custom heading shows that a widget the host writes renders next to the built-in ones.
const customWidgetLoaders = {
  heading: async () => (await import('./heading')).Heading,
};

/** The sign-up form of the README quick start, plus the custom heading. */
export const signUpForm: GuiFormInitConfig = {
  formDef: [
    gui.layouts.grid([
      gui.displays.custom('heading', { text: 'Sign up' }),
      gui.displays.markdownText({ md: 'Tab moves between fields. Enter on the button submits.' }),
      gui.inputs.textInput('login.email', {
        label: 'Email',
        placeholder: 'example@domain.com',
        validator: { required: true },
      }),
      gui.inputs.password('login.password', {
        label: 'Password',
        placeholder: 'Enter your password...',
        hint: 'At least 6 characters',
        validator: { required: true, minLength: 6 },
      }),
      gui.inputs.checkbox('login.subscribe', { label: 'Subscribe to the newsletter' }),
      gui.actions.button({ label: 'Sign up', actionType: 'submit' }),
    ]),
  ],
  // Empty strings instead of no value, so an empty required field reports "This field is required".
  data: { login: { email: '', password: '', subscribe: false } },
  customWidgetLoaders,
};
