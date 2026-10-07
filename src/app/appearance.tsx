import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Appearance = three independent choices saved in this browser:
 *   theme  — light | dark | system (follows the OS)
 *   style  — classic | glass | tactile
 *   layout — sidebar | rail | topbar
 * They are written to <html data-theme data-style data-layout>; all CSS keys off those.
 * index.html applies the saved values before first paint — keep keys/values in sync with it.
 */

export const THEMES = ['light', 'dark', 'system'] as const;
export const STYLES = ['classic', 'glass', 'tactile'] as const;
export const LAYOUTS = ['sidebar', 'rail', 'topbar'] as const;

export type ThemePref = (typeof THEMES)[number];
export type UiStyle = (typeof STYLES)[number];
export type UiLayout = (typeof LAYOUTS)[number];
export type ResolvedTheme = 'light' | 'dark';

const KEYS = { theme: 'vb.theme', style: 'vb.uiStyle', layout: 'vb.uiLayout' } as const;
const DEFAULTS = { theme: 'dark' as ThemePref, style: 'glass' as UiStyle, layout: 'sidebar' as UiLayout };

function read<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode / storage blocked — the choice just won't persist */
  }
}

const systemPrefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

interface AppearanceValue {
  theme: ThemePref;
  resolvedTheme: ResolvedTheme;
  uiStyle: UiStyle;
  uiLayout: UiLayout;
  setTheme: (t: ThemePref) => void;
  toggleTheme: () => void;
  setUiStyle: (s: UiStyle) => void;
  setUiLayout: (l: UiLayout) => void;
}

const AppearanceContext = createContext<AppearanceValue | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePref>(() => read(KEYS.theme, THEMES, DEFAULTS.theme));
  const [uiStyle, setUiStyleState] = useState<UiStyle>(() => read(KEYS.style, STYLES, DEFAULTS.style));
  const [uiLayout, setUiLayoutState] = useState<UiLayout>(() => read(KEYS.layout, LAYOUTS, DEFAULTS.layout));
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  // Follow OS changes while "system" is selected
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Keep other open tabs in sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEYS.theme) setThemeState(read(KEYS.theme, THEMES, DEFAULTS.theme));
      if (e.key === KEYS.style) setUiStyleState(read(KEYS.style, STYLES, DEFAULTS.style));
      if (e.key === KEYS.layout) setUiLayoutState(read(KEYS.layout, LAYOUTS, DEFAULTS.layout));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const resolvedTheme: ResolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  useEffect(() => document.documentElement.setAttribute('data-theme', resolvedTheme), [resolvedTheme]);
  useEffect(() => document.documentElement.setAttribute('data-style', uiStyle), [uiStyle]);
  useEffect(() => document.documentElement.setAttribute('data-layout', uiLayout), [uiLayout]);

  const value = useMemo<AppearanceValue>(() => {
    // Only user choices are saved — never the values read on startup
    const setTheme = (t: ThemePref) => {
      write(KEYS.theme, t);
      setThemeState(t);
    };
    return {
      theme,
      resolvedTheme,
      uiStyle,
      uiLayout,
      setTheme,
      toggleTheme: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'),
      setUiStyle: (s) => {
        write(KEYS.style, s);
        setUiStyleState(s);
      },
      setUiLayout: (l) => {
        write(KEYS.layout, l);
        setUiLayoutState(l);
      },
    };
  }, [theme, resolvedTheme, uiStyle, uiLayout]);

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error('useAppearance must be used inside <AppearanceProvider>');
  return ctx;
}
