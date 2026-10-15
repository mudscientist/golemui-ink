import { useFocusManager } from './FocusManager';
import { useFocusPath } from './FocusPathContext';

/**
 * Reports whether the focused widget sits below the widget that calls this hook.
 *
 * A container widget uses it for what the DOM calls focus within. The container itself never
 * takes the focus and does not register.
 *
 * @returns True while the focused widget has the path of the caller or a path below it.
 *
 * @example
 * const isFocusInside = useFocusInside();
 */
export function useFocusInside(): boolean {
  const { isInside } = useFocusManager();
  const path = useFocusPath();
  return isInside(path);
}
