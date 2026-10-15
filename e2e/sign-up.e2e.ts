import { describe, expect, it } from 'vitest';
import { bracketedPaste, focusedLine } from '../src/lib/spec-helpers/terminal-text';
import {
  exitWithCtrlC,
  expectFocusedLine,
  expectScreen,
  expectText,
  startPlayground,
} from './playground';

// A grapheme of three code points: woman, zero width joiner, laptop.
const WOMAN_TECHNOLOGIST = String.fromCodePoint(0x1f469, 0x200d, 0x1f4bb);

describe('sign-up form in a terminal', () => {
  it('moves the focus, shows the errors, takes text and a paste, submits and exits', async () => {
    const terminal = await startPlayground();

    await expectScreen(
      terminal,
      'first frame: heading, Email focused, password placeholder shown',
      (text) =>
        text.includes('Sign up') &&
        text.includes('Email*') &&
        focusedLine(text) === '> _' &&
        text.includes('Enter your password...') &&
        !text.includes('example@domain.com'),
    );

    await terminal.press('Tab');
    await expectScreen(
      terminal,
      'Tab on the empty Email shows the required error and focuses Password',
      (text) =>
        text.includes('This field is required') &&
        text.includes('Password*\n> _') &&
        text.includes('example@domain.com'),
    );

    await terminal.press('Shift+Tab');
    await expectScreen(terminal, 'Shift+Tab focuses Email again', (text) =>
      text.includes('Email*\n> _'),
    );

    expect((await terminal.state()).modes.bracketed_paste, 'bracketed paste mode is on').toBe(true);
    await terminal.write(bracketedPaste('joan@example.com\r\n'));
    await expectFocusedLine(
      terminal,
      'a bracketed paste with a line break inserts the text without the line break',
      '> joan@example.com_',
    );

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
    await expectScreen(
      terminal,
      'Tab focuses Password, which shows its errors because it was left empty before',
      (text) => text.includes('Password*\n> _') && text.includes('This field is required'),
    );

    await terminal.type('abc');
    await expectFocusedLine(terminal, 'the typed password is masked', '> ***_');

    await terminal.press('Tab');
    await expectScreen(
      terminal,
      'Tab on a short password shows the minLength error and focuses the checkbox',
      (text) =>
        text.includes('Too small') &&
        !text.includes('At least 6 characters') &&
        focusedLine(text) === '> [ ] Subscribe to the newsletter',
    );

    await terminal.press('Space');
    await expectFocusedLine(
      terminal,
      'Space checks the checkbox',
      '> [x] Subscribe to the newsletter',
    );

    await terminal.press('Enter');
    await expectScreen(
      terminal,
      'Enter on the checkbox moves to the button and keeps the value',
      (text) =>
        focusedLine(text) === '> [ Sign up ]' && text.includes('[x] Subscribe to the newsletter'),
    );

    await terminal.press('Shift+Tab');
    await expectFocusedLine(
      terminal,
      'Shift+Tab focuses the checkbox',
      '> [x] Subscribe to the newsletter',
    );

    await terminal.press('Shift+Tab');
    await expectFocusedLine(terminal, 'Shift+Tab focuses Password', '> ***_');

    await terminal.type('def');
    await expectScreen(
      terminal,
      'a password of 6 characters removes the minLength error',
      (text) => focusedLine(text) === '> ******_' && !text.includes('Too small'),
    );

    await terminal.press('Enter');
    await expectFocusedLine(
      terminal,
      'Enter on Password moves to the checkbox',
      '> [x] Subscribe to the newsletter',
    );

    await terminal.press('Enter');
    await expectFocusedLine(terminal, 'Enter on the checkbox moves to the button', '> [ Sign up ]');

    await terminal.press('Enter');
    await expectText(
      terminal,
      'Enter on the button prints the submit payload',
      '{"login":{"email":"joan@example.com","password":"abcdef","subscribe":true}}',
    );

    expect(await exitWithCtrlC(terminal), 'Ctrl+C ends the program with exit code 0').toBe(0);
  });
});
