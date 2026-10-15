import type { FormEvent, FormSubmitEvent } from '@golemui/core';
import type { GuiFormInitConfig } from '@golemui/gui-shared';
import { render as inkRender } from 'ink';
import { render } from 'ink-testing-library';
import { EventEmitter } from 'node:events';
import { GuiForm } from '../components/Form';
import { stripAnsi } from './strip-ansi';

export { bracketedPaste, focusedLine, keys } from './terminal-text';

/**
 * Lets Ink flush its render and the form focus effects.
 *
 * The first focus is given in a mount effect, so the very first frame shows no focused field.
 * Every spec waits once before it reads a frame or sends a key.
 */
export function tick(milliseconds = 20): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Waits until two consecutive polls return the same non-empty frame.
 *
 * Widgets are loaded through dynamic imports and focus is applied in an effect, so a key sent
 * too early is dropped by a widget that has not registered its input handler yet.
 */
async function waitForStableFrame(readFrame: () => string, attempts = 100): Promise<void> {
  let previous = readFrame();
  for (let attempt = 0; attempt < attempts; attempt++) {
    await tick();
    const current = readFrame();
    if (current !== '' && current === previous) {
      return;
    }
    previous = current;
  }
}

/**
 * Renders a GuiForm into Ink's testing renderer and waits for the first stable frame.
 *
 * @param config - The form config, usually just `{ formDef }`.
 * @param formSubmit - Receives the submit event, normally a spy.
 * @param formEvent - Receives the events a widget declares under `on`, normally a spy.
 * @returns The Ink testing instance plus `frame()` (ANSI stripped) and `press()`.
 *
 * @example
 * const form = await renderForm({ formDef });
 * await form.press('joan@example.com');
 * expect(form.frame()).toContain('joan@example.com');
 */
export async function renderForm(
  config: GuiFormInitConfig,
  formSubmit?: (event: FormSubmitEvent) => void,
  formEvent?: (event: FormEvent) => void,
) {
  // GuiForm preloads the widget set itself, so the first committed tree already holds every
  // widget and focus always starts on the first field of the definition.
  const instance = render(
    <GuiForm config={config} formSubmit={formSubmit} formEvent={formEvent} />,
  );
  const frame = () => stripAnsi(instance.lastFrame());
  await waitForStableFrame(frame);
  return {
    ...instance,
    frame,
    press: async (data: string) => {
      instance.stdin.write(data);
      await tick();
    },
  };
}

/** A stdout that keeps the last frame in memory instead of writing it to a terminal. */
class MemoryStdout extends EventEmitter {
  columns = 100;
  lastFrame = '';
  write = (frame: string) => {
    this.lastFrame = frame;
  };
}

/** A stdin that reports no terminal, which is what a closed or piped stdin looks like. */
class ClosedStdin extends EventEmitter {
  isTTY = false;
  /** Set when something asks for raw mode, which a host without a terminal cannot give. */
  wasRawModeRequested = false;
  read = () => null;
  setEncoding() {
    // Nothing to do, the fake stream holds no data.
  }
  setRawMode = () => {
    this.wasRawModeRequested = true;
  };
  ref() {
    // Nothing to do, the fake stream never keeps the process alive.
  }
  unref() {
    // Nothing to do, the fake stream never keeps the process alive.
  }
  resume() {
    // Nothing to do, the fake stream never delivers data.
  }
  pause() {
    // Nothing to do, the fake stream never delivers data.
  }
}

/**
 * Renders a GuiForm on a host that has no terminal, the way a piped or closed stdin looks.
 *
 * Ink's testing library always reports a terminal, so this one builds the streams itself.
 *
 * @param config - The form config, usually just `{ formDef }`.
 * @returns The Ink instance, `frame()` (ANSI stripped) and the stdin, which records whether
 * anything asked for raw mode.
 *
 * @example
 * const form = await renderFormWithoutTerminal({ formDef });
 * expect(form.frame()).toContain('The form is shown read-only.');
 * form.unmount();
 */
export async function renderFormWithoutTerminal(config: GuiFormInitConfig) {
  const stdout = new MemoryStdout();
  const stdin = new ClosedStdin();
  const instance = inkRender(<GuiForm config={config} />, {
    stdout: stdout as unknown as NodeJS.WriteStream,
    stdin: stdin as unknown as NodeJS.ReadStream,
    // Every frame is written whole, so the spec can read the last one.
    debug: true,
    exitOnCtrlC: false,
    patchConsole: false,
  });
  const frame = () => stripAnsi(stdout.lastFrame);
  await waitForStableFrame(frame);
  return { ...instance, frame, stdin };
}
