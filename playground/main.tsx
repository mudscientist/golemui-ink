import type { FormSubmitEvent } from '@golemui/core';
import type { GuiFormInitConfig } from '@golemui/gui-shared';
import { render } from 'ink';
import { GuiForm } from '../src/index';
import { orderForm } from './order-form';
import { signUpForm } from './sign-up-form';

const forms: Record<string, GuiFormInitConfig> = {
  'sign-up': signUpForm,
  order: orderForm,
};

// `npm start -- --form order` picks a form. Without the flag the playground shows the sign-up form.
function readFormName(argv: string[]): string {
  const flagIndex = argv.indexOf('--form');
  if (flagIndex === -1 || flagIndex + 1 >= argv.length) {
    return 'sign-up';
  }
  return argv[flagIndex + 1];
}

function onFormSubmit(event: FormSubmitEvent) {
  console.log(JSON.stringify(event.data));
}

const formName = readFormName(process.argv.slice(2));
const config = forms[formName];

if (!config) {
  console.error(`Unknown form "${formName}". Available forms: ${Object.keys(forms).join(', ')}`);
  process.exit(1);
}

render(<GuiForm config={config} formSubmit={onFormSubmit} />);
