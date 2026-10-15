import { cleanup } from 'ink-testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { focusedLine, keys, renderForm } from '../spec-helpers/render-form';

describe('the alert widget', () => {
  afterEach(() => {
    cleanup();
  });

  it('draws the text inside a box and is not focusable', async () => {
    const form = await renderForm({
      formDef: {
        form: [
          { uid: 'name', kind: 'input', type: 'textinput', path: 'name', label: 'Name' },
          {
            uid: 'notice',
            kind: 'display',
            type: 'alert',
            props: { text: 'Prices include VAT.', level: 'warning' },
          },
          { uid: 'send', kind: 'action', type: 'button', actionType: 'submit', label: 'Send' },
        ],
      },
      data: { name: '' },
    });
    await vi.waitFor(() => {
      expect(form.frame()).toMatch(/[|│] Prices include VAT\. +[|│]/u);
      expect(focusedLine(form.frame())).toBe('> _');
    });

    await form.press(keys.tab);

    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> [ Send ]'));
  });

  it('draws a round border by default', async () => {
    const form = await renderForm({
      formDef: {
        form: [
          {
            uid: 'notice',
            kind: 'display',
            type: 'alert',
            props: { text: 'Saved.', level: 'success' },
          },
        ],
      },
    });

    // The default 'round' style starts the top border with U+256D.
    await vi.waitFor(() => expect(form.frame()).toContain('╭'));
  });
});
