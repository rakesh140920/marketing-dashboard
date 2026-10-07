import { FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Globe2, MapPin, Map as MapIcon, Package, Plus, RefreshCw, Search as SearchIcon, Sparkles, Tag, X } from 'lucide-react';
import {
  errorMessage,
  useCreateSearchMutation,
  useEnrichPendingMutation,
  useGetProductsQuery,
  useGetSearchesQuery,
  useGetStatsQuery,
} from '../api/api';
import type { Search, SearchSource } from '../api/types';
import { Banner, Empty, Loading } from '../components/Feedback';
import StatusBadge from '../components/StatusBadge';
import { useLiveUpdates } from '../app/liveUpdates';

/** How many of a search's new leads have finished research. */
export function searchProgress(s: Search) {
  const p = s.progress;
  const total = Object.values(p).reduce((a, b) => a + (b ?? 0), 0);
  const done = (p.ready ?? 0) + (p.failed ?? 0) + (p.no_website ?? 0);
  return { total, done, active: (p.new ?? 0) + (p.crawling ?? 0) + (p.analyzing ?? 0) };
}

const MAX_KEYWORDS = 5;
const KEYWORD_EXAMPLES = ['ICU', 'cashless', 'software', 'multi-speciality', 'exporter'];
const LAST_PRODUCT_KEY = 'vb.lastProduct';

const readLastProduct = () => {
  try {
    return localStorage.getItem(LAST_PRODUCT_KEY);
  } catch {
    return null;
  }
};

export default function Discover() {
  const { data: stats } = useGetStatsQuery();
  const googleEnabled = stats?.config.googlePlaces ?? false;

  // Which product we're finding customers for: ?productId=… link, else the last one used, else the first
  const [params] = useSearchParams();
  const { data: products, isLoading: productsLoading } = useGetProductsQuery();
  const [productId, setProductId] = useState(() => params.get('productId') ?? readLastProduct() ?? '');
  useEffect(() => {
    if (products?.length && !products.some((p) => p._id === productId)) setProductId(products[0]._id);
  }, [products, productId]);
  const product = products?.find((p) => p._id === productId);
  const productName = (id: string) => products?.find((p) => p._id === id)?.name ?? 'Deleted product';

  const chooseProduct = (id: string) => {
    setProductId(id);
    try {
      localStorage.setItem(LAST_PRODUCT_KEY, id);
    } catch {
      /* storage blocked — the choice just isn't remembered */
    }
  };

  const [source, setSource] = useState<SearchSource>('osm');
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [keywords, setKeywords] = useState<string[]>(['']);
  const [maxResults, setMaxResults] = useState(60);

  const [createSearch, { isLoading: creating }] = useCreateSearchMutation();
  const [enrichPending, { isLoading: retrying }] = useEnrichPendingMutation();

  // Live updates refresh searches as they progress; poll only if the stream is down
  const { connected } = useLiveUpdates();
  const [poll, setPoll] = useState(0);
  const { data: searches, isLoading } = useGetSearchesQuery(undefined, { pollingInterval: poll });
  const busy = searches?.some((s) => s.status === 'queued' || s.status === 'running' || searchProgress(s).active > 0);
  useEffect(() => setPoll(busy && !connected ? 5000 : 0), [busy, connected]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const extra = keywords.map((k) => k.trim()).filter(Boolean);
      await createSearch({ productId, source, query, location, keywords: extra, maxResults }).unwrap();
      toast.success(`Finding ${query} in ${location} for ${product?.name ?? 'your product'}…`);
      setLocation('');
      setKeywords(['']);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const retry = async () => {
    try {
      const r = await enrichPending().unwrap();
      toast.success(r.queued ? `Re-queued ${r.queued} leads for research` : 'Nothing pending');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Find leads</h1>
          <p>Pick a product, then find organisations that could buy it. Each one with a website is researched automatically.</p>
        </div>
        <button className="btn" onClick={retry} disabled={retrying}>
          <RefreshCw size={16} /> Retry pending research
        </button>
      </div>

      <div className="split">
        <form className="panel card stack" onSubmit={submit}>
          <div className="card-title" style={{ marginBottom: 0 }}>
            <Sparkles size={18} /> New search
          </div>

          {!productsLoading && !products?.length && (
            <Banner kind="warn">
              Add the product you're marketing first — the AI uses its description to research leads and write emails.{' '}
              <Link to="/products">Add a product →</Link>
            </Banner>
          )}

          <div className="field">
            <label htmlFor="product">Product you're marketing</label>
            <div className="row" style={{ flexWrap: 'nowrap', gap: 8 }}>
              <select
                id="product"
                className="select"
                value={productId}
                onChange={(e) => chooseProduct(e.target.value)}
                disabled={!products?.length}
                required
              >
                {products?.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <Link to="/products" className="btn" title="Add or edit products">
                <Package size={16} />
              </Link>
            </div>
            {product && (
              <span className="hint">
                {product.targetCustomer ? `Ideal customer: ${product.targetCustomer}` : product.description.slice(0, 140)}
              </span>
            )}
          </div>

          <div className="field">
            <label>Data source</label>
            <div className="segmented">
              <button type="button" className={source === 'osm' ? 'on' : ''} onClick={() => setSource('osm')}>
                <MapIcon size={16} /> OpenStreetMap · free
              </button>
              <button
                type="button"
                className={source === 'google' ? 'on' : ''}
                onClick={() => setSource('google')}
                disabled={!googleEnabled}
                title={googleEnabled ? '' : 'Set GOOGLE_PLACES_API_KEY in the backend .env'}
              >
                <Globe2 size={16} /> Google Places
              </button>
            </div>
            <span className="hint">
              {source === 'osm'
                ? 'Free and unlimited, but many Indian businesses have no website listed on OpenStreetMap.'
                : 'Much better website coverage. ~1,000 free requests/month (20 results each, max 60 per search).'}
            </span>
          </div>

          <div className="grid grid-2">
            <div className="field">
              <label htmlFor="q">What</label>
              <div className="input-icon">
                <SearchIcon size={16} />
                <input
                  id="q"
                  className="input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. hospitals, IT companies, dental clinics"
                  required
                />
              </div>
              {source === 'osm' && (
                <span className="hint">
                  Understands hospitals, clinics, doctors, dentists, pharmacies, labs, restaurants, hotels, schools,
                  colleges, banks, gyms and IT companies. Anything else is matched by name.
                </span>
              )}
            </div>
            <div className="field">
              <label htmlFor="loc">Where</label>
              <div className="input-icon">
                <MapPin size={16} />
                <input
                  id="loc"
                  className="input"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Mysuru, Karnataka"
                  required
                />
              </div>
            </div>
          </div>

          <div className="field">
            <label htmlFor="kw-0">
              Extra keywords <span className="faint">(optional)</span>
            </label>
            <div className="stack" style={{ gap: 8 }}>
              {keywords.map((kw, i) => (
                <div key={i} className="row" style={{ flexWrap: 'nowrap', gap: 8 }}>
                  <div className="input-icon" style={{ flex: 1 }}>
                    <Tag size={16} />
                    <input
                      id={`kw-${i}`}
                      className="input"
                      value={kw}
                      maxLength={60}
                      onChange={(e) => setKeywords((list) => list.map((k, j) => (j === i ? e.target.value : k)))}
                      placeholder={`e.g. ${KEYWORD_EXAMPLES[i % KEYWORD_EXAMPLES.length]}`}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn icon-btn"
                    style={{ width: 42, height: 42 }}
                    aria-label={`Remove keyword ${i + 1}`}
                    title="Remove"
                    onClick={() => setKeywords((list) => (list.length > 1 ? list.filter((_, j) => j !== i) : ['']))}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="row">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setKeywords((list) => [...list, ''])}
                disabled={keywords.length >= MAX_KEYWORDS}
              >
                <Plus size={15} /> Add keyword
              </button>
              <span className="hint">
                {source === 'google'
                  ? 'Added to the search text — e.g. “IT companies software in Udupi”.'
                  : 'OpenStreetMap matches names and speciality tags only — try words like “eye”, “children” or a chain name.'}
              </span>
            </div>
          </div>

          <div className="field">
            <label htmlFor="max">Maximum results</label>
            <select
              id="max"
              className="select"
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
            >
              {[20, 40, 60, 100, 200].map((n) => (
                <option key={n} value={n} disabled={source === 'google' && n > 60}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <button
            className="btn btn-primary"
            type="submit"
            disabled={creating || !location.trim() || !query.trim() || !product}
          >
            <SearchIcon size={16} /> {creating ? 'Starting…' : 'Search'}
          </button>
        </form>

        <div className="panel card">
          <div className="card-title">How it works</div>
          <ol className="reasons" style={{ paddingLeft: 0 }}>
            <li>You choose the product, what kind of organisation to look for, and where.</li>
            <li>We list matching organisations from the chosen map source.</li>
            <li>A crawler opens each one&apos;s own website — home, contact, about and team pages.</li>
            <li>Claude reads those pages, finds public emails and the decision-maker, checks the product&apos;s buying signals and scores the fit.</li>
            <li>You pick good leads, AI drafts an email about that product, and nothing is sent until you approve it.</li>
          </ol>
        </div>
      </div>

      <div className="panel card">
        <div className="card-title">Searches</div>
        {isLoading ? (
          <Loading />
        ) : !searches?.length ? (
          <Empty icon={MapIcon} title="No searches yet">
            Pick a product, then try e.g. “hospitals” in “Mysuru, Karnataka”.
          </Empty>
        ) : (
          <div className="list">
            {searches.map((s) => {
              const p = searchProgress(s);
              return (
                <div key={s._id} className="list-item" style={{ flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                    <div className="row" style={{ gap: 8 }}>
                      <span className="bold">{s.location}</span>
                      <span className="badge tone-violet">
                        <Package size={11} /> {productName(s.productId)}
                      </span>
                      <span className="chip tiny">{s.source === 'osm' ? 'OpenStreetMap' : 'Google'}</span>
                    </div>
                    <div className="tiny muted" style={{ marginTop: 4 }}>
                      “{s.query}” · {new Date(s.createdAt).toLocaleString()}
                    </div>
                    {!!s.keywords?.length && (
                      <div className="chips" style={{ marginTop: 6 }}>
                        {s.keywords.map((k) => (
                          <span key={k} className="chip tiny">
                            <Tag size={11} /> {k}
                          </span>
                        ))}
                      </div>
                    )}
                    {s.note && <div className="tiny faint" style={{ marginTop: 4 }}>{s.note}</div>}
                    {s.error && <div className="tiny text-danger" style={{ marginTop: 4 }}>{s.error}</div>}
                  </div>

                  <div className="small muted" style={{ flex: '0 0 auto' }}>
                    {s.found} found · {s.created} new · {s.duplicates} already known
                  </div>

                  {p.total > 0 && (
                    <div style={{ flex: '1 1 160px' }}>
                      <div className="tiny muted" style={{ marginBottom: 6 }}>
                        Research {p.done}/{p.total}
                      </div>
                      <div className="bar">
                        <span style={{ width: `${(p.done / p.total) * 100}%` }} />
                      </div>
                    </div>
                  )}

                  <StatusBadge status={s.status} />
                  <Link to={`/leads?searchId=${s._id}`} className="btn btn-sm">
                    View leads
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
