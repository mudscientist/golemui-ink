import { type Backend } from '@microsoft/tui-test';
import { createTerminal, terminalSnapshot, type TuiTest } from '@microsoft/tui-test/test';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { focusedLine } from '../src/lib/spec-helpers/terminal-text';

const REPOSITORY_ROOT = fileURLToPath(new URL('..', import.meta.url));
const TSX_CLI = createRequire(import.meta.url).resolve('tsx/cli');

/** Where the terminal engine writes the screen and the timeline of a failed locator. */
export const ARTIFACTS_DIRECTORY = join(REPOSITORY_ROOT, 'e2e', 'artifacts');

export const TERMINAL_COLUMNS = 100;
export const TERMINAL_ROWS = 50;

// tsx transpiles the playground on the first start, which is slow on a CI runner.
const FIRST_FOCUS_TIMEOUT = 30_000;
const STEP_TIMEOUT = 10_000;
const EXIT_TIMEOUT = 10_000;
const POLL_INTERVAL = 50;
// The terminal can read a frame in more than one chunk, so a match is checked again after a pause.
const RECHECK_PAUSE = 150;

/** The forms of the playground, chosen with its `--form` flag. */
export type PlaygroundForm = 'sign-up' | 'order';

export interface PlaygroundOptions {
  /** The playground form. The default is `'sign-up'`. */
  form?: PlaygroundForm;
  /** The terminal emulator engine. The default is the engine's own default, `'alacritty'`. */
  backend?: Backend;
}

/**
 * Starts the playground in a pseudo terminal and waits until a field has the focus.
 *
 * The playground runs from the source through tsx, with the Node binary of the test process.
 *
 * @param options - The form and the terminal emulator engine.
 * @returns The terminal. `closeAllTracked()` in `e2e/setup.ts` closes it after each test.
 *
 * @example
 * const terminal = await startPlayground({ form: 'order' });
 * await terminal.press('Tab');
 */
export async function startPlayground(options: PlaygroundOptions = {}): Promise<TuiTest> {
  const { form = 'sign-up', backend } = options;
  const terminal = await createTerminal({
    program: [
      process.execPath,
      TSX_CLI,
      '--tsconfig',
      'tsconfig.playground.json',
      'playground/main.tsx',
      '--form',
      form,
    ],
    cwd: REPOSITORY_ROOT,
    cols: TERMINAL_COLUMNS,
    rows: TERMINAL_ROWS,
    backend,
    env: {
      // The program inherits CI=true on a CI runner, and Ink then writes no frame before it exits.
      CI: 'false',
      // Styles such as the select highlight must not depend on what the host sets.
      FORCE_COLOR: '1',
    },
    timeouts: { text: STEP_TIMEOUT },
    artifacts: { dir: ARTIFACTS_DIRECTORY, onFailure: 'all' },
  });
  await expectScreen(
    terminal,
    'a field has the focus',
    (text) => focusedLine(text) !== '',
    FIRST_FOCUS_TIMEOUT,
  );
  return terminal;
}

/**
 * Returns the visible screen as text, without trailing spaces and trailing empty rows.
 *
 * A row that the terminal wrapped is two lines here. `expectText` matches across the wrap.
 *
 * @param terminal - The terminal of `startPlayground`.
 * @returns The screen text.
 */
export async function screen(terminal: TuiTest): Promise<string> {
  return terminalSnapshot(await terminal.text());
}

/**
 * Waits until the screen matches, and fails with the step and the screen when it does not.
 *
 * @param terminal - The terminal of `startPlayground`.
 * @param step - What the check expects, shown when it fails.
 * @param isExpected - Receives the screen text from `screen()`.
 * @param timeout - Milliseconds to wait.
 *
 * @example
 * await expectScreen(terminal, 'the required error shows', (text) =>
 *   text.includes('This field is required'),
 * );
 */
export async function expectScreen(
  terminal: TuiTest,
  step: string,
  isExpected: (text: string) => boolean,
  timeout = STEP_TIMEOUT,
): Promise<void> {
  const deadline = Date.now() + timeout;
  let current = '';
  while (Date.now() < deadline) {
    current = await screen(terminal);
    if (isExpected(current)) {
      await sleep(RECHECK_PAUSE);
      current = await screen(terminal);
      if (isExpected(current)) {
        return;
      }
    }
    await sleep(POLL_INTERVAL);
  }
  throw new Error(
    `Step failed: ${step}\nFocused line: "${focusedLine(current)}"\n----- screen -----\n${current}`,
  );
}

/**
 * Waits until the focused line is the expected one.
 *
 * @param terminal - The terminal of `startPlayground`.
 * @param step - What the check expects, shown when it fails.
 * @param expected - The exact focused line from `focusedLine()`, or a test for it.
 *
 * @example
 * await expectFocusedLine(terminal, 'Tab focuses the button', '> [ Sign up ]');
 * await expectFocusedLine(terminal, 'Tab focuses Seats', (line) => line.startsWith('> 5_'));
 */
export async function expectFocusedLine(
  terminal: TuiTest,
  step: string,
  expected: string | ((line: string) => boolean),
): Promise<void> {
  const isExpected =
    typeof expected === 'string'
      ? (line: string) => line === expected
      : (line: string) => expected(line);
  await expectScreen(terminal, step, (text) => isExpected(focusedLine(text)));
}

/**
 * Waits until a text shows on the screen. The text can continue on the next row after a wrap.
 *
 * @param terminal - The terminal of `startPlayground`.
 * @param step - What the check expects, shown when it fails.
 * @param text - The exact text to find.
 *
 * @example
 * await expectText(terminal, 'Enter prints the submit payload', '{"login":{}}');
 */
export async function expectText(terminal: TuiTest, step: string, text: string): Promise<void> {
  try {
    await terminal.getByText(text).expect({ timeout: STEP_TIMEOUT });
  } catch (error) {
    throw new Error(`Step failed: ${step}\n----- screen -----\n${await screen(terminal)}`, {
      cause: error,
    });
  }
}

/**
 * Presses Tab until the focused line is the expected one, and waits for each Tab to move the focus.
 *
 * Each key goes in its own write: keys that arrive in one read reach Ink as one text chunk.
 *
 * @param terminal - The terminal of `startPlayground`.
 * @param expected - The focused line to stop at.
 * @param maximumTabs - How many Tabs to try before the check fails.
 *
 * @example
 * await tabTo(terminal, '> [ Add ]');
 */
export async function tabTo(terminal: TuiTest, expected: string, maximumTabs = 20): Promise<void> {
  for (let tabCount = 0; tabCount < maximumTabs; tabCount++) {
    const before = focusedLine(await screen(terminal));
    if (before === expected) {
      return;
    }
    await terminal.press('Tab');
    await expectScreen(
      terminal,
      `Tab moves the focus away from "${before}"`,
      (text) => focusedLine(text) !== before,
    );
  }
  await expectFocusedLine(terminal, `Tab reaches "${expected}"`, expected);
}

/**
 * Presses Ctrl+C and waits until the program has ended.
 *
 * @param terminal - The terminal of `startPlayground`.
 * @returns The exit code, or null when a signal ended the program.
 */
export async function exitWithCtrlC(terminal: TuiTest): Promise<number | null> {
  await terminal.press('Ctrl+C');
  await terminal.waitExit({ timeout: EXIT_TIMEOUT });
  return (await terminal.state()).exited;
}
