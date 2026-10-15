import { describe, expect, it } from 'vitest';
import { bracketedPaste, focusedLine, keys } from '../src/lib/spec-helpers/terminal-text';
import {
  exitWithCtrlC,
  expectFocusedLine,
  expectScreen,
  expectText,
  startPlayground,
} from './playground';

const EURO = String.fromCharCode(0x20ac);

describe('order form in a terminal', () => {
  it('edits every data entry widget and the repeater, and submits with Ctrl+S', async () => {
    const terminal = await startPlayground({ form: 'order' });

    await expectScreen(
      terminal,
      'first frame: heading, alert, Plan focused with its value',
      (text) =>
        text.includes('Order') &&
        text.includes('Ctrl+S submits the form') &&
        focusedLine(text).startsWith('> [ Pro v]') &&
        text.includes(`${EURO}1,200.00`) &&
        text.includes('Anything we should know'),
    );

    await terminal.press('Enter');
    await expectScreen(
      terminal,
      'Enter opens the select panel',
      (text) => text.includes('Free') && text.includes('Team'),
    );

    // The panel marks the highlighted option with inverse video only.
    await terminal.press('Down');
    await terminal.getByText('Team').getByStyle({ inverse: true }).expect();
    await terminal.press('Enter');
    await expectScreen(
      terminal,
      'Down and Enter pick the next option and close the panel',
      (text) => focusedLine(text).startsWith('> [ Team v]') && !text.includes('Free'),
    );

    await terminal.press('Tab');
    await expectFocusedLine(terminal, 'Tab focuses Billing', (line) =>
      line.includes('> (*) Monthly'),
    );

    await terminal.press('Right');
    await expectFocusedLine(terminal, 'Right selects Yearly', (line) =>
      line.includes('> (*) Yearly'),
    );

    await terminal.press('Tab');
    await expectFocusedLine(terminal, 'Tab focuses Seats', (line) => line.startsWith('> 5_'));

    await terminal.press('Backspace');
    await expectFocusedLine(terminal, 'Backspace empties Seats', (line) => line.startsWith('> _'));

    await terminal.type('50');
    await expectFocusedLine(terminal, '50 typed', (line) => line.startsWith('> 50_'));

    await terminal.press('Up');
    await expectFocusedLine(terminal, 'Up at the maximum keeps 50', (line) =>
      line.startsWith('> 50_'),
    );

    await terminal.press('Down');
    await expectFocusedLine(terminal, 'Down steps to 49', (line) => line.startsWith('> 49_'));

    await terminal.press('Tab');
    await expectFocusedLine(
      terminal,
      'Tab focuses Budget, which shows the typed text and the formatted amount',
      (line) => line.includes(`> 1200_ ${EURO}1,200.00`),
    );

    await terminal.press('Down');
    await expectFocusedLine(terminal, 'Down steps by 100', (line) =>
      line.includes(`> 1100_ ${EURO}1,100.00`),
    );

    await terminal.press('Tab');
    await expectFocusedLine(terminal, 'Tab focuses the toggle', '> [on ] Send invoices by email');

    await terminal.press('Space');
    await expectFocusedLine(terminal, 'Space flips the toggle', '> [off] Send invoices by email');

    await terminal.press('Tab');
    await expectScreen(terminal, 'Tab focuses Notes', (text) => text.includes('Notes\n> _'));

    await terminal.type('line one');
    await expectFocusedLine(terminal, 'text typed into Notes', '> line one_');

    await terminal.press('Enter');
    await expectScreen(
      terminal,
      'Enter inserts a line break',
      (text) => text.includes('> line one\n') && text.includes('\n  _'),
    );

    await terminal.type('line two');
    await expectScreen(terminal, 'the second line is typed', (text) => text.includes('line two_'));

    await terminal.write(bracketedPaste('\r\na\r\nb'));
    await expectScreen(
      terminal,
      'a bracketed paste keeps its line breaks',
      (text) => text.includes('\n  a\n') && text.includes('b_'),
    );

    await terminal.write(keys.shiftEnterModifyOtherKeys);
    await expectScreen(
      terminal,
      'Shift+Enter in the modifyOtherKeys form inserts a line break, not text',
      (text) => text.includes('\n  b\n  _') && !text.includes('27;2;13'),
    );

    await terminal.type('c');
    await expectScreen(
      terminal,
      'the counter shows the remaining characters',
      (text) => text.includes('c_') && text.includes('177 / 200'),
    );

    await terminal.press('Tab');
    await expectFocusedLine(
      terminal,
      'Tab focuses the Remove button of row 1',
      'Contact 1 > [ Remove ]',
    );

    await terminal.press('Tab');
    await expectFocusedLine(terminal, 'Tab focuses the Name of row 1', (line) =>
      line.startsWith('> Ada Lovelace_'),
    );

    await terminal.press('Tab');
    await expectFocusedLine(terminal, 'Tab focuses the Email of row 1', (line) =>
      line.endsWith('> ada@example.com_'),
    );

    await terminal.press('Tab');
    await expectFocusedLine(terminal, 'Tab focuses Add', '> [ Add ]');

    await terminal.press('Enter');
    await expectScreen(
      terminal,
      'Enter on Add adds row 2',
      (text) => text.includes('Contact 2') && focusedLine(text) === '> [ Add ]',
    );

    await terminal.press('Enter');
    await expectScreen(
      terminal,
      'Enter on Add adds row 3, the limit disables Add and the focus moves to the submit button',
      (text) => text.includes('Contact 3') && focusedLine(text) === '> [ Place order ]',
    );

    await terminal.press('Shift+Tab');
    await expectFocusedLine(terminal, 'Shift+Tab focuses the Email of row 3', 'Full name > _');

    await terminal.press('Shift+Tab');
    await expectFocusedLine(
      terminal,
      'Shift+Tab focuses the Name of row 3',
      '> _ name@example.com',
    );

    await terminal.press('Shift+Tab');
    await expectFocusedLine(
      terminal,
      'Shift+Tab focuses the Remove button of row 3',
      'Contact 3 > [ Remove ]',
    );

    await terminal.press('Enter');
    await expectScreen(
      terminal,
      'removing the last row moves the focus to Add, enabled again',
      (text) => !text.includes('Contact 3') && focusedLine(text) === '> [ Add ]',
    );

    await terminal.press('Ctrl+S');
    await expectText(
      terminal,
      'Ctrl+S on Add submits the form through Place order',
      '{"order":{"plan":"Team","billing":"Yearly","seats":49,"budget":1100,"invoiceByEmail":false,' +
        '"notes":"line one\\nline two\\na\\nb\\nc",' +
        '"contacts":[{"name":"Ada Lovelace","email":"ada@example.com"},{}]}}',
    );

    expect(await exitWithCtrlC(terminal), 'Ctrl+C ends the program with exit code 0').toBe(0);
  });
});
