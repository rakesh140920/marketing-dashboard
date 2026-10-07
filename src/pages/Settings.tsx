import { FormEvent, KeyboardEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Building, FlaskConical, Package, Palette, PenLine, Plus, Server, X } from 'lucide-react';
import { errorMessage, useGetSettingsQuery, useGetStatsQuery, useUpdateSettingsMutation } from '../api/api';
import type { AppSettings } from '../api/types';
import { Banner, Loading } from '../components/Feedback';
import AppearancePicker from '../components/AppearancePicker';

const EMPTY: AppSettings = {
  companyName: '',
  senderName: '',
  senderTitle: '',
  signature: '',
  testMode: true,
  testEmails: [],
};

const MAX_TEST_EMAILS = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
type TextField = 'companyName' | 'senderName' | 'senderTitle' | 'signature';

function Status({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className="list-item" style={{ padding: '12px 14px' }}>
      <span className={`badge ${ok ? 'tone-green' : 'tone-amber'}`}>
        <span className="dot" />
        {ok ? 'On' : 'Off'}
      </span>
      <div style={{ minWidth: 0 }}>
        <div className="small bold">{label}</div>
        <div className="tiny muted">{detail}</div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { data, isLoading } = useGetSettingsQuery();
  const { data: stats } = useGetStatsQuery();
  const [save, { isLoading: saving }] = useUpdateSettingsMutation();
  const [form, setForm] = useState<AppSettings>(EMPTY);
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    if (data) setForm({ ...EMPTY, ...data });
  }, [data]);

  if (isLoading) return <Loading />;

  const set = (k: TextField) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const addTestEmail = () => {
    const addr = testEmail.trim().toLowerCase();
    if (!addr) return;
    if (!EMAIL_RE.test(addr)) {
      toast.error('That is not a valid email address');
      return;
    }
    setForm((f) => (f.testEmails.includes(addr) ? f : { ...f, testEmails: [...f.testEmails, addr] }));
    setTestEmail('');
  };
  const onTestEmailKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTestEmail();
    }
  };
  const toggleTestMode = (on: boolean) => {
    if (!on && !window.confirm('Turn off test mode? After saving, approved emails will be sent to the real leads.')) return;
    setForm((f) => ({ ...f, testMode: on }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await save(form).unwrap();
      toast.success('Settings saved');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>How the app looks, and who the emails come from.</p>
        </div>
      </div>

      <div className="panel card">
        <div className="card-title">
          <Palette size={18} /> Appearance
        </div>
        <AppearancePicker />
      </div>

      <div className="split">
        <form className="stack" onSubmit={submit}>
          <div className="panel card stack">
            <div className="card-title" style={{ marginBottom: 0 }}>
              <Building size={18} /> Company
            </div>
            <div className="field">
              <label htmlFor="company">Company name</label>
              <input id="company" className="input" value={form.companyName} onChange={set('companyName')} />
              <span className="hint">Used in every email, and so the AI can recognise your own company in search results.</span>
            </div>
            <div className="list-item" style={{ padding: '12px 14px' }}>
              <Package size={16} className="ic-violet" />
              <div className="small" style={{ flex: 1 }}>
                What each product does, who it's for and its call to action are set per product.
              </div>
              <Link to="/products" className="btn btn-sm">
                Products
              </Link>
            </div>
          </div>

          <div className="panel card stack">
            <div className="card-title" style={{ marginBottom: 0 }}>
              <PenLine size={18} /> Sender
            </div>
            <div className="grid grid-2">
              <div className="field">
                <label htmlFor="sname">Name</label>
                <input id="sname" className="input" value={form.senderName} onChange={set('senderName')} />
              </div>
              <div className="field">
                <label htmlFor="stitle">Title</label>
                <input
                  id="stitle"
                  className="input"
                  placeholder="Business Development Manager"
                  value={form.senderTitle}
                  onChange={set('senderTitle')}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="sig">Signature</label>
              <textarea
                id="sig"
                className="textarea"
                placeholder={'Phone: +91 …\nwww.yourcompany.com'}
                value={form.signature}
                onChange={set('signature')}
              />
            </div>
          </div>

          <div className="panel card stack">
            <div className="card-title" style={{ marginBottom: 0 }}>
              <FlaskConical size={18} /> Test mode
            </div>
            <label className="switch-row">
              <input
                type="checkbox"
                className="switch"
                checked={form.testMode}
                onChange={(e) => toggleTestMode(e.target.checked)}
              />
              <div>
                <div className="small bold">
                  {form.testMode ? 'On — approved emails go only to the test addresses' : 'Off — approved emails go to the real leads'}
                </div>
                <div className="tiny muted">
                  Test emails are really sent, marked [TEST], and say which lead they were meant for. Leads stay “Open”.
                </div>
              </div>
            </label>
            <div className="field">
              <label htmlFor="test-email">Test email addresses</label>
              <div className="row" style={{ flexWrap: 'nowrap', gap: 8 }}>
                <input
                  id="test-email"
                  className="input"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  onKeyDown={onTestEmailKey}
                  placeholder="you@yourcompany.com"
                  disabled={form.testEmails.length >= MAX_TEST_EMAILS}
                />
                <button
                  type="button"
                  className="btn"
                  onClick={addTestEmail}
                  disabled={!testEmail.trim() || form.testEmails.length >= MAX_TEST_EMAILS}
                >
                  <Plus size={15} /> Add
                </button>
              </div>
              {!!form.testEmails.length && (
                <div className="chips">
                  {form.testEmails.map((addr) => (
                    <span key={addr} className="chip">
                      {addr}
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm icon-btn"
                        style={{ height: 20, width: 20 }}
                        aria-label={`Remove ${addr}`}
                        onClick={() => setForm((f) => ({ ...f, testEmails: f.testEmails.filter((x) => x !== addr) }))}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <span className="hint">Up to {MAX_TEST_EMAILS} addresses. Every test email goes to all of them.</span>
            </div>
            {form.testMode && !form.testEmails.length && (
              <Banner kind="warn">Add at least one test address — approving emails is blocked until you do.</Banner>
            )}
          </div>

          <div className="row">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </form>

        <div className="panel card stack" style={{ gap: 12 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>
            <Server size={18} /> Backend status
          </div>
          {stats && (
            <>
              <Status ok={stats.config.ai} label="AI research & writing" detail={`Model: ${stats.config.aiModel}`} />
              <Status
                ok={stats.config.googlePlaces}
                label="Google Places"
                detail="Optional — OpenStreetMap works without it"
              />
              <Status ok={stats.config.smtp} label="SMTP email" detail="Needed to deliver real emails" />
              <Status
                ok={!stats.sending.dryRun}
                label="Live sending"
                detail={stats.sending.dryRun ? 'Dry-run: emails are only logged' : 'Approved emails are delivered'}
              />
              <p className="hint" style={{ margin: 0 }}>
                Limits: {stats.sending.dailyLimit}/day, {stats.sending.perMinute}/minute. These are set in the backend{' '}
                <span className="mono">.env</span> file.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
