import type { FormSubmitEvent } from '@golemui/core';
import { cleanup } from 'ink-testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { focusedLine, keys, renderForm } from '../spec-helpers/render-form';

const COUNTRIES = ['Andorra', 'Belgium', 'Croatia'];

function countryForm(props: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) {
  return {
    form: [
      {
        uid: 'country',
        kind: 'input',
        type: 'select',
        path: 'country',
        label: 'Country',
        props: { options: COUNTRIES, ...props },
        ...extra,
      },
      { uid: 'send', kind: 'action', type: 'button', actionType: 'submit', label: 'Send' },
    ],
  };
}

describe('the select widget', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows the default placeholder text of the DOM select while nothing is selected', async () => {
    const form = await renderForm({ formDef: countryForm(), data: {} });

    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> [ Select an option v]'));
  });

  it('shows the placeholder prop instead of the default text', async () => {
    const form = await renderForm({ formDef: countryForm({ placeholder: 'Pick one' }), data: {} });

    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> [ Pick one v]'));
  });

  it('opens with enter, moves with the arrows, picks with enter and submits the value', async () => {
    const submitted: FormSubmitEvent[] = [];
    const form = await renderForm({ formDef: countryForm(), data: {} }, (event) =>
      submitted.push(event),
    );
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> [ Select an option v]'));

    await form.press(keys.enter);
    await vi.waitFor(() => expect(form.frame()).toContain('Croatia'));
    await form.press(keys.down);
    await form.press(keys.enter);

    await vi.waitFor(() => {
      expect(focusedLine(form.frame())).toBe('> [ Belgium v]');
      expect(form.frame()).not.toContain('Croatia');
    });
    await form.press(keys.ctrlS);
    await vi.waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0].data).toEqual({ country: 'Belgium' });
  });

  it('closes the panel with escape without a change', async () => {
    const form = await renderForm({ formDef: countryForm(), data: { country: 'Andorra' } });
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> [ Andorra v]'));

    await form.press(keys.space);
    await vi.waitFor(() => expect(form.frame()).toContain('Croatia'));
    await form.press(keys.down);
    await form.press(keys.escape);

    await vi.waitFor(() => {
      expect(form.frame()).not.toContain('Croatia');
      expect(focusedLine(form.frame())).toBe('> [ Andorra v]');
    });
  });

  it('closes the panel when the focus leaves the field', async () => {
    const form = await renderForm({ formDef: countryForm(), data: {} });
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> [ Select an option v]'));

    await form.press(keys.enter);
    await vi.waitFor(() => expect(form.frame()).toContain('Croatia'));
    await form.press(keys.tab);

    await vi.waitFor(() => {
      expect(focusedLine(form.frame())).toBe('> [ Send ]');
      expect(form.frame()).not.toContain('Croatia');
    });
  });

  it('shows at most 8 options and scrolls to keep the highlighted one visible', async () => {
    const options = Array.from({ length: 12 }, (_, index) => `Option ${index + 1}`);
    const form = await renderForm({ formDef: countryForm({ options }), data: {} });
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> [ Select an option v]'));

    await form.press(keys.enter);
    await vi.waitFor(() => expect(form.frame()).toContain('Option 8\n'));
    expect(form.frame()).not.toContain('Option 9');
    for (let press = 0; press < 9; press++) {
      await form.press(keys.down);
    }

    await vi.waitFor(() => {
      expect(form.frame()).toContain('Option 10');
      expect(form.frame()).not.toContain('Option 2\n');
    });
  });

  it('reports a stored value that matches no option until a valid option is picked', async () => {
    const form = await renderForm({ formDef: countryForm(), data: { country: 'Gold' } });

    await vi.waitFor(() =>
      expect(form.frame()).toContain("Invalid selection: 'Gold' is not a valid option."),
    );

    await form.press(keys.enter);
    await form.press(keys.enter);

    await vi.waitFor(() => {
      expect(focusedLine(form.frame())).toBe('> [ Andorra v]');
      expect(form.frame()).not.toContain('Invalid selection');
    });
  });

  it('uses the invalidOptionMessage prop and fills its value token', async () => {
    const form = await renderForm({
      formDef: countryForm({ invalidOptionMessage: '{value} is not sold here' }),
      data: { country: 'Gold' },
    });

    await vi.waitFor(() => expect(form.frame()).toContain('Gold is not sold here'));
  });

  it('reports nothing for an empty invalidOptionMessage or while there are no options', async () => {
    const form = await renderForm({
      formDef: {
        form: [
          ...countryForm({ invalidOptionMessage: '' }).form.slice(0, 1),
          {
            uid: 'city',
            kind: 'input',
            type: 'select',
            path: 'city',
            label: 'City',
            props: { options: [] },
          },
        ],
      },
      data: { country: 'Gold', city: 'Atlantis' },
    });
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> [ Select an option v]'));

    await form.press(keys.tab);
    await form.press(keys.tab);

    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> [ Select an option v]'));
    expect(form.frame()).not.toContain('Atlantis');
    expect(form.frame()).not.toContain('Invalid selection');
  });

  it('does not open when the field is readonly', async () => {
    const form = await renderForm({
      formDef: countryForm({}, { readonly: true }),
      data: { country: 'Andorra' },
    });
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> [ Andorra v]'));

    await form.press(keys.enter);
    await form.press(keys.space);

    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> [ Andorra v]'));
    expect(form.frame()).not.toContain('Belgium');
  });
});
