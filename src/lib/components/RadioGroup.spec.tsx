import type { FormSubmitEvent } from '@golemui/core';
import { cleanup } from 'ink-testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { focusedLine, keys, renderForm } from '../spec-helpers/render-form';

function planForm(extra: Record<string, unknown> = {}, props: Record<string, unknown> = {}) {
  return {
    form: [
      {
        uid: 'plan',
        kind: 'input',
        type: 'radiogroup',
        path: 'plan',
        label: 'Plan',
        props: { options: ['Free', 'Pro', 'Team'], ...props },
        ...extra,
      },
      { uid: 'send', kind: 'action', type: 'button', actionType: 'submit', label: 'Send' },
    ],
  };
}

describe('the radiogroup widget', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders one line per option and marks the selected one', async () => {
    const form = await renderForm({ formDef: planForm(), data: { plan: 'Pro' } });

    await vi.waitFor(() => {
      const frame = form.frame();
      expect(frame).toContain('( ) Free');
      expect(focusedLine(frame)).toBe('> (*) Pro');
      expect(frame).toContain('( ) Team');
    });
  });

  it('selects with the arrows, wraps around, and submits the selected value', async () => {
    const submitted: FormSubmitEvent[] = [];
    const form = await renderForm({ formDef: planForm(), data: { plan: 'Pro' } }, (event) =>
      submitted.push(event),
    );
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> (*) Pro'));

    await form.press(keys.down);
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> (*) Team'));
    await form.press(keys.right);
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> (*) Free'));
    await form.press(keys.up);
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> (*) Team'));
    await form.press(keys.ctrlS);

    await vi.waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0].data).toEqual({ plan: 'Team' });
  });

  it('marks the first option while nothing is selected, and selects it with space', async () => {
    const form = await renderForm({ formDef: planForm(), data: {} });
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> ( ) Free'));

    await form.press(keys.space);

    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> (*) Free'));
  });

  it('shows no error for a stored value that matches no option, as the DOM widget does', async () => {
    const form = await renderForm({ formDef: planForm(), data: { plan: 'Gold' } });
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> ( ) Free'));

    await form.press(keys.tab);

    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> [ Send ]'));
    expect(form.frame()).not.toContain('Invalid');
    expect(form.frame()).not.toContain('(*)');
  });

  it('maps object options through labelField and valueField and keeps number values', async () => {
    const submitted: FormSubmitEvent[] = [];
    const form = await renderForm(
      {
        formDef: planForm(
          {},
          {
            options: [
              { name: 'Small', id: 1 },
              { name: 'Large', id: 2 },
            ],
            labelField: 'name',
            valueField: 'id',
          },
        ),
        data: { plan: 1 },
      },
      (event) => submitted.push(event),
    );
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> (*) Small'));

    await form.press(keys.down);
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> (*) Large'));
    await form.press(keys.ctrlS);

    await vi.waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0].data).toEqual({ plan: 2 });
  });

  it('ignores the arrows and space when the field is readonly', async () => {
    const form = await renderForm({
      formDef: planForm({ readonly: true }),
      data: { plan: 'Pro' },
    });
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> (*) Pro'));

    await form.press(keys.down);
    await form.press(keys.space);

    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> (*) Pro'));
  });

  it('moves to the next field on enter', async () => {
    const form = await renderForm({ formDef: planForm(), data: { plan: 'Pro' } });
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> (*) Pro'));

    await form.press(keys.enter);

    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> [ Send ]'));
  });
});
