import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { afterEach, expect, test, vi } from 'vitest';
import { db } from '../persistence/local-database';
import { AppearanceSettings } from './appearance-settings';

function Preferences() {
  const settings = useLiveQuery(() => db.settings.toArray());
  return settings ? <AppearanceSettings settings={settings} /> : null;
}

afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  await db.settings.clear();
});

test('toggle reflects saved preferences and changes in both directions', async () => {
  await db.settings.put({ key: 'theme', value: 'dark' });
  render(<Preferences />);
  const toggle = await screen.findByRole('switch', { name: 'Dark mode' });
  expect(toggle).toBeChecked();
  fireEvent.click(toggle);
  await waitFor(() => expect(toggle).not.toBeChecked());
  expect(await db.settings.get('theme')).toEqual({
    key: 'theme',
    value: 'light',
  });
  fireEvent.click(toggle);
  await waitFor(() => expect(toggle).toBeChecked());
  expect(await db.settings.get('theme')).toEqual({
    key: 'theme',
    value: 'dark',
  });
});

test('a failed save keeps the current mode and lets the user retry', async () => {
  render(<Preferences />);
  const toggle = await screen.findByRole('switch', { name: 'Dark mode' });
  vi.spyOn(db.settings, 'put').mockRejectedValueOnce(new Error('Storage full'));
  fireEvent.click(toggle);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Could not save appearance. Storage full',
  );
  expect(toggle).not.toBeChecked();
  expect(toggle).toBeEnabled();
  fireEvent.click(toggle);
  await waitFor(() => expect(toggle).toBeChecked());
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
