// Copied from golemui `libs/gui/components/src/lib/utils/numeric.ts` at 2.1.0-rc.0: the accepted
// characters, `isRealNumber`, `decimalsOf` and `stepValue`. The parts of that file that need Lit
// or a DOM event are left out. Keep the copied parts the same as that file, so a later golemui
// change can be compared line by line.

/**
 * Characters accepted by an `<input type="number">`: digits, decimal separators
 * ('.' and the locale-dependent ','), exponent markers and signs.
 */
export const VALID_NUMBER_INPUT_CHARS = /^[0-9.,eE+-]+$/;

/**
 * Whether a value is an actual number, including 0. Property bindings bypass
 * the Lit converters, so number-typed properties can end up holding '', NaN or
 * null at runtime; truthiness checks additionally drop a legitimate 0.
 *
 * @param {unknown} value - The value to test.
 * @return {boolean} True only for a number that is not NaN.
 */
export const isRealNumber = (value: unknown): value is number =>
  typeof value === 'number' && !Number.isNaN(value);

/** The number of decimals a number is written with: 2 for 0.25, 7 for 1e-7. */
function decimalsOf(value: number): number {
  const [mantissa, exponent = '0'] = String(value).toLowerCase().split('e');
  const fraction = mantissa.split('.')[1]?.length ?? 0;
  return Math.max(0, fraction - Number(exponent));
}

/**
 * The value one step up or down, as the arrow keys of a native number input give it: an empty
 * field steps from 0, so a step down gives -step, and the result is clamped to the bounds. A step
 * that is not a positive number counts as 1. The result is rounded to the decimals of the value and
 * the step, so 0.1 + 0.2 gives 0.3 and not 0.30000000000000004.
 *
 * @param {number | undefined} current - The value, or undefined when the field is empty.
 * @param {1 | -1} direction - 1 for a step up, -1 for a step down.
 * @param {object} options - The step and the bounds, each optional.
 * @return {number} The stepped value.
 */
export function stepValue(
  current: number | undefined,
  direction: 1 | -1,
  options: { step?: number; minimum?: number; maximum?: number },
): number {
  const step = isRealNumber(options.step) && options.step > 0 ? options.step : 1;
  const from = isRealNumber(current) ? current : 0;
  const decimals = Math.min(100, Math.max(decimalsOf(from), decimalsOf(step)));
  let value = Number((from + direction * step).toFixed(decimals));

  value = isRealNumber(options.maximum) ? Math.min(value, options.maximum) : value;
  value = isRealNumber(options.minimum) ? Math.max(value, options.minimum) : value;
  return value;
}
