import { NavLink, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Activity, Building2, LayoutDashboard, Mail, Moon, Package, Search, Settings, Sun } from 'lucide-react';
import { useGetStatsQuery } from '../api/api';
import { useAppearance } from '../app/appearance';
import { useLiveUpdates } from '../app/liveUpdates';

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/discover', label: 'Find leads', icon: Search },
  { to: '/leads', label: 'Leads', icon: Building2 },
  { to: '/outbox', label: 'Outbox', icon: Mail, countKey: 'draft' as const },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout() {
  const { connected } = useLiveUpdates();
  // Live updates refresh stats instantly; poll slowly only while the stream is down
  const { data: stats } = useGetStatsQuery(undefined, { pollingInterval: connected ? 0 : 60_000 });
  const { resolvedTheme, toggleTheme } = useAppearance();
  const nextTheme = resolvedTheme === 'dark' ? 'Light' : 'Dark';

  return (
    <>
      <div className="bg-scene" aria-hidden>
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="blob b3" />
        <div className="blob b4" />
      </div>

      <div className="shell">
        <aside className="sidebar panel">
          <div className="brand">
            <div className="brand-logo">
              <Activity size={22} />
            </div>
            <div className="brand-text">
              <div className="brand-name">Lead Finder</div>
              <div className="brand-sub">AI prospecting</div>
            </div>
          </div>

          <nav className="nav">
            {NAV.map(({ to, label, icon: Icon, end, countKey }) => {
              const count = countKey ? stats?.emails[countKey] : 0;
              return (
                <NavLink key={to} to={to} end={end} title={label}>
                  <Icon size={18} />
                  <span className="label">{label}</span>
                  {count ? <span className="count">{count}</span> : null}
                </NavLink>
              );
            })}
          </nav>

          <div className="side-actions">
            <button
              type="button"
              className="btn btn-ghost side-btn"
              onClick={toggleTheme}
              title={`${nextTheme} mode`}
              aria-label={`Switch to ${nextTheme.toLowerCase()} mode`}
            >
              {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              <span className="label">{nextTheme} mode</span>
            </button>
          </div>

          <div className="sidebar-foot">
            © Chipsy 2026.
          </div>
        </aside>

        <main className="main">
          <Outlet />
        </main>
      </div>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--toast-bg)',
            color: 'var(--text)',
            border: 'var(--border-w) solid var(--toast-border)',
            boxShadow: 'var(--surface-shadow)',
            backdropFilter: 'var(--surface-blur)',
            borderRadius: 'var(--radius)',
            fontFamily: 'var(--font)',
            fontSize: '14px',
          },
        }}
      />
    </>
  );
}
