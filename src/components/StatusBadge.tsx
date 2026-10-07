import type { EmailStatus, PipelineStatus, SalesStatus, SearchStatus } from '../api/types';

type Tone = 'gray' | 'blue' | 'violet' | 'green' | 'amber' | 'red';

const MAP: Record<string, { label: string; tone: Tone; pulse?: boolean }> = {
  // search
  queued: { label: 'Queued', tone: 'gray', pulse: true },
  running: { label: 'Searching', tone: 'blue', pulse: true },
  done: { label: 'Done', tone: 'green' },
  // pipeline
  new: { label: 'Waiting', tone: 'gray', pulse: true },
  crawling: { label: 'Reading website', tone: 'blue', pulse: true },
  analyzing: { label: 'AI analysing', tone: 'violet', pulse: true },
  ready: { label: 'Researched', tone: 'green' },
  no_website: { label: 'No website', tone: 'amber' },
  failed: { label: 'Failed', tone: 'red' },
  // sales
  open: { label: 'Open', tone: 'gray' },
  contacted: { label: 'Contacted', tone: 'blue' },
  replied: { label: 'Replied', tone: 'green' },
  not_interested: { label: 'Not interested', tone: 'amber' },
  do_not_contact: { label: 'Do not contact', tone: 'red' },
  // email
  draft: { label: 'Draft', tone: 'violet' },
  approved: { label: 'Sending…', tone: 'blue', pulse: true },
  sent: { label: 'Sent', tone: 'green' },
  rejected: { label: 'Rejected', tone: 'gray' },
};

export const statusLabel = (s: string) => MAP[s]?.label ?? s;

export default function StatusBadge({ status }: { status: SearchStatus | PipelineStatus | SalesStatus | EmailStatus }) {
  const m = MAP[status] ?? { label: status, tone: 'gray' as Tone };
  return (
    <span className={`badge tone-${m.tone}${m.pulse ? ' pulse' : ''}`}>
      <span className="dot" />
      {m.label}
    </span>
  );
}
