import { useState } from 'react';

/** Options for {@link useWindow}. */
export type WindowOptions = {
  /** How many items exist in total. */
  itemCount: number;
  /** How many rows the terminal box shows at once. */
  visibleRows: number;
  /** Index of the item that must stay visible. A negative index keeps the window where it is. */
  highlightedIndex: number;
};

/** The half-open slice of items to render, `items.slice(start, end)`. */
export type WindowRange = {
  start: number;
  end: number;
};

function nextWindowStart(
  previousStart: number,
  { itemCount, visibleRows, highlightedIndex }: WindowOptions,
): number {
  const maxStart = Math.max(0, itemCount - visibleRows);
  let start = Math.min(previousStart, maxStart);
  if (highlightedIndex >= 0) {
    if (highlightedIndex < start) {
      start = highlightedIndex;
    } else if (highlightedIndex >= start + visibleRows) {
      start = highlightedIndex - visibleRows + 1;
    }
  }
  return Math.max(0, start);
}

/**
 * Keeps a scroll window over a list so the highlighted item stays visible.
 *
 * The window only moves when the highlight leaves it, so walking back into the middle of the
 * visible rows does not scroll.
 *
 * @param options - The item count, the visible row count, and the highlighted index.
 * @returns The `start` and `end` indexes to slice the items with.
 *
 * @example
 * const { start, end } = useWindow({ itemCount: options.length, visibleRows: 8, highlightedIndex });
 * return options.slice(start, end).map(renderRow);
 */
export function useWindow(options: WindowOptions): WindowRange {
  const [storedStart, setStoredStart] = useState(0);
  const start = nextWindowStart(storedStart, options);
  // The start depends on the previous one, so it is stored. React renders again at once when state
  // is set during render, before it draws anything.
  if (start !== storedStart) {
    setStoredStart(start);
  }
  return { start, end: Math.min(options.itemCount, start + options.visibleRows) };
}
