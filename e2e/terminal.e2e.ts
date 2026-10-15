import { describe, expect, it } from 'vitest';
import { focusedLine } from '../src/lib/spec-helpers/terminal-text';
import {
  TERMINAL_ROWS,
  exitWithCtrlC,
  expectFocusedLine,
  expectScreen,
  expectText,
  screen,
  startPlayground,
  tabTo,
} from './playground';

const WOMAN_TECHNOLOGIST = String.fromCodePoint(0x1f469, 0x200d, 0x1f4bb);
const ROUND_BOX_TOP_LEFT_CORNER = String.fromCharCode(0x256d);

function countLinesEqualTo(text: string, line: string): number {
  return text.split('\n').filter((screenLine) => screenLine.trim() === line).length;
}

// .editorconfig adds a final newline to every file, so the reference screens end with one.
function asFile(text: string): string {
  return `${text}\n`;
}

describe('terminal state', () => {
  it('turns bracketed paste on while the form runs and restores the terminal after Ctrl+C', async () => {
    const terminal = await startPlayground();
    const running = await terminal.state();
    expect(running.modes.bracketed_paste).toBe(true);

    expect(await exitWithCtrlC(terminal)).toBe(0);
    const ended = await terminal.state();
    expect(ended.modes.bracketed_paste).toBe(false);
    expect(ended.modes.cursor_visible).toBe(true);
  });
});

describe('screens', () => {
  it('draws the first frame of the sign-up form', async () => {
    const terminal = await startPlayground();
    await expectFocusedLine(terminal, 'Email has the focus', '> _');
    await expect(asFile(await screen(terminal))).toMatchFileSnapshot(
      'screens/sign-up-first-frame.txt',
    );
  });

  it('draws the order form and erases the select panel when it closes', async () => {
    const terminal = await startPlayground({ form: 'order' });
    await expectFocusedLine(terminal, 'Plan has the focus', (line) =>
      line.startsWith('> [ Pro v]'),
    );
    const firstFrame = await screen(terminal);
    await expect(asFile(firstFrame)).toMatchFileSnapshot('screens/order-first-frame.txt');

    await terminal.press('Enter');
    await expectScreen(terminal, 'Enter opens the select panel', (text) => text.includes('Free'));
    await expect(asFile(await screen(terminal))).toMatchFileSnapshot(
      'screens/order-select-open.txt',
    );

    await terminal.press('Escape');
    await expectScreen(
      terminal,
      'Escape closes the panel, and the screen is the first frame again',
      (text) => text === firstFrame,
    );
  });

  it('draws the repeater rows and erases a removed row', async () => {
    const terminal = await startPlayground({ form: 'order' });
    await tabTo(terminal, '> [ Add ]');

    await terminal.press('Enter');
    await expectScreen(
      terminal,
      'Enter on Add adds row 2',
      (text) => text.includes('Contact 2') && focusedLine(text) === '> [ Add ]',
    );
    const twoRows = await screen(terminal);

    await terminal.press('Enter');
    await expectScreen(terminal, 'Enter on Add adds row 3', (text) => text.includes('Contact 3'));
    await expect(asFile(await screen(terminal))).toMatchFileSnapshot(
      'screens/order-three-contacts.txt',
    );

    for (const step of ['Email of row 3', 'Name of row 3', 'Remove of row 3']) {
      const before = focusedLine(await screen(terminal));
      await terminal.press('Shift+Tab');
      await expectScreen(
        terminal,
        `Shift+Tab focuses the ${step}`,
        (text) => focusedLine(text) !== before,
      );
    }
    await expectFocusedLine(terminal, 'Remove of row 3 has the focus', 'Contact 3 > [ Remove ]');

    await terminal.press('Enter');
    await expectScreen(
      terminal,
      'removing row 3 leaves the screen of two rows, with no line of the removed row',
      (text) => text === twoRows,
    );
  });
});

describe('resize', () => {
  it('draws one frame after the terminal gets narrower and wider again', async () => {
    const terminal = await startPlayground({ form: 'order' });
    await expectFocusedLine(terminal, 'Plan has the focus', (line) =>
      line.startsWith('> [ Pro v]'),
    );
    const firstFrame = await screen(terminal);

    await terminal.resize(70, TERMINAL_ROWS);
    await expectScreen(
      terminal,
      'at 70 columns the heading shows once and both boxes are 70 columns wide',
      (text) => {
        const topBorders = text
          .split('\n')
          .filter((line) => line.startsWith(ROUND_BOX_TOP_LEFT_CORNER));
        return (
          countLinesEqualTo(text, 'Order') === 1 &&
          topBorders.length === 2 &&
          topBorders.every((line) => [...line].length === 70)
        );
      },
    );

    await terminal.press('Tab');
    await expectFocusedLine(terminal, 'at 70 columns Tab focuses Billing', (line) =>
      line.includes('> (*) Monthly'),
    );
    await terminal.press('Shift+Tab');
    await expectFocusedLine(terminal, 'Shift+Tab focuses Plan again', (line) =>
      line.startsWith('> [ Pro v]'),
    );

    await terminal.resize(100, TERMINAL_ROWS);
    await expectScreen(
      terminal,
      'at 100 columns the screen is the first frame again',
      (text) => text === firstFrame,
    );
  });
});

// Ghostty and the VS Code terminal (xterm.js) are two of the terminals the keyboard is checked in.
describe.each(['ghostty', 'xtermjs'] as const)('the %s terminal engine', (backend) => {
  it('takes text, deletes an emoji with one Backspace and submits with Ctrl+S', async () => {
    const terminal = await startPlayground({ backend });

    await terminal.type('joan@example.com');
    await expectFocusedLine(terminal, 'Email typed', '> joan@example.com_');

    await terminal.write(WOMAN_TECHNOLOGIST);
    await expectFocusedLine(
      terminal,
      'an emoji of three code points is typed',
      `> joan@example.com${WOMAN_TECHNOLOGIST}_`,
    );

    await terminal.press('Backspace');
    await expectFocusedLine(
      terminal,
      'one Backspace deletes the whole emoji',
      '> joan@example.com_',
    );

    await terminal.press('Tab');
    await expectScreen(terminal, 'Tab focuses Password', (text) => text.includes('Password*\n> _'));

    await terminal.type('abcdef');
    await expectFocusedLine(terminal, 'the password is typed and masked', '> ******_');

    await terminal.press('Ctrl+S');
    await expectText(
      terminal,
      'Ctrl+S submits the form through Sign up',
      '{"login":{"email":"joan@example.com","password":"abcdef","subscribe":false}}',
    );
  });
});
