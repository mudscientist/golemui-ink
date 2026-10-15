import { closeAllTracked } from '@microsoft/tui-test/test';
import { afterEach } from 'vitest';

// A failed test must not leave a playground process running.
afterEach(async () => {
  await closeAllTracked();
});
