import type { FormEvent, FormSubmitEvent } from '@golemui/core';
import { cleanup } from 'ink-testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { focusedLine, keys, renderForm } from './spec-helpers/render-form';

const nameField = { uid: 'name', kind: 'input', type: 'textinput', path: 'name', label: 'Name' };

function button(uid: string, actionType: 'button' | 'submit', extra: Record<string, unknown> = {}) {
  return {
    uid,
    kind: 'action',
    type: 'button',
    actionType,
    label: uid,
    on: { click: uid },
    ...extra,
  };
}

describe('the keys of the whole form', () => {
  afterEach(() => {
    cleanup();
  });

  it('presses the first submit button in tab order on ctrl+s, and keeps the focus', async () => {
    const submitted: FormSubmitEvent[] = [];
    const events: FormEvent[] = [];
    const form = await renderForm(
      {
        formDef: {
          form: [
            nameField,
            button('preview', 'button'),
            button('save', 'submit'),
            button('publish', 'submit'),
          ],
        },
        data: { name: 'Ada' },
      },
      (event) => submitted.push(event),
      (event) => events.push(event),
    );
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> Ada_'));

    await form.press(keys.ctrlS);

    await vi.waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0].data).toEqual({ name: 'Ada' });
    expect(events.map((event) => event.name)).toEqual(['save']);
    expect(focusedLine(form.frame())).toBe('> Ada_');
  });

  it('does not submit on ctrl+s when the first submit button is disabled', async () => {
    const submitted: FormSubmitEvent[] = [];
    const form = await renderForm(
      {
        formDef: {
          form: [
            nameField,
            button('save', 'submit', { disabled: true }),
            button('publish', 'submit'),
          ],
        },
        data: { name: 'Ada' },
      },
      (event) => submitted.push(event),
    );
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> Ada_'));

    await form.press(keys.ctrlS);
    await form.press('x');

    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> Adax_'));
    expect(submitted).toHaveLength(0);
  });

  it('ignores ctrl+s in a form without a submit button and does not type it', async () => {
    const form = await renderForm({
      formDef: { form: [nameField, button('preview', 'button')] },
      data: { name: 'Ada' },
    });
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> Ada_'));

    await form.press(keys.ctrlS);
    await form.press('x');

    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> Adax_'));
  });

  it('reads shift+enter in the xterm modifyOtherKeys form as enter in a text field', async () => {
    const form = await renderForm({
      formDef: { form: [nameField, button('save', 'submit')] },
      data: { name: 'Ada' },
    });
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> Ada_'));

    await form.press(keys.shiftEnterModifyOtherKeys);

    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> [ save ]'));
    expect(form.frame()).not.toContain('27;2;13');
  });
});
