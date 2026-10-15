import type { FormSubmitEvent } from '@golemui/core';
import { cleanup } from 'ink-testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bracketedPaste, focusedLine, keys, renderForm } from '../spec-helpers/render-form';

const submitButton = {
  uid: 'send',
  kind: 'action',
  type: 'button',
  actionType: 'submit',
  label: 'Send',
};

function bioForm(props: Record<string, unknown> = {}, validator?: Record<string, unknown>) {
  return {
    form: [
      { uid: 'bio', kind: 'input', type: 'textarea', path: 'bio', label: 'Bio', props, validator },
      submitButton,
    ],
  };
}

describe('the textarea widget', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the label and the stored text on separate lines', async () => {
    const form = await renderForm({ formDef: bioForm(), data: { bio: 'first\nsecond' } });

    await vi.waitFor(() => {
      const lines = form.frame().split('\n');
      expect(lines.map((line) => line.trim())).toEqual(
        expect.arrayContaining(['Bio', '> first', 'second_']),
      );
    });
  });

  it('inserts a line break on enter and submits the whole text with ctrl+s', async () => {
    const submitted: FormSubmitEvent[] = [];
    const form = await renderForm({ formDef: bioForm(), data: { bio: '' } }, (event) =>
      submitted.push(event),
    );
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> _'));

    await form.press('one');
    await form.press(keys.enter);
    await form.press('two');
    await vi.waitFor(() => expect(form.frame()).toContain('two_'));

    await form.press(keys.ctrlS);

    await vi.waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0].data).toEqual({ bio: 'one\ntwo' });
    expect(focusedLine(form.frame())).toBe('> one');
  });

  it('inserts a line break for shift+enter sent in the xterm modifyOtherKeys form', async () => {
    const submitted: FormSubmitEvent[] = [];
    const form = await renderForm({ formDef: bioForm(), data: { bio: 'one' } }, (event) =>
      submitted.push(event),
    );
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> one_'));

    await form.press(keys.shiftEnterModifyOtherKeys);
    await form.press('two');
    await vi.waitFor(() => expect(form.frame()).toContain('two_'));
    await form.press(keys.ctrlS);

    await vi.waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0].data).toEqual({ bio: 'one\ntwo' });
  });

  it('moves the caret up and down and keeps the column across a shorter line', async () => {
    const form = await renderForm({ formDef: bioForm(), data: { bio: 'abcd\nx\nabcd' } });
    await vi.waitFor(() => expect(form.frame()).toContain('abcd_'));

    await form.press(keys.up);
    await vi.waitFor(() => expect(form.frame()).toContain('x_'));

    await form.press(keys.up);
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> abcd_'));
  });

  it('keeps the line breaks of a bracketed paste', async () => {
    const submitted: FormSubmitEvent[] = [];
    const form = await renderForm({ formDef: bioForm(), data: { bio: '' } }, (event) =>
      submitted.push(event),
    );
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> _'));

    await form.press(bracketedPaste('one\r\ntwo\rthree'));
    await vi.waitFor(() => expect(form.frame()).toContain('three_'));
    await form.press(keys.ctrlS);

    await vi.waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0].data).toEqual({ bio: 'one\ntwo\nthree' });
  });

  it('counts the remaining characters of the validator maxLength and allows more', async () => {
    const form = await renderForm({
      formDef: bioForm({}, { type: 'string', maxLength: 4 }),
      data: { bio: 'ab' },
    });
    await vi.waitFor(() => expect(form.frame()).toContain('2 / 4'));

    await form.press('cdef');

    await vi.waitFor(() => {
      expect(form.frame()).toContain('abcdef_');
      expect(form.frame()).toContain('-2 / 4');
    });
  });

  it('counts the current characters when counterMode is current', async () => {
    const form = await renderForm({
      formDef: bioForm({ counterMode: 'current' }, { type: 'string', maxLength: 4 }),
      data: { bio: 'abc' },
    });

    await vi.waitFor(() => expect(form.frame()).toContain('3 / 4'));
  });

  it('shows no counter for a maxLength in the props only, as the DOM widget does', async () => {
    const form = await renderForm({ formDef: bioForm({ maxLength: 4 }), data: { bio: 'ab' } });

    await vi.waitFor(() => expect(form.frame()).toContain('ab_'));
    expect(form.frame()).not.toContain('/ 4');
  });

  it('moves the caret but keeps the text when the field is readonly', async () => {
    const form = await renderForm({
      formDef: {
        form: [
          {
            uid: 'bio',
            kind: 'input',
            type: 'textarea',
            path: 'bio',
            label: 'Bio',
            readonly: true,
          },
        ],
      },
      data: { bio: 'ab' },
    });
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> ab_'));

    await form.press('x');
    await form.press(keys.left);

    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> a_b'));
  });

  it('skips a disabled field when tabbing', async () => {
    const form = await renderForm({
      formDef: {
        form: [
          { uid: 'first', kind: 'input', type: 'textinput', path: 'first', label: 'First' },
          {
            uid: 'bio',
            kind: 'input',
            type: 'textarea',
            path: 'bio',
            label: 'Bio',
            disabled: true,
          },
          submitButton,
        ],
      },
      data: { first: '', bio: '' },
    });
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> _'));

    await form.press(keys.tab);

    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> [ Send ]'));
  });
});
