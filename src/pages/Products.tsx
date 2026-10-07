import { FormEvent, KeyboardEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Package, Pencil, Plus, Save, Search as SearchIcon, Trash2, X } from 'lucide-react';
import {
  errorMessage,
  useCreateProductMutation,
  useDeleteProductMutation,
  useGetProductsQuery,
  useUpdateProductMutation,
} from '../api/api';
import type { Product, ProductInput } from '../api/types';
import { Empty, Loading } from '../components/Feedback';

const MAX_SIGNALS = 10;

const EMPTY: ProductInput = {
  name: '',
  description: '',
  targetCustomer: '',
  signals: [],
  callToAction: 'Ask for a 20-minute online demo this week.',
  website: '',
};

const toInput = (p: Product): ProductInput => ({
  name: p.name,
  description: p.description,
  targetCustomer: p.targetCustomer ?? '',
  signals: p.signals ?? [],
  callToAction: p.callToAction ?? '',
  website: p.website ?? '',
});

/** Create / edit form. `product` undefined = new product. */
function ProductEditor({ product, onDone }: { product?: Product; onDone: (saved?: Product) => void }) {
  const [form, setForm] = useState<ProductInput>(product ? toInput(product) : EMPTY);
  const [signal, setSignal] = useState('');
  useEffect(() => setForm(product ? toInput(product) : EMPTY), [product]);

  const [create, { isLoading: creating }] = useCreateProductMutation();
  const [update, { isLoading: updating }] = useUpdateProductMutation();
  const saving = creating || updating;

  const set = (k: keyof ProductInput) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const addSignal = () => {
    const s = signal.trim();
    if (!s) return;
    setForm((f) => (f.signals.includes(s) ? f : { ...f, signals: [...f.signals, s] }));
    setSignal('');
  };
  const onSignalKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSignal();
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const saved = product ? await update({ id: product._id, ...form }).unwrap() : await create(form).unwrap();
      toast.success(product ? 'Product updated' : 'Product added');
      onDone(saved);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <form className="panel card stack" onSubmit={submit}>
      <div className="card-title" style={{ marginBottom: 0 }}>
        {product ? <Pencil size={18} /> : <Plus size={18} />} {product ? `Edit ${product.name}` : 'New product'}
      </div>

      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="p-name">Product name</label>
          <input id="p-name" className="input" value={form.name} onChange={set('name')} placeholder="VitalBase" required />
        </div>
        <div className="field">
          <label htmlFor="p-web">
            Website <span className="faint">(optional)</span>
          </label>
          <input id="p-web" className="input" value={form.website} onChange={set('website')} placeholder="https://…" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="p-desc">What it does</label>
        <textarea
          id="p-desc"
          className="textarea"
          style={{ minHeight: 170 }}
          value={form.description}
          onChange={set('description')}
          placeholder="Features, integrations, pricing, customers who use it… The AI only mentions what is written here."
          required
        />
        <span className="hint">The AI uses this to write emails and never claims anything that isn't written here.</span>
      </div>

      <div className="field">
        <label htmlFor="p-target">Ideal customer</label>
        <textarea
          id="p-target"
          className="textarea"
          style={{ minHeight: 80 }}
          value={form.targetCustomer}
          onChange={set('targetCustomer')}
          placeholder="e.g. Private hospitals in India with 20–300 beds"
        />
        <span className="hint">Used to score each lead from 0 to 100.</span>
      </div>

      <div className="field">
        <label htmlFor="p-signal">Buying signals to look for</label>
        <div className="row" style={{ flexWrap: 'nowrap', gap: 8 }}>
          <input
            id="p-signal"
            className="input"
            value={signal}
            onChange={(e) => setSignal(e.target.value)}
            onKeyDown={onSignalKey}
            placeholder="e.g. ABDM, uses Excel, online booking"
            maxLength={80}
            disabled={form.signals.length >= MAX_SIGNALS}
          />
          <button
            type="button"
            className="btn"
            onClick={addSignal}
            disabled={!signal.trim() || form.signals.length >= MAX_SIGNALS}
          >
            <Plus size={15} /> Add
          </button>
        </div>
        {!!form.signals.length && (
          <div className="chips">
            {form.signals.map((s) => (
              <span key={s} className="chip">
                {s}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm icon-btn"
                  style={{ height: 20, width: 20 }}
                  aria-label={`Remove ${s}`}
                  onClick={() => setForm((f) => ({ ...f, signals: f.signals.filter((x) => x !== s) }))}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        <span className="hint">
          Things on a prospect's website that suggest they need this product. The AI checks each one and uses it as the
          email's hook.
        </span>
      </div>

      <div className="field">
        <label htmlFor="p-cta">Call to action</label>
        <input id="p-cta" className="input" value={form.callToAction} onChange={set('callToAction')} required />
      </div>

      <div className="row">
        <button className="btn btn-primary" type="submit" disabled={saving}>
          <Save size={16} /> {saving ? 'Saving…' : product ? 'Save changes' : 'Add product'}
        </button>
        <button className="btn btn-ghost" type="button" onClick={() => onDone()}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function Products() {
  const { data: products, isLoading } = useGetProductsQuery();
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [remove] = useDeleteProductMutation();

  // Open the form straight away when there are no products yet
  useEffect(() => {
    if (products && !products.length && editing === null) setEditing('new');
  }, [products, editing]);

  const current = products?.find((p) => p._id === editing);

  const doDelete = async (p: Product) => {
    if (!window.confirm(`Delete "${p.name}"? Its past searches are removed too.`)) return;
    try {
      await remove(p._id).unwrap();
      toast.success('Product deleted');
      if (editing === p._id) setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (isLoading) return <Loading />;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Products</h1>
          <p>What you're marketing. Each search is for one product, and the AI researches and writes emails for it.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing('new')}>
          <Plus size={16} /> New product
        </button>
      </div>

      <div className="split" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.3fr)' }}>
        <div className="panel card">
          {!products?.length ? (
            <Empty icon={Package} title="No products yet">
              Add the first product you want to find customers for.
            </Empty>
          ) : (
            <div className="list">
              {products.map((p) => (
                <div
                  key={p._id}
                  className={`list-item clickable${editing === p._id ? ' active' : ''}`}
                  style={{ alignItems: 'flex-start' }}
                  onClick={() => setEditing(p._id)}
                >
                  <div className="stat-icon" style={{ marginTop: 2 }}>
                    <Package size={16} className="ic-violet" />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="bold">{p.name}</div>
                    <div
                      className="tiny muted"
                      style={{ marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                    >
                      {p.description}
                    </div>
                    <div className="row tiny faint" style={{ marginTop: 8, gap: 12 }}>
                      <Link to={`/leads?productId=${p._id}`} onClick={(e) => e.stopPropagation()}>
                        {p.leadCount ?? 0} leads
                      </Link>
                      <span>{p.searchCount ?? 0} searches</span>
                      {!!p.signals?.length && <span>{p.signals.length} signals</span>}
                    </div>
                  </div>
                  <div className="row" style={{ gap: 4, flexWrap: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                    <Link to={`/discover?productId=${p._id}`} className="btn btn-sm" title="Find leads for this product">
                      <SearchIcon size={14} />
                    </Link>
                    <button
                      className="btn btn-sm btn-ghost icon-btn"
                      aria-label={`Delete ${p.name}`}
                      title={p.leadCount ? 'Has leads, so it cannot be deleted' : 'Delete'}
                      disabled={!!p.leadCount}
                      onClick={() => doDelete(p)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {editing ? (
          <ProductEditor
            key={editing}
            product={editing === 'new' ? undefined : current}
            onDone={(saved) => setEditing(saved ? saved._id : null)}
          />
        ) : (
          <div className="panel card">
            <Empty icon={Pencil} title="Select a product to edit">
              Or add a new one. Good descriptions and buying signals give better scores and emails.
            </Empty>
          </div>
        )}
      </div>
    </>
  );
}
