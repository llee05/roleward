import { useState } from 'react';
import { Moon } from 'lucide-react';
import type { Setting } from '../domain/models';
import { getTheme } from '../domain/theme';
import { errorMessage } from '../lib/utils';
import { saveTheme } from '../persistence/preferences';

export function AppearanceSettings({ settings }: { settings: Setting[] }) {
  const theme = getTheme(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function toggleTheme() {
    setSaving(true);
    setError('');
    try {
      await saveTheme(theme === 'dark' ? 'light' : 'dark');
    } catch (error) {
      setError(`Could not save appearance. ${errorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="panel settings-panel"
      aria-labelledby="appearance-title"
    >
      <div className="panel-heading">
        <div className="settings-title">
          <span className="service-icon">
            <Moon size={25} aria-hidden="true" />
          </span>
          <div>
            <h2 id="appearance-title">Appearance</h2>
            <p>Make your workspace comfortable for you.</p>
          </div>
        </div>
      </div>
      <div className="settings-body">
        <div className="appearance-option">
          <div>
            <h3 id="dark-mode-label">Dark mode</h3>
            <p id="dark-mode-description" className="field-hint">
              Use darker colors throughout your workspace. Saved in this
              browser.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            className="theme-switch"
            aria-checked={theme === 'dark'}
            aria-labelledby="dark-mode-label"
            aria-describedby="dark-mode-description"
            disabled={saving}
            onClick={() => void toggleTheme()}
          >
            <span />
          </button>
        </div>
        {error && (
          <p role="alert" className="notice notice-error">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
