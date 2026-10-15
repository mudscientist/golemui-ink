import type { FormSubmitEvent } from '@golemui/core';
import { cleanup } from 'ink-testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { focusedLine, keys, renderForm } from '../spec-helpers/render-form';

function alertsForm(props: Record<string, unknown> = {}) {
  return {
    form: [
      { uid: 'alerts', kind: 'input', type: 'toggle', path: 'alerts', label: 'Alerts', props },
      { uid: 'send', kind: 'action', type: 'button', actionType: 'submit', label: 'Send' },
    ],
  };
}

describe('the toggle widget', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the off glyph before the label', async () => {
    const form = await renderForm({ formDef: alertsForm() });

    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> [off] Alerts'));
  });

  it('puts the glyph after the label when togglePosition is right', async () => {
    const form = await renderForm({ formDef: alertsForm({ togglePosition: 'right' }) });

    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> Alerts [off]'));
  });

  it('flips the value on space and submits a boolean', async () => {
    const submitted: FormSubmitEvent[] = [];
    const form = await renderForm({ formDef: alertsForm() }, (event) => submitted.push(event));
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> [off] Alerts'));

    await form.press(keys.space);
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> [on ] Alerts'));
    await form.press(keys.ctrlS);

    await vi.waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0].data).toEqual({ alerts: true });
  });

  it('moves to the next field without flipping when enter is pressed', async () => {
    const form = await renderForm({ formDef: alertsForm() });
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> [off] Alerts'));

    await form.press(keys.enter);

    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> [ Send ]'));
    expect(form.frame()).toContain('[off] Alerts');
  });
});
