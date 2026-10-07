import type { ReactNode } from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useAppearance, ThemePref, UiLayout, UiStyle } from '../app/appearance';

const THEME_OPTIONS: { id: ThemePref; name: string; icon: typeof Sun }[] = [
  { id: 'light', name: 'Light', icon: Sun },
  { id: 'dark', name: 'Dark', icon: Moon },
  { id: 'system', name: 'System', icon: Monitor },
];

const STYLE_OPTIONS: { id: UiStyle; name: string; description: string }[] = [
  { id: 'classic', name: 'Classic', description: 'Clean, solid surfaces' },
  { id: 'glass', name: 'Glass', description: 'Frosted, translucent panels' },
  { id: 'tactile', name: 'Tactile', description: 'Bold borders, calm space' },
];

const LAYOUT_OPTIONS: { id: UiLayout; name: string; description: string }[] = [
  { id: 'sidebar', name: 'Sidebar', description: 'Navigation on the left' },
  { id: 'rail', name: 'Rail', description: 'Icons only, more room' },
  { id: 'topbar', name: 'Top bar', description: 'Navigation across the top' },
];

function OptionCard({
  group,
  value,
  checked,
  onSelect,
  name,
  description,
  preview,
}: {
  group: string;
  value: string;
  checked: boolean;
  onSelect: () => void;
  name: string;
  description: string;
  preview: ReactNode;
}) {
  return (
    <label className={`option${checked ? ' on' : ''}`}>
      <input type="radio" name={group} value={value} checked={checked} onChange={onSelect} />
      {preview}
      <span className="option-text">
        <span className="option-name">{name}</span>
        <span className="option-desc">{description}</span>
      </span>
      {checked && (
        <span className="option-check" aria-hidden>
          <Check size={13} strokeWidth={3} />
        </span>
      )}
    </label>
  );
}

const StylePreview = ({ id }: { id: UiStyle }) => (
  <div className={`preview preview--${id}`} aria-hidden>
    <div className="preview-card">
      <div className="preview-line" />
      <div className="preview-line short" />
      <div className="preview-pill" />
    </div>
  </div>
);

const LayoutPreview = ({ id }: { id: UiLayout }) => (
  <div className="preview preview--layout" aria-hidden>
    <div className={`lp lp--${id}`}>
      <div className="lp-nav" />
      <div className="lp-main">
        <div className="lp-block wide" />
        <div className="lp-block" />
        <div className="lp-block" />
      </div>
    </div>
  </div>
);

/** Theme / style / layout switcher. Choices are saved in this browser only. */
export default function AppearancePicker() {
  const { theme, setTheme, uiStyle, setUiStyle, uiLayout, setUiLayout } = useAppearance();

  return (
    <div className="appearance">
      <fieldset className="appearance-group">
        <legend className="appearance-label">Theme</legend>
        <div className="segmented" role="radiogroup" aria-label="Theme">
          {THEME_OPTIONS.map(({ id, name, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={theme === id}
              className={theme === id ? 'on' : ''}
              onClick={() => setTheme(id)}
            >
              <Icon size={16} /> {name}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="appearance-group">
        <legend className="appearance-label">Style</legend>
        <div className="option-grid">
          {STYLE_OPTIONS.map((o) => (
            <OptionCard
              key={o.id}
              group="ui-style"
              value={o.id}
              checked={uiStyle === o.id}
              onSelect={() => setUiStyle(o.id)}
              name={o.name}
              description={o.description}
              preview={<StylePreview id={o.id} />}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="appearance-group">
        <legend className="appearance-label">Layout</legend>
        <div className="option-grid">
          {LAYOUT_OPTIONS.map((o) => (
            <OptionCard
              key={o.id}
              group="ui-layout"
              value={o.id}
              checked={uiLayout === o.id}
              onSelect={() => setUiLayout(o.id)}
              name={o.name}
              description={o.description}
              preview={<LayoutPreview id={o.id} />}
            />
          ))}
        </div>
        <span className="hint">Saved in this browser. On phones every layout uses a compact top bar.</span>
      </fieldset>
    </div>
  );
}
