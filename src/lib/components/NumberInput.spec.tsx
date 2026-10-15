import type { FormSubmitEvent } from '@golemui/core';
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

function amountForm(props: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) {
  return {
    form: [
      {
        uid: 'amount',
        kind: 'input',
        type: 'number',
        path: 'amount',
        label: 'Amount',
        props,
        ...extra,
      },
      submitButton,
    ],
  };
}

describe('the number widget', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the label and the stored number', async () => {
    const form = await renderForm({ formDef: amountForm(), data: { amount: 42 } });

    await vi.waitFor(() => {
      expect(form.frame()).toContain('Amount');
      expect(focusedLine(form.frame())).toBe('> 42_');
    });
  });

  it('accepts the characters of a browser number input and stores the parsed number', async () => {
    const submitted: FormSubmitEvent[] = [];
    const form = await renderForm({ formDef: amountForm(), data: {} }, (event) =>
      submitted.push(event),
    );
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> _'));

    await form.press('1');
    await form.press('x');
    await form.press('e');
    await form.press('3');
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> 1e3_'));
    await form.press(keys.ctrlS);

    await vi.waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0].data).toEqual({ amount: 1000 });
  });

  it('stores undefined for a text that is not a number and empties it when the focus leaves', async () => {
    const submitted: FormSubmitEvent[] = [];
    const form = await renderForm({ formDef: amountForm(), data: { amount: 5 } }, (event) =>
      submitted.push(event),
    );
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> 5_'));

    await form.press('e');
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> 5e_'));
    await form.press(keys.tab);

    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> [ Send ]'));
    expect(form.frame()).not.toContain('5e');
    await form.press(keys.enter);
    await vi.waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0].data.amount).toBeUndefined();
  });

  it('steps with the arrows and rounds the result to the decimals of the step', async () => {
    const form = await renderForm({ formDef: amountForm({ step: 0.1 }), data: { amount: 0.2 } });
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> 0.2_'));

    await form.press(keys.up);

    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> 0.3_'));
  });

  it('steps from 0 when empty and clamps to the maximum, then to the minimum', async () => {
    const form = await renderForm({
      formDef: amountForm({ step: 5, minimum: 0, maximum: 8 }),
      data: {},
    });
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> _'));

    await form.press(keys.up);
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> 5_'));
    await form.press(keys.up);
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> 8_'));
    await form.press(keys.down);
    await form.press(keys.down);
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> 0_'));
  });

  it('lets the minimum win when it is greater than the maximum, as the DOM widget does', async () => {
    const form = await renderForm({
      formDef: amountForm({ minimum: 5, maximum: 3 }),
      data: {},
    });
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> _'));

    await form.press(keys.up);

    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> 5_'));
  });

  it('ignores the arrows and typing when the field is readonly', async () => {
    const form = await renderForm({
      formDef: amountForm({}, { readonly: true }),
      data: { amount: 1 },
    });
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> 1_'));

    await form.press(keys.up);
    await form.press('2');

    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> 1_'));
  });

  it('moves to the next field on enter', async () => {
    const form = await renderForm({ formDef: amountForm(), data: { amount: 1 } });
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> 1_'));

    await form.press(keys.enter);

    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> [ Send ]'));
  });
});
