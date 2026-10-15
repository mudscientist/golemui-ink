import { stripAnsi } from './strip-ansi';

const ESCAPE_CHARACTER = String.fromCharCode(27);

describe('stripAnsi', () => {
  it('removes color sequences', () => {
    const frame = `${ESCAPE_CHARACTER}[31mError${ESCAPE_CHARACTER}[39m and ${ESCAPE_CHARACTER}[1;32mok${ESCAPE_CHARACTER}[0m`;

    expect(stripAnsi(frame)).toBe('Error and ok');
  });

  it('removes cursor movement and line erase sequences', () => {
    const frame = `${ESCAPE_CHARACTER}[2K${ESCAPE_CHARACTER}[1AName${ESCAPE_CHARACTER}[?25l`;

    expect(stripAnsi(frame)).toBe('Name');
  });

  it('returns text without escape sequences unchanged', () => {
    expect(stripAnsi('> Email\n  Password')).toBe('> Email\n  Password');
  });

  it('returns an empty string when there is no frame', () => {
    expect(stripAnsi(undefined)).toBe('');
  });
});
