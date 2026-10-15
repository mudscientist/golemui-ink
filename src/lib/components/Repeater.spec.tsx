import type { FormEvent, FormSubmitEvent } from '@golemui/core';
import { cleanup } from 'ink-testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { focusedLine, keys, renderForm } from '../spec-helpers/render-form';

// A repeater template is always a layout widget. The decoder rejects an input widget there.
const template = {
  uid: 'person',
  kind: 'layout',
  type: 'grid',
  children: [
    {
      uid: 'person-name',
      kind: 'input',
      type: 'textinput',
      path: 'people.items.name',
      label: 'Name',
    },
  ],
};

const repeaterWidget = {
  uid: 'people',
  kind: 'input',
  type: 'repeater',
  path: 'people',
  label: 'People',
  props: { title: 'Person', addLabel: 'Add', removeLabel: 'Remove', template },
};

const sendButton = {
  uid: 'send',
  kind: 'action',
  type: 'button',
  actionType: 'submit',
  label: 'Send',
};

const formDef = { form: [repeaterWidget, sendButton] };

function withRepeaterProps(props: Record<string, unknown>) {
  return {
    form: [{ ...repeaterWidget, props: { ...repeaterWidget.props, ...props } }, sendButton],
  };
}

type RenderedForm = Awaited<ReturnType<typeof renderForm>>;

/** Reads the focused line, presses Tab, and repeats, so one assertion can name the whole order. */
async function tabThrough(form: RenderedForm, stops: number): Promise<string[]> {
  const visited: string[] = [];
  for (let stop = 0; stop < stops; stop++) {
    const previous = focusedLine(form.frame());
    visited.push(previous);
    await form.press(keys.tab);
    await vi.waitFor(() => expect(focusedLine(form.frame())).not.toBe(previous));
  }
  return visited;
}

describe('the repeater widget', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the label and an add button when the array is empty', async () => {
    const form = await renderForm({ formDef });

    await vi.waitFor(() => {
      expect(form.frame()).toContain('People');
      expect(focusedLine(form.frame())).toBe('> [ Add ]');
    });
    expect(form.frame()).not.toContain('Person 1');
  });

  it('numbers the rows and renders one remove button per row', async () => {
    const form = await renderForm({
      formDef,
      data: { people: [{ name: 'Ada' }, { name: 'Bo' }] },
    });

    await vi.waitFor(() => {
      const frame = form.frame();
      expect(frame).toContain('Person 1');
      expect(frame).toContain('Person 2');
      expect(frame).toContain('Ada');
      expect(frame).toContain('Bo');
    });
    expect(form.frame().match(/\[ Remove \]/g)).toHaveLength(2);
  });

  it('draws no row title when the title prop is not set', async () => {
    const form = await renderForm({
      formDef: withRepeaterProps({ title: undefined }),
      data: { people: [{ name: 'Ada' }] },
    });

    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> [ Remove ]'));
    expect(form.frame()).not.toContain('1');
  });

  it('reaches the remove button of a row before its fields, then add and submit', async () => {
    const form = await renderForm({ formDef, data: { people: [{ name: 'Ada' }] } });
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('Person 1 > [ Remove ]'));

    // The fifth stop is the first one again, which is the wrap at the end of the form.
    expect(await tabThrough(form, 5)).toEqual([
      'Person 1 > [ Remove ]',
      '> Ada_',
      '> [ Add ]',
      '> [ Send ]',
      'Person 1 > [ Remove ]',
    ]);
  });

  it('reaches a row added at runtime in the place where it is drawn', async () => {
    const form = await renderForm({ formDef, data: { people: [{ name: 'Ada' }] } });
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('Person 1 > [ Remove ]'));

    await form.press(keys.tab);
    await form.press(keys.tab);
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> [ Add ]'));
    await form.press(keys.enter);
    await vi.waitFor(() => expect(form.frame()).toContain('Person 2'));

    // Back to the top of the form, so the order reads from the first stop.
    await form.press(keys.tab);
    await form.press(keys.tab);
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('Person 1 > [ Remove ]'));

    expect(await tabThrough(form, 6)).toEqual([
      'Person 1 > [ Remove ]',
      '> Ada_',
      'Person 2 > [ Remove ]',
      '> _',
      '> [ Add ]',
      '> [ Send ]',
    ]);
  });

  it('keeps the focus on the remove button at the same place when a row that is not the last is removed', async () => {
    const form = await renderForm({
      formDef,
      data: { people: [{ name: 'Ada' }, { name: 'Bo' }] },
    });
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('Person 1 > [ Remove ]'));

    await form.press(keys.enter);

    await vi.waitFor(() => {
      expect(form.frame()).not.toContain('Ada');
      expect(form.frame()).not.toContain('Person 2');
    });
    expect(focusedLine(form.frame())).toBe('Person 1 > [ Remove ]');
    expect(await tabThrough(form, 2)).toEqual(['Person 1 > [ Remove ]', '> Bo_']);
  });

  it('moves the focus to the add button when the last row is removed', async () => {
    const form = await renderForm({
      formDef,
      data: { people: [{ name: 'Ada' }, { name: 'Bo' }] },
    });
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('Person 1 > [ Remove ]'));
    await form.press(keys.tab);
    await form.press(keys.tab);
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('Person 2 > [ Remove ]'));

    await form.press(keys.enter);

    await vi.waitFor(() => {
      expect(form.frame()).not.toContain('Person 2');
      expect(focusedLine(form.frame())).toBe('> [ Add ]');
    });
  });

  it('moves the focus to the add button that the limit disabled when the last row is removed', async () => {
    const form = await renderForm({
      formDef: withRepeaterProps({ limit: 1 }),
      data: { people: [{ name: 'Ada' }] },
    });
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('Person 1 > [ Remove ]'));

    await form.press(keys.enter);

    await vi.waitFor(() => {
      expect(form.frame()).not.toContain('Person 1');
      expect(focusedLine(form.frame())).toBe('> [ Add ]');
    });
  });

  it('disables the add button once the limit is reached, so Tab skips it', async () => {
    const form = await renderForm({ formDef: withRepeaterProps({ limit: 1 }) });
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> [ Add ]'));

    await form.press(keys.enter);
    await vi.waitFor(() => expect(form.frame()).toContain('Person 1'));

    expect(await tabThrough(form, 3)).toEqual(['> [ Send ]', 'Person 1 > [ Remove ]', '> _']);
  });

  it('adds two rows, types into both, removes the first, and submits the second value', async () => {
    const submitted: FormSubmitEvent[] = [];
    const form = await renderForm({ formDef }, (event) => submitted.push(event));
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> [ Add ]'));

    await form.press(keys.enter);
    await vi.waitFor(() => expect(form.frame()).toContain('Person 1'));
    await form.press(keys.enter);
    await vi.waitFor(() => expect(form.frame()).toContain('Person 2'));

    // Shift+Tab from Add: the field of row 2, its remove button, the field of row 1.
    await form.press(keys.shiftTab);
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> _'));
    await form.press('Bo');
    await form.press(keys.shiftTab);
    await form.press(keys.shiftTab);
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> _'));
    await form.press('Ada');
    await form.press(keys.shiftTab);
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('Person 1 > [ Remove ]'));

    await form.press(keys.enter);
    await vi.waitFor(() => {
      expect(form.frame()).not.toContain('Ada');
      expect(form.frame()).toContain('Bo');
      expect(form.frame()).not.toContain('Person 2');
    });

    await form.press(keys.ctrlS);
    await vi.waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0].data).toEqual({ people: [{ name: 'Bo' }] });
  });

  it('validates the array when the focus leaves the repeater', async () => {
    const requiredFormDef = {
      form: [{ ...repeaterWidget, validator: { type: 'array', required: true } }, sendButton],
    };
    const form = await renderForm({ formDef: requiredFormDef, data: { people: [] } });
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> [ Add ]'));
    expect(form.frame()).not.toContain('This field is required');

    await form.press(keys.tab);

    await vi.waitFor(() => expect(form.frame()).toContain('This field is required'));
  });

  it('emits one blur when the focus leaves the repeater, and none while it moves inside', async () => {
    const events: FormEvent[] = [];
    const blurringFormDef = {
      form: [{ ...repeaterWidget, on: { blur: 'peopleBlurred' } }, sendButton],
    };
    const form = await renderForm(
      { formDef: blurringFormDef, data: { people: [{ name: 'Ada' }] } },
      undefined,
      (event) => events.push(event),
    );
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('Person 1 > [ Remove ]'));

    // The remove button, the row field and the add button all sit inside the repeater.
    await form.press(keys.tab);
    await form.press(keys.tab);
    await vi.waitFor(() => expect(focusedLine(form.frame())).toBe('> [ Add ]'));
    expect(events).toHaveLength(0);

    await form.press(keys.tab);

    await vi.waitFor(() => expect(events.map((event) => event.name)).toEqual(['peopleBlurred']));
  });
});
