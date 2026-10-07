import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  AppSettings,
  CreateSearchInput,
  EmailMessage,
  EmailStatus,
  Lead,
  LeadDetail,
  LeadFilters,
  Paged,
  Product,
  ProductInput,
  SalesStatus,
  Search,
  Stats,
} from './types';

/** Drop empty filter values so they don't end up as `?status=` in the URL. */
const clean = (params: object) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null));

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: import.meta.env.VITE_API_URL || '/api' }),
  tagTypes: ['Product', 'Search', 'Lead', 'Email', 'Stats', 'Settings'],
  endpoints: (b) => ({
    // ─── Dashboard ──────────────────────────────
    getStats: b.query<Stats, void>({
      query: () => 'stats',
      providesTags: ['Stats'],
    }),

    // ─── Products ───────────────────────────────
    getProducts: b.query<Product[], void>({
      query: () => 'products',
      providesTags: ['Product'],
    }),
    createProduct: b.mutation<Product, ProductInput>({
      query: (body) => ({ url: 'products', method: 'POST', body }),
      invalidatesTags: ['Product'],
    }),
    updateProduct: b.mutation<Product, ProductInput & { id: string }>({
      query: ({ id, ...body }) => ({ url: `products/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Product'],
    }),
    deleteProduct: b.mutation<void, string>({
      query: (id) => ({ url: `products/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Product', 'Search'],
    }),

    // ─── Discovery ──────────────────────────────
    getSearches: b.query<Search[], void>({
      query: () => 'searches',
      providesTags: ['Search'],
    }),
    createSearch: b.mutation<Search, CreateSearchInput>({
      query: (body) => ({ url: 'searches', method: 'POST', body }),
      invalidatesTags: ['Search', 'Product', 'Stats'],
    }),

    // ─── Leads ──────────────────────────────────
    getLeads: b.query<Paged<Lead>, LeadFilters>({
      query: (filters) => ({ url: 'leads', params: clean(filters) }),
      providesTags: ['Lead'],
    }),
    getLead: b.query<LeadDetail, string>({
      query: (id) => `leads/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Lead', id }],
    }),
    updateLead: b.mutation<
      Lead,
      { id: string; salesStatus?: SalesStatus; notes?: string; website?: string; addEmail?: string; removeEmail?: string }
    >({
      query: ({ id, ...body }) => ({ url: `leads/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Lead', 'Stats'],
    }),
    enrichLead: b.mutation<Lead, string>({
      query: (id) => ({ url: `leads/${id}/enrich`, method: 'POST' }),
      invalidatesTags: ['Lead'],
    }),
    enrichPending: b.mutation<{ queued: number }, void>({
      query: () => ({ url: 'leads/enrich-pending', method: 'POST' }),
      invalidatesTags: ['Lead', 'Search'],
    }),

    // ─── Outreach ───────────────────────────────
    draftEmails: b.mutation<{ queued: number; skipped: number }, string[]>({
      query: (leadIds) => ({ url: 'emails/draft', method: 'POST', body: { leadIds } }),
      invalidatesTags: ['Email', 'Stats'],
    }),
    getEmails: b.query<EmailMessage[], EmailStatus | undefined>({
      query: (status) => ({ url: 'emails', params: clean({ status }) }),
      providesTags: ['Email'],
    }),
    updateEmail: b.mutation<EmailMessage, { id: string; to?: string; subject?: string; body?: string }>({
      query: ({ id, ...body }) => ({ url: `emails/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Email', 'Lead', 'Stats'],
    }),
    approveEmail: b.mutation<EmailMessage, string>({
      query: (id) => ({ url: `emails/${id}/approve`, method: 'POST' }),
      invalidatesTags: ['Email', 'Lead', 'Stats'],
    }),
    rejectEmail: b.mutation<EmailMessage, string>({
      query: (id) => ({ url: `emails/${id}/reject`, method: 'POST' }),
      invalidatesTags: ['Email', 'Lead', 'Stats'],
    }),

    // ─── Settings ───────────────────────────────
    getSettings: b.query<AppSettings, void>({
      query: () => 'settings',
      providesTags: ['Settings'],
    }),
    updateSettings: b.mutation<AppSettings, Partial<AppSettings>>({
      query: (body) => ({ url: 'settings', method: 'PUT', body }),
      invalidatesTags: ['Settings', 'Stats'],
    }),
  }),
});

export const {
  useGetStatsQuery,
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGetSearchesQuery,
  useCreateSearchMutation,
  useGetLeadsQuery,
  useGetLeadQuery,
  useUpdateLeadMutation,
  useEnrichLeadMutation,
  useEnrichPendingMutation,
  useDraftEmailsMutation,
  useGetEmailsQuery,
  useUpdateEmailMutation,
  useApproveEmailMutation,
  useRejectEmailMutation,
  useGetSettingsQuery,
  useUpdateSettingsMutation,
} = api;

/** Pull the backend's `{ message }` out of an RTK Query error. */
export function errorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { data?: { message?: string }; error?: string; status?: unknown };
    if (e.data?.message) return e.data.message;
    if (e.error) return e.error;
    if (e.status) return `Request failed (${String(e.status)})`;
  }
  return 'Something went wrong';
}
