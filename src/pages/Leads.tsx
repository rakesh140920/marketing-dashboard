import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Building2, ChevronLeft, ChevronRight, Package, Search as SearchIcon, Wand2, X } from 'lucide-react';
import { errorMessage, useDraftEmailsMutation, useGetLeadsQuery, useGetProductsQuery } from '../api/api';
import type { LeadFilters, PipelineStatus, SalesStatus } from '../api/types';
import { Empty, Loading } from '../components/Feedback';
import ScoreRing from '../components/ScoreRing';
import StatusBadge from '../components/StatusBadge';
import { useLiveUpdates } from '../app/liveUpdates';

const PIPELINE: PipelineStatus[] = ['new', 'crawling', 'analyzing', 'ready', 'no_website', 'failed'];
const SALES: SalesStatus[] = ['open', 'contacted', 'replied', 'not_interested', 'do_not_contact'];
const PIPELINE_LABEL: Record<PipelineStatus, string> = {
  new: 'Waiting',
  crawling: 'Reading website',
  analyzing: 'AI analysing',
  ready: 'Researched',
  no_website: 'No website',
  failed: 'Failed',
};
const SALES_LABEL: Record<SalesStatus, string> = {
  open: 'Open',
  contacted: 'Contacted',
  replied: 'Replied',
  not_interested: 'Not interested',
  do_not_contact: 'Do not contact',
};

/** Wait until the user stops typing before hitting the API. */
function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function Leads() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const searchId = params.get('searchId') ?? undefined;
  // Product filter lives in the URL so "N leads" links from the Products page work
  const productId = params.get('productId') ?? '';
  const setProductId = (id: string) => {
    if (id) params.set('productId', id);
    else params.delete('productId');
    setParams(params);
  };
  const { data: products } = useGetProductsQuery();
  const productName = (id: string) => products?.find((p) => p._id === id)?.name;

  const [q, setQ] = useState('');
  const [pipelineStatus, setPipelineStatus] = useState<LeadFilters['pipelineStatus']>('');
  const [salesStatus, setSalesStatus] = useState<LeadFilters['salesStatus']>('');
  const [minScore, setMinScore] = useState<LeadFilters['minScore']>('');
  const [hasEmail, setHasEmail] = useState<LeadFilters['hasEmail']>('');
  const [sort, setSort] = useState<NonNullable<LeadFilters['sort']>>('score');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const debouncedQ = useDebounced(q);
  const filters = useMemo<LeadFilters>(
    () => ({ q: debouncedQ, productId, searchId, pipelineStatus, salesStatus, minScore, hasEmail, sort, page, limit: 25 }),
    [debouncedQ, productId, searchId, pipelineStatus, salesStatus, minScore, hasEmail, sort, page],
  );

  // Back to page 1 whenever the filters change
  useEffect(() => setPage(1), [debouncedQ, productId, searchId, pipelineStatus, salesStatus, minScore, hasEmail, sort]);

  const { connected } = useLiveUpdates();
  const [poll, setPoll] = useState(0);
  const { data, isLoading, isFetching } = useGetLeadsQuery(filters, { pollingInterval: poll });
  const active = data?.items.some((l) => ['new', 'crawling', 'analyzing'].includes(l.pipelineStatus));
  useEffect(() => setPoll(active && !connected ? 5000 : 0), [active, connected]);

  const [draftEmails, { isLoading: drafting }] = useDraftEmailsMutation();

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const pageIds = data?.items.map((l) => l._id) ?? [];
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of pageIds) {
        if (allOnPage) next.delete(id);
        else next.add(id);
      }
      return next;
    });

  const draft = async () => {
    try {
      const r = await draftEmails([...selected]).unwrap();
      toast.success(
        `AI is writing ${r.queued} email${r.queued === 1 ? '' : 's'}` +
          (r.skipped ? ` · ${r.skipped} skipped (no email address)` : '') +
          ' — review them in the Outbox',
      );
      setSelected(new Set());
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Leads</h1>
          <p>
            {data ? `${data.total} leads` : 'Leads'}
            {productId && productName(productId) ? ` for ${productName(productId)}` : ''} · select good fits and let AI
            draft the first email.
          </p>
        </div>
        {isFetching && !isLoading && <div className="spinner" />}
      </div>

      <div className="panel card stack" style={{ gap: 14 }}>
        <div className="input-icon">
          <SearchIcon size={16} />
          <input
            className="input"
            placeholder="Search name, city, email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="filters">
          <select className="select" value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">All products</option>
            {products?.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            className="select"
            value={pipelineStatus}
            onChange={(e) => setPipelineStatus(e.target.value as PipelineStatus | '')}
          >
            <option value="">Any research status</option>
            {PIPELINE.map((s) => (
              <option key={s} value={s}>
                {PIPELINE_LABEL[s]}
              </option>
            ))}
          </select>
          <select
            className="select"
            value={salesStatus}
            onChange={(e) => setSalesStatus(e.target.value as SalesStatus | '')}
          >
            <option value="">Any sales status</option>
            {SALES.map((s) => (
              <option key={s} value={s}>
                {SALES_LABEL[s]}
              </option>
            ))}
          </select>
          <select
            className="select"
            value={String(minScore)}
            onChange={(e) => setMinScore(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Any fit score</option>
            <option value="40">Score 40+</option>
            <option value="60">Score 60+</option>
            <option value="80">Score 80+</option>
          </select>
          <select
            className="select"
            value={hasEmail}
            onChange={(e) => setHasEmail(e.target.value as LeadFilters['hasEmail'])}
          >
            <option value="">With or without email</option>
            <option value="true">Has email</option>
            <option value="false">No email</option>
          </select>
          <select className="select" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="score">Best fit first</option>
            <option value="recent">Newest first</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>

        {searchId && (
          <div className="row">
            <span className="chip">
              Showing one search
              <button
                className="btn btn-ghost btn-sm icon-btn"
                style={{ height: 20, width: 20 }}
                onClick={() => {
                  params.delete('searchId');
                  setParams(params);
                }}
                aria-label="Clear search filter"
              >
                <X size={13} />
              </button>
            </span>
          </div>
        )}

        {isLoading ? (
          <Loading />
        ) : !data?.items.length ? (
          <Empty icon={Building2} title="No leads match">
            Run a search on the Find leads page, or loosen the filters.
          </Empty>
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>
                      <input type="checkbox" className="checkbox" checked={allOnPage} onChange={toggleAll} />
                    </th>
                    <th>Organisation</th>
                    <th>Fit</th>
                    <th>Research</th>
                    <th>Email</th>
                    <th>Contact person</th>
                    <th>Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((lead) => {
                    const email = lead.ai?.recommendedEmail ?? lead.emails[0]?.address;
                    return (
                      <tr
                        key={lead._id}
                        className={selected.has(lead._id) ? 'selected' : ''}
                        onClick={() => navigate(`/leads/${lead._id}`)}
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="checkbox"
                            checked={selected.has(lead._id)}
                            onChange={() => toggle(lead._id)}
                          />
                        </td>
                        <td style={{ maxWidth: 280 }}>
                          <div className="bold truncate">{lead.name}</div>
                          <div className="tiny muted truncate">
                            {[lead.city, lead.state].filter(Boolean).join(', ') || lead.address || '—'}
                            {!productId && productName(lead.productId) && (
                              <span className="badge tone-violet" style={{ marginLeft: 8, padding: '1px 8px' }}>
                                <Package size={10} /> {productName(lead.productId)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <ScoreRing score={lead.ai?.fitScore} size={38} />
                        </td>
                        <td>
                          <StatusBadge status={lead.pipelineStatus} />
                        </td>
                        <td style={{ maxWidth: 220 }}>
                          {email ? (
                            <span className="truncate" style={{ display: 'block' }}>
                              {email}
                              {lead.emails.length > 1 && <span className="faint"> +{lead.emails.length - 1}</span>}
                            </span>
                          ) : (
                            <span className="faint">—</span>
                          )}
                        </td>
                        <td style={{ maxWidth: 200 }}>
                          {lead.ai?.contactPersonName ? (
                            <>
                              <div className="truncate">{lead.ai.contactPersonName}</div>
                              <div className="tiny muted truncate">{lead.ai.contactPersonTitle}</div>
                            </>
                          ) : (
                            <span className="faint">—</span>
                          )}
                        </td>
                        <td>
                          <StatusBadge status={lead.salesStatus} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <span>
                Page {data.page} of {data.pages}
              </span>
              <div className="row">
                <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft size={15} /> Prev
                </button>
                <button
                  className="btn btn-sm"
                  disabled={page >= data.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {selected.size > 0 && (
        <div className="panel selection-bar">
          <span className="bold">{selected.size} selected</span>
          <button className="btn btn-sm btn-ghost" onClick={() => setSelected(new Set())}>
            Clear
          </button>
          <div className="spacer" />
          <button className="btn btn-primary" onClick={draft} disabled={drafting}>
            <Wand2 size={16} /> Draft emails with AI
          </button>
        </div>
      )}
    </>
  );
}
