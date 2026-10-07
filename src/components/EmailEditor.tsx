import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Check, ExternalLink, FlaskConical, Save, Send, X } from 'lucide-react';
import {
  errorMessage,
  useApproveEmailMutation,
  useGetStatsQuery,
  useRejectEmailMutation,
  useUpdateEmailMutation,
} from '../api/api';
import type { EmailMessage } from '../api/types';
import StatusBadge from './StatusBadge';
import ScoreRing from './ScoreRing';

const fmt = (d?: string) => (d ? new Date(d).toLocaleString() : '');

/** Review screen for one AI-written email: edit, then Approve & send or Reject. */
export default function EmailEditor({ email }: { email: EmailMessage }) {
  const [to, setTo] = useState(email.to ?? '');
  const [subject, setSubject] = useState(email.subject);
  const [body, setBody] = useState(email.body);

  // Reset the form when a different email is selected or the AI regenerates it
  useEffect(() => {
    setTo(email.to ?? '');
    setSubject(email.subject);
    setBody(email.body);
  }, [email._id, email.to, email.subject, email.body]);

  const [update, { isLoading: saving }] = useUpdateEmailMutation();
  const [approve, { isLoading: approving }] = useApproveEmailMutation();
  const [reject, { isLoading: rejecting }] = useRejectEmailMutation();

  const lead = typeof email.leadId === 'object' ? email.leadId : null;
  const { data: stats } = useGetStatsQuery();
  const testMode = stats?.sending.testMode ?? false;
  const editable = ['draft', 'failed', 'rejected'].includes(email.status);
  const dirty = to !== (email.to ?? '') || subject !== email.subject || body !== email.body;
  const busy = saving || approving || rejecting;

  const save = async () => {
    try {
      await update({ id: email._id, to, subject, body }).unwrap();
      toast.success('Saved');
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    }
  };

  const approveAndSend = async () => {
    if (dirty || email.status !== 'draft') {
      if (!(await save())) return;
    }
    try {
      await approve(email._id).unwrap();
      toast.success('Approved — queued for sending');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const doReject = async () => {
    try {
      await reject(email._id).unwrap();
      toast('Rejected', { icon: '🗑️' });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="panel card stack">
      <div className="row">
        {lead && <ScoreRing score={lead.ai?.fitScore} size={44} />}
        <div style={{ minWidth: 0 }}>
          <div className="bold truncate">{lead?.name ?? 'Lead'}</div>
          <div className="tiny muted">
            {lead?.city ?? ''} {lead?.ai?.contactPersonName ? `· ${lead.ai.contactPersonName}` : ''}
          </div>
        </div>
        <div className="spacer" />
        <StatusBadge status={email.status} />
        {lead && (
          <Link to={`/leads/${lead._id}`} className="btn btn-sm btn-ghost" title="Open lead">
            <ExternalLink size={15} />
          </Link>
        )}
      </div>

      {email.error && <div className="banner panel warn small">{email.error}</div>}

      {editable ? (
        <>
          <div className="field">
            <label htmlFor="to">To</label>
            <input id="to" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="subject">Subject</label>
            <input id="subject" className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="body">Message</label>
            <textarea
              id="body"
              className="textarea"
              style={{ minHeight: 300 }}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <span className="hint">Your signature (Settings) and an unsubscribe link are added automatically when sending.</span>
          </div>
          <div className="row">
            <button className="btn btn-primary" onClick={approveAndSend} disabled={busy || !to}>
              {testMode ? <FlaskConical size={16} /> : <Send size={16} />}
              {testMode ? 'Approve & send test' : 'Approve & send'}
            </button>
            <button className="btn" onClick={save} disabled={busy || !dirty}>
              <Save size={16} /> Save
            </button>
            <div className="spacer" />
            {email.status === 'draft' && (
              <button className="btn btn-danger" onClick={doReject} disabled={busy}>
                <X size={16} /> Reject
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="small">
            <div>
              <span className="muted">To:</span> {email.to}
            </div>
            <div style={{ marginTop: 4 }}>
              <span className="muted">Subject:</span> <span className="bold">{email.subject}</span>
            </div>
          </div>
          <div className="email-preview pre">{email.body}</div>
          <div className="row tiny muted">
            {email.status === 'sent' && (
              <>
                <Check size={14} className="ic-green" /> Sent {fmt(email.sentAt)}
                {email.dryRun && <span className="badge tone-amber">Dry run — not actually delivered</span>}
                {email.testMode && (
                  <span className="badge tone-violet">
                    <FlaskConical size={12} /> Test — delivered to {email.deliveredTo?.join(', ')}
                  </span>
                )}
              </>
            )}
            {email.status === 'approved' && <>Approved {fmt(email.approvedAt)} — waiting in the send queue</>}
          </div>
        </>
      )}
    </div>
  );
}
