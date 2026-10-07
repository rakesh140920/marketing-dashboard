import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  Contact,
  ExternalLink,
  Globe,
  Mail,
  MinusCircle,
  NotebookPen,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
  Wand2,
} from 'lucide-react';
import {
  errorMessage,
  useDraftEmailsMutation,
  useEnrichLeadMutation,
  useGetLeadQuery,
  useGetProductsQuery,
  useUpdateLeadMutation,
} from '../api/api';
import type { Lead, LeadAI, LeadSignal, SalesStatus } from '../api/types';
import { Banner, Loading } from '../components/Feedback';
import ScoreRing from '../components/ScoreRing';
import StatusBadge from '../components/StatusBadge';
import EmailEditor from '../components/EmailEditor';
import { useLiveUpdates } from '../app/liveUpdates';

const SALES: { value: SalesStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'replied', label: 'Replied' },
  { value: 'not_interested', label: 'Not interested' },
  { value: 'do_not_contact', label: 'Do not contact' },
];

const titleCase = (s?: string) => (s ? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—');

function Flag({ on, label, title }: { on?: boolean; label: string; title?: string }) {
  return (
    <span className={`badge ${on ? 'tone-green' : 'tone-gray'}`} title={title}>
      {on ? <CheckCircle2 size={13} /> : <MinusCircle size={13} />} {label}
    </span>
  );
}

/** Research fields, reading older hospital-only analyses too so existing leads still display. */
function researchView(ai: LeadAI, lead: Lead) {
  const beds = ai.bedCount ?? lead.beds;
  const legacy = ai.hospitalType !== undefined || ai.mentionsABDM !== undefined;
  const signals: LeadSignal[] =
    ai.signals ??
    (legacy
      ? [
          { name: 'ABDM / ABHA', found: !!ai.mentionsABDM },
          { name: 'NHCX', found: !!ai.mentionsNHCX },
          { name: 'Insurance / cashless', found: !!ai.mentionsInsurance },
        ]
      : []);
  return {
    type: ai.businessType ?? (ai.hospitalType ? titleCase(ai.hospitalType) : undefined),
    size: ai.size ?? (beds ? `${beds} beds` : undefined),
    offerings: ai.offerings ?? ai.specialties ?? [],
    existing: ai.existingSolutions ?? ai.existingSoftware,
    signals,
  };
}

export default function LeadDetail() {
  const { id = '' } = useParams();
  // Live updates refresh this lead as research / drafting finishes; poll only if the stream is down
  const { connected } = useLiveUpdates();
  const [poll, setPoll] = useState(0);
  const [awaitingDraft, setAwaitingDraft] = useState<{ prev: string | null } | null>(null);
  const { data: lead, isLoading, isError } = useGetLeadQuery(id, { pollingInterval: poll });
  const { data: products } = useGetProductsQuery();
  const productName = products?.find((p) => p._id === lead?.productId)?.name ?? lead?.ai?.productName;

  const [updateLead] = useUpdateLeadMutation();
  const [enrich, { isLoading: enriching }] = useEnrichLeadMutation();
  const [draftEmails, { isLoading: drafting }] = useDraftEmailsMutation();

  const [newEmail, setNewEmail] = useState('');
  const [notes, setNotes] = useState('');
  useEffect(() => setNotes(lead?.notes ?? ''), [lead?._id, lead?.notes]);

  const researching = !!lead && ['new', 'crawling', 'analyzing'].includes(lead.pipelineStatus);
  const currentDraft = lead?.outreach.find((e) => e.status === 'draft');
  const draftArrived = !!awaitingDraft && !!currentDraft && currentDraft.updatedAt !== awaitingDraft.prev;
  const waitingDraft = !!awaitingDraft && !draftArrived;

  useEffect(() => {
    if (draftArrived) setAwaitingDraft(null);
  }, [draftArrived]);
  useEffect(() => {
    if (!awaitingDraft) return;
    const t = setTimeout(() => setAwaitingDraft(null), 120_000); // give up after 2 minutes
    return () => clearTimeout(t);
  }, [awaitingDraft]);
  useEffect(
    () => setPoll((researching || waitingDraft) && !connected ? 3000 : 0),
    [researching, waitingDraft, connected],
  );

  if (isLoading) return <Loading />;
  if (isError || !lead) return <Banner kind="warn">Lead not found.</Banner>;

  const ai = lead.ai;

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const addEmail = (e: FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    void run(() => updateLead({ id, addEmail: newEmail.trim() }).unwrap(), 'Email added').then(() => setNewEmail(''));
  };

  const requestDraft = () =>
    run(async () => {
      const r = await draftEmails([id]).unwrap();
      if (!r.queued) throw { data: { message: 'This lead has no email address (or is marked do-not-contact)' } };
      setAwaitingDraft({ prev: currentDraft?.updatedAt ?? null });
    }, 'AI is writing the email…');

  return (
    <>
      <div className="page-head">
        <div style={{ minWidth: 0 }}>
          <Link to="/leads" className="small muted row" style={{ gap: 6, marginBottom: 10 }}>
            <ArrowLeft size={15} /> All leads
          </Link>
          <h1>{lead.name}</h1>
          <p>{lead.address || [lead.city, lead.state].filter(Boolean).join(', ') || 'Address unknown'}</p>
        </div>
        <div className="row">
          {productName && (
            <span className="badge tone-violet" title="The product this lead is a prospect for">
              <Package size={12} /> {productName}
            </span>
          )}
          <StatusBadge status={lead.pipelineStatus} />
          <button
            className="btn"
            onClick={() => run(() => enrich(id).unwrap(), 'Research restarted')}
            disabled={!lead.website || enriching || researching}
          >
            <RefreshCw size={16} /> Re-run research
          </button>
          <button
            className="btn btn-primary"
            onClick={requestDraft}
            disabled={drafting || waitingDraft || !lead.emails.length}
          >
            <Wand2 size={16} /> {currentDraft ? 'Regenerate email' : 'Draft email with AI'}
          </button>
        </div>
      </div>

      {lead.pipelineError && <Banner kind="warn">{lead.pipelineError}</Banner>}

      <div className="split">
        <div className="stack">
          {/* AI research */}
          <div className="panel card">
            <div className="card-title">
              <Brain size={18} /> AI research
            </div>
            {ai?.analyzedAt ? (
              (() => {
                const r = researchView(ai, lead);
                const foundSignals = r.signals.filter((sg) => sg.found && sg.evidence);
                return (
                  <div className="stack" style={{ gap: 16 }}>
                    <div className="row" style={{ alignItems: 'flex-start', gap: 18 }}>
                      <ScoreRing score={ai.fitScore} size={72} />
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <div className="tiny faint">FIT FOR {(productName ?? 'this product').toUpperCase()}</div>
                        <p style={{ margin: '6px 0 0', lineHeight: 1.6 }}>{ai.summary}</p>
                      </div>
                    </div>

                    <div className="facts">
                      <div className="fact">
                        <div className="fact-label">Type</div>
                        <div className="fact-value">{r.type ?? '—'}</div>
                      </div>
                      <div className="fact">
                        <div className="fact-label">Size</div>
                        <div className="fact-value">{r.size ?? 'Not stated'}</div>
                      </div>
                      <div className="fact">
                        <div className="fact-label">Already uses</div>
                        <div className="fact-value">{r.existing || 'Nothing visible'}</div>
                      </div>
                      <div className="fact">
                        <div className="fact-label">Decision maker</div>
                        <div className="fact-value">
                          {ai.contactPersonName
                            ? `${ai.contactPersonName}${ai.contactPersonTitle ? ` · ${ai.contactPersonTitle}` : ''}`
                            : 'Not found'}
                        </div>
                      </div>
                    </div>

                    {!!r.signals.length && (
                      <div>
                        <div className="tiny faint" style={{ marginBottom: 8 }}>
                          BUYING SIGNALS
                        </div>
                        <div className="chips">
                          {r.signals.map((sg) => (
                            <Flag key={sg.name} on={sg.found} label={sg.name} title={sg.evidence ?? undefined} />
                          ))}
                        </div>
                        {!!foundSignals.length && (
                          <ul className="reasons small muted" style={{ marginTop: 10 }}>
                            {foundSignals.map((sg) => (
                              <li key={sg.name}>
                                <span>
                                  <b className="bold" style={{ color: 'var(--text)' }}>
                                    {sg.name}:
                                  </b>{' '}
                                  {sg.evidence}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {!!r.offerings.length && (
                      <div>
                        <div className="tiny faint" style={{ marginBottom: 8 }}>
                          WHAT THEY OFFER
                        </div>
                        <div className="chips">
                          {r.offerings.map((o) => (
                            <span key={o} className="chip">
                              {o}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {!!ai.fitReasons?.length && (
                      <div>
                        <div className="tiny faint" style={{ marginBottom: 8 }}>
                          WHY THIS SCORE
                        </div>
                        <ul className="reasons">
                          {ai.fitReasons.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="tiny faint">
                      Analysed {new Date(ai.analyzedAt).toLocaleString()} · {ai.model} · from {lead.crawledPages.length}{' '}
                      page{lead.crawledPages.length === 1 ? '' : 's'}
                    </div>
                  </div>
                );
              })()
            ) : researching ? (
              <div className="row muted small">
                <div className="spinner" /> Reading the website and analysing… this usually takes under a minute.
              </div>
            ) : (
              <p className="muted small" style={{ margin: 0 }}>
                {lead.website ? 'Not analysed yet.' : 'No website on record, so there is nothing to research yet.'}
              </p>
            )}
          </div>

          {/* Outreach */}
          <div className="panel card">
            <div className="card-title">
              <Mail size={18} /> Outreach
            </div>
            {waitingDraft && (
              <div className="row muted small" style={{ marginBottom: 12 }}>
                <div className="spinner" /> AI is writing the email…
              </div>
            )}
            {lead.outreach.length ? (
              <div className="stack">
                {lead.outreach.map((e) => (
                  <EmailEditor
                    key={e._id}
                    email={{ ...e, leadId: { _id: lead._id, name: lead.name, city: lead.city, ai: lead.ai } }}
                  />
                ))}
              </div>
            ) : (
              !waitingDraft && (
                <p className="muted small" style={{ margin: 0 }}>
                  No emails yet.
                </p>
              )
            )}
          </div>
        </div>

        <div className="stack">
          {/* Contact details */}
          <div className="panel card stack" style={{ gap: 14 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>
              <Contact size={18} /> Contact details
            </div>

            {lead.website && (
              <a
                href={/^https?:/.test(lead.website) ? lead.website : `https://${lead.website}`}
                target="_blank"
                rel="noreferrer"
                className="row small"
              >
                <Globe size={15} /> {lead.website} <ExternalLink size={13} />
              </a>
            )}

            {lead.phones.map((p) => (
              <a key={p} href={`tel:${p}`} className="row small" style={{ color: 'var(--text)' }}>
                <Phone size={15} className="muted" /> {p}
              </a>
            ))}

            <div className="divider" />
            <div className="tiny faint">EMAILS</div>
            {lead.emails.length ? (
              <div className="list">
                {lead.emails.map((e) => (
                  <div key={e.address} className="list-item" style={{ padding: '10px 12px' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="small truncate">
                        {e.address}
                        {ai?.recommendedEmail === e.address && (
                          <span className="badge tone-violet" style={{ marginLeft: 8 }}>
                            AI pick
                          </span>
                        )}
                      </div>
                      <div className="tiny faint truncate">
                        {e.source === 'website' && e.page ? (
                          <a href={e.page} target="_blank" rel="noreferrer">
                            found on {new URL(e.page).pathname}
                          </a>
                        ) : (
                          `source: ${e.source}`
                        )}
                      </div>
                    </div>
                    <button
                      className="btn btn-sm btn-ghost icon-btn"
                      aria-label={`Remove ${e.address}`}
                      onClick={() => run(() => updateLead({ id, removeEmail: e.address }).unwrap(), 'Email removed')}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted small" style={{ margin: 0 }}>
                No public email found.
              </p>
            )}
            <form className="row" onSubmit={addEmail} style={{ flexWrap: 'nowrap' }}>
              <input
                className="input"
                type="email"
                placeholder="Add an email you know"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              <button className="btn icon-btn" style={{ width: 42, height: 42 }} type="submit" aria-label="Add email">
                <Plus size={17} />
              </button>
            </form>
          </div>

          {/* Sales tracking */}
          <div className="panel card stack" style={{ gap: 14 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>
              <NotebookPen size={18} /> Sales tracking
            </div>
            <div className="field">
              <label htmlFor="sales">Status</label>
              <select
                id="sales"
                className="select"
                value={lead.salesStatus}
                onChange={(e) =>
                  run(() => updateLead({ id, salesStatus: e.target.value as SalesStatus }).unwrap(), 'Status updated')
                }
              >
                {SALES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                className="textarea"
                placeholder="Call notes, follow-up date…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <button
              className="btn"
              disabled={notes === (lead.notes ?? '')}
              onClick={() => run(() => updateLead({ id, notes }).unwrap(), 'Notes saved')}
            >
              Save notes
            </button>
          </div>

          {!!lead.crawledPages.length && (
            <div className="panel card">
              <div className="card-title">
                <Globe size={18} /> Pages read
              </div>
              <div className="list">
                {lead.crawledPages.map((p) => (
                  <a key={p} href={p} target="_blank" rel="noreferrer" className="small truncate">
                    {p}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
