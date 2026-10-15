import type { Key } from 'ink';
import { describe, expect, it } from 'vitest';
import { toModifiedEnter } from './modified-enter';

// What Ink 7 passes with the text of an unknown escape sequence: no flag is set.
const noKey = {
  upArrow: false,
  downArrow: false,
  leftArrow: false,
  rightArrow: false,
  pageDown: false,
  pageUp: false,
  home: false,
  end: false,
  return: false,
  escape: false,
  ctrl: false,
  shift: false,
  tab: false,
  backspace: false,
  delete: false,
  meta: false,
  super: false,
  hyper: false,
  capsLock: false,
  numLock: false,
} as Key;

describe('reading enter with modifiers in the xterm modifyOtherKeys form', () => {
  it('reads the shift, ctrl and alt bits of the modifier parameter', () => {
    expect(toModifiedEnter('[27;2;13~', noKey)).toEqual({
      input: '\r',
      key: { ...noKey, return: true, shift: true },
    });
    expect(toModifiedEnter('[27;5;13~', noKey)?.key).toMatchObject({ return: true, ctrl: true });
    expect(toModifiedEnter('[27;3;13~', noKey)?.key).toMatchObject({ return: true, meta: true });
    expect(toModifiedEnter('[27;6;13~', noKey)?.key).toMatchObject({ shift: true, ctrl: true });
  });

  it('reads parameter 1 as enter without modifiers', () => {
    expect(toModifiedEnter('[27;1;13~', noKey)?.key).toMatchObject({
      return: true,
      shift: false,
      ctrl: false,
      meta: false,
    });
  });

  it('ignores other inputs and other keys of the same form', () => {
    expect(toModifiedEnter('a', noKey)).toBeUndefined();
    expect(toModifiedEnter('[27;2;9~', noKey)).toBeUndefined();
    expect(toModifiedEnter('[27;0;13~', noKey)).toBeUndefined();
    expect(toModifiedEnter('x[27;2;13~', noKey)).toBeUndefined();
  });
});
