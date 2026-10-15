import { gui, type GuiFormInitConfig } from '@golemui/gui-shared';

// The custom heading shows that a widget the host writes renders next to the built-in ones.
const customWidgetLoaders = {
  heading: async () => (await import('./heading')).Heading,
};

/** An order form with the data entry widgets, the alert and the repeater. */
export const orderForm: GuiFormInitConfig = {
  formDef: [
    gui.layouts.grid([
      gui.displays.custom('heading', { text: 'Order' }),
      gui.displays.alert({
        text: 'Tab moves between fields. Ctrl+S submits the form from any field.',
        level: 'info',
      }),
      gui.layouts.horizontalGrid([
        gui.inputs.select('order.plan', {
          label: 'Plan',
          placeholder: 'Choose a plan',
          options: ['Free', 'Pro', 'Team'],
          validator: { type: 'string', required: true },
        }),
        gui.inputs.radiogroup('order.billing', {
          label: 'Billing',
          options: ['Monthly', 'Yearly'],
          direction: 'row',
        }),
      ]),
      gui.layouts.horizontalGrid([
        gui.inputs.numberInput('order.seats', {
          label: 'Seats',
          placeholder: '1 to 50',
          minimum: 1,
          maximum: 50,
          validator: { required: true, minimum: 1, maximum: 50 },
        }),
        gui.inputs.currency('order.budget', {
          label: 'Budget',
          placeholder: 'Amount',
          currency: 'EUR',
          step: 100,
        }),
      ]),
      gui.inputs.booleanInput('order.invoiceByEmail', { label: 'Send invoices by email' }),
      gui.inputs.textarea('order.notes', {
        label: 'Notes',
        placeholder: 'Anything we should know',
        minimumHeight: 60,
        validator: { maxLength: 200 },
      }),
      gui.inputs.repeater('order.contacts', {
        label: 'Contacts',
        title: 'Contact',
        limit: 3,
        template: [
          gui.layouts.horizontalGrid([
            gui.inputs.textInput('name', { label: 'Name', placeholder: 'Full name' }),
            gui.inputs.textInput('email', { label: 'Email', placeholder: 'name@example.com' }),
          ]),
        ],
      }),
      gui.actions.button({ label: 'Place order', actionType: 'submit' }),
    ]),
  ],
  data: {
    order: {
      plan: 'Pro',
      billing: 'Monthly',
      seats: 5,
      budget: 1200,
      invoiceByEmail: true,
      notes: '',
      contacts: [{ name: 'Ada Lovelace', email: 'ada@example.com' }],
    },
  },
  customWidgetLoaders,
};
