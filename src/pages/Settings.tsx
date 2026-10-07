import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Building, Package, Palette, PenLine, Server } from 'lucide-react';
import { errorMessage, useGetSettingsQuery, useGetStatsQuery, useUpdateSettingsMutation } from '../api/api';
import type { AppSettings } from '../api/types';
import { Loading } from '../components/Feedback';
import AppearancePicker from '../components/AppearancePicker';

const EMPTY: AppSettings = {
  companyName: '',
  senderName: '',
  senderTitle: '',
  signature: '',
};

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

  useEffect(() => {
    if (data) setForm({ ...EMPTY, ...data });
  }, [data]);

  if (isLoading) return <Loading />;

  const set = (k: keyof AppSettings) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

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
