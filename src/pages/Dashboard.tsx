import { Link } from 'react-router-dom';
import { Building2, Filter, Inbox, MailCheck, MailWarning, Search, Send } from 'lucide-react';
import { useGetSearchesQuery, useGetStatsQuery } from '../api/api';
import { Banner, Loading } from '../components/Feedback';
import StatusBadge from '../components/StatusBadge';
import { searchProgress } from './Discover';

export default function Dashboard() {
  const { data: stats, isLoading } = useGetStatsQuery();
  const { data: searches } = useGetSearchesQuery();

  if (isLoading || !stats) return <Loading />;
  const { funnel, emails, sending, config } = stats;

  const steps = [
    { label: 'Leads found', value: funnel.leads },
    { label: 'Have a website', value: funnel.withWebsite },
    { label: 'Public email found', value: funnel.withEmail },
    { label: 'Researched by AI', value: funnel.researched },
    { label: `Good fit (score ≥ ${stats.qualifiedScore})`, value: funnel.qualified },
    { label: 'Emails sent', value: funnel.sent },
  ];
  const max = Math.max(funnel.leads, 1);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Overview</h1>
          <p>From finding leads to approved outreach, across all products.</p>
        </div>
        <Link to="/discover" className="btn btn-primary">
          <Search size={16} /> Find leads
        </Link>
      </div>

      {(!config.ai || !config.smtp || sending.dryRun) && (
        <Banner kind="warn">
          {!config.ai && (
            <div>
              <b>AI is off</b> — set <span className="mono">ANTHROPIC_API_KEY</span> in the backend .env to research leads
              and write emails.
            </div>
          )}
          {!config.smtp && (
            <div>
              <b>SMTP not configured</b> — set the <span className="mono">SMTP_*</span> and{' '}
              <span className="mono">MAIL_FROM_EMAIL</span> values to send real emails.
            </div>
          )}
          {sending.dryRun && (
            <div>
              <b>Dry-run mode</b> — approved emails are logged, not delivered (
              <span className="mono">EMAIL_DRY_RUN=true</span>).
            </div>
          )}
        </Banner>
      )}

      <div className="grid grid-4">
        <Link to="/leads" className="panel stat">
          <div className="stat-label">
            <span className="stat-icon">
              <Building2 size={16} className="ic-blue" />
            </span>
            Leads
          </div>
          <div className="stat-value">{funnel.leads}</div>
          <div className="stat-foot">{funnel.withEmail} with a public email</div>
        </Link>
        <Link to="/outbox" className="panel stat">
          <div className="stat-label">
            <span className="stat-icon">
              <Inbox size={16} className="ic-violet" />
            </span>
            Drafts to review
          </div>
          <div className="stat-value">{emails.draft}</div>
          <div className="stat-foot">Written by AI, waiting for approval</div>
        </Link>
        <div className="panel stat">
          <div className="stat-label">
            <span className="stat-icon">
              <Send size={16} className="ic-green" />
            </span>
            Sent today
          </div>
          <div className="stat-value">
            {sending.sentToday}
            <span className="muted" style={{ fontSize: 16, fontWeight: 500 }}>
              {' '}
              / {sending.dailyLimit}
            </span>
          </div>
          <div className="stat-foot">
            Daily limit · {sending.perMinute}/min · {emails.approved} queued
          </div>
        </div>
        <div className="panel stat">
          <div className="stat-label">
            <span className="stat-icon">
              {emails.failed ? <MailWarning size={16} className="ic-red" /> : <MailCheck size={16} className="ic-green" />}
            </span>
            Sent total
          </div>
          <div className="stat-value">{emails.sent}</div>
          <div className="stat-foot">{emails.failed} failed · {emails.rejected} rejected</div>
        </div>
      </div>

      <div className="split">
        <div className="panel card">
          <div className="card-title">
            <Filter size={18} /> Prospecting funnel
          </div>
          <div className="funnel">
            {steps.map((s) => (
              <div className="funnel-row" key={s.label}>
                <span className="muted">{s.label}</span>
                <div className="bar">
                  <span style={{ width: `${(s.value / max) * 100}%` }} />
                </div>
                <span className="num">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel card">
          <div className="card-title">
            <Search size={18} /> Recent searches
          </div>
          {searches?.length ? (
            <div className="list">
              {searches.slice(0, 5).map((s) => {
                const p = searchProgress(s);
                return (
                  <Link
                    key={s._id}
                    to={`/leads?searchId=${s._id}`}
                    className="list-item clickable"
                   
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="bold truncate">{s.location}</div>
                      <div className="tiny muted">
                        {s.query} · {s.created} new{p.total ? ` · ${p.done}/${p.total} processed` : ''}
                      </div>
                    </div>
                    <StatusBadge status={s.status} />
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="muted small">No searches yet. Add a product, then find leads for it in a city.</p>
          )}
        </div>
      </div>
    </>
  );
}
