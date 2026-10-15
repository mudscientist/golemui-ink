import { identityTranslator, type FormSubmitEvent } from '@golemui/core';
import { cleanup } from 'ink-testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { focusedLine, keys, renderForm } from '../spec-helpers/render-form';

const submitButton = {
  uid: 'send',
  kind: 'action',
  type: 'button',
  actionType: 'submit',
  label: 'Send',
};

function priceForm(props: Record<string, unknown> = {}) {
  return {
    form: [
      { uid: 'first', kind: 'input', type: 'textinput', path: 'first', label: 'First' },
      { uid: 'price', kind: 'input', type: 'currency', path: 'price', label: 'Price', props },
      submitButton,
    ],
  };
}

describe('the currency widget', () => {
  afterEach(() => {
    cleanup();
  });

  it('formats the stored amount while the field is not focused', async () => {
    const form = await renderForm({
      formDef: priceForm(),
      data: { first: '', price: 1234.5 },
      localization: identityTranslator('en-US'),
    });

    await vi.waitFor(() => expect(form.frame()).toContain('$1,234.50'));
  });

  it('formats with the locale of the form and the currency and fraction digits of the props', async () => {
    const form = await renderForm({
      formDef: priceForm({ currency: 'EUR', maximumFractionDigits: 0 }),
      data: { first: '', price: 1234.5 },
      localization: identityTranslator('de-DE'),
    });

    // de-DE puts a no-break space between the amount and the euro sign.
    await vi.waitFor(() => expect(form.frame()).toMatch(/1\.235\s€/u));
  });

  it('shows the typed text and the formatted amount while focused, and stores a number', async () => {
    const submitted: FormSubmitEvent[] = [];
    const form = await renderForm(
      {
        formDef: priceForm(),
        data: { first: '' },
        localization: identityTranslator('en-US'),
      },
      (event) => submitted.push(event),
    );
    await form.press(keys.tab);
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> _'));

    await form.press('12.75');
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> 12.75_ $12.75'));

    await form.press(keys.tab);
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> [ Send ]'));
    expect(form.frame()).toContain('$12.75');
    await form.press(keys.enter);

    await vi.waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0].data).toEqual({ first: '', price: 12.75 });
  });

  it('steps with the arrows without bounds', async () => {
    const form = await renderForm({
      formDef: priceForm({ step: 0.5 }),
      data: { first: '', price: 0.5 },
      localization: identityTranslator('en-US'),
    });
    await form.press(keys.tab);
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> 0.5_ $0.50'));

    await form.press(keys.down);
    await form.press(keys.down);

    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> -0.5_ -$0.50'));
  });
});
