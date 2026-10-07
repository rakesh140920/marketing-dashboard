import { useEffect, useState } from 'react';
import { Inbox, Package } from 'lucide-react';
import { useGetEmailsQuery, useGetProductsQuery, useGetStatsQuery } from '../api/api';
import { useLiveUpdates } from '../app/liveUpdates';
import type { EmailStatus } from '../api/types';
import { Banner, Empty, Loading } from '../components/Feedback';
import EmailEditor from '../components/EmailEditor';
import StatusBadge from '../components/StatusBadge';

const TABS: { status: EmailStatus; label: string }[] = [
  { status: 'draft', label: 'To review' },
  { status: 'approved', label: 'Sending' },
  { status: 'sent', label: 'Sent' },
  { status: 'failed', label: 'Failed' },
  { status: 'rejected', label: 'Rejected' },
];

export default function Outbox() {
  const [tab, setTab] = useState<EmailStatus>('draft');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { connected } = useLiveUpdates();
  const { data: stats } = useGetStatsQuery();
  const { data: products } = useGetProductsQuery();
  const productName = (id?: string) => products?.find((p) => p._id === id)?.name;
  const { data: emails, isLoading } = useGetEmailsQuery(tab, {
    pollingInterval: !connected && (tab === 'approved' || tab === 'draft') ? 15_000 : 0,
  });

  // Keep a valid selection: first item of the list when the current one disappears (e.g. after approval)
  useEffect(() => {
    if (!emails?.length) setSelectedId(null);
    else if (!emails.some((e) => e._id === selectedId)) setSelectedId(emails[0]._id);
  }, [emails, selectedId]);

  const selected = emails?.find((e) => e._id === selectedId);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Outbox</h1>
          <p>Every AI-written email waits here for a human to approve it.</p>
        </div>
        {stats && (
          <span className="chip">
            Sent today {stats.sending.sentToday} / {stats.sending.dailyLimit}
          </span>
        )}
      </div>

      {stats?.sending.dryRun && (
        <Banner kind="warn">
          Dry-run mode is on: approved emails are marked as sent but <b>not delivered</b>. Set{' '}
          <span className="mono">EMAIL_DRY_RUN=false</span> once SMTP and your sending domain (SPF / DKIM / DMARC) are
          ready.
        </Banner>
      )}

      <div className="panel tabs">
        {TABS.map((t) => (
          <button key={t.status} className={tab === t.status ? 'on' : ''} onClick={() => setTab(t.status)}>
            {t.label}
            <span className="count">{stats?.emails[t.status] ?? 0}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <Loading />
      ) : !emails?.length ? (
        <div className="panel card">
          <Empty icon={Inbox} title="Nothing here">
            {tab === 'draft' ? 'Select leads on the Leads page and click “Draft emails with AI”.' : 'No emails in this state.'}
          </Empty>
        </div>
      ) : (
        <div className="split" style={{ gridTemplateColumns: 'minmax(0, 0.9fr) minmax(0, 1.5fr)' }}>
          <div className="panel card list" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
            {emails.map((e) => {
              const lead = typeof e.leadId === 'object' ? e.leadId : null;
              return (
                <div
                  key={e._id}
                  className={`list-item clickable${e._id === selectedId ? ' active' : ''}`}
                  onClick={() => setSelectedId(e._id)}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="bold truncate">{lead?.name ?? e.to}</div>
                    {productName(lead?.productId) && (
                      <div className="tiny" style={{ color: 'var(--tone-violet)' }}>
                        <Package size={10} /> {productName(lead?.productId)}
                      </div>
                    )}
                    <div className="small truncate">{e.subject}</div>
                    <div className="tiny faint truncate">{e.to}</div>
                  </div>
                  {tab !== 'draft' && <StatusBadge status={e.status} />}
                </div>
              );
            })}
          </div>
          {selected && <EmailEditor email={selected} />}
        </div>
      )}
    </>
  );
}
