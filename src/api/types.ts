export type SearchSource = 'osm' | 'google';
export type SearchStatus = 'queued' | 'running' | 'done' | 'failed';
export type PipelineStatus = 'new' | 'crawling' | 'analyzing' | 'ready' | 'no_website' | 'failed';
export type SalesStatus = 'open' | 'contacted' | 'replied' | 'not_interested' | 'do_not_contact';
export type EmailStatus = 'draft' | 'approved' | 'sent' | 'failed' | 'rejected';

export interface Product {
  _id: string;
  name: string;
  description: string;
  targetCustomer: string;
  signals: string[];
  callToAction: string;
  website: string;
  leadCount?: number;
  searchCount?: number;
  createdAt: string;
}

export type ProductInput = Pick<Product, 'name' | 'description' | 'targetCustomer' | 'signals' | 'callToAction' | 'website'>;

export interface Search {
  _id: string;
  productId: string;
  source: SearchSource;
  query: string;
  location: string;
  keywords?: string[];
  maxResults: number;
  status: SearchStatus;
  found: number;
  created: number;
  duplicates: number;
  note?: string;
  error?: string;
  createdAt: string;
  finishedAt?: string;
  progress: Partial<Record<PipelineStatus, number>>;
}

export interface CreateSearchInput {
  productId: string;
  source: SearchSource;
  query: string;
  location: string;
  keywords: string[];
  maxResults: number;
}

export interface LeadEmail {
  address: string;
  source: 'website' | 'osm' | 'manual';
  page?: string;
}

export interface LeadSignal {
  name: string;
  found: boolean;
  evidence?: string | null;
}

export interface LeadAI {
  productName?: string;
  summary?: string;
  businessType?: string;
  size?: string | null;
  offerings?: string[];
  existingSolutions?: string | null;
  signals?: LeadSignal[];
  // Older hospital-only analyses
  hospitalType?: string;
  bedCount?: number | null;
  specialties?: string[];
  existingSoftware?: string | null;
  mentionsABDM?: boolean;
  mentionsNHCX?: boolean;
  mentionsInsurance?: boolean;
  contactPersonName?: string | null;
  contactPersonTitle?: string | null;
  recommendedEmail?: string | null;
  fitScore?: number;
  fitReasons?: string[];
  model?: string;
  analyzedAt?: string;
}

export interface Lead {
  _id: string;
  productId: string;
  searchId?: string;
  source: SearchSource;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  website?: string;
  phones: string[];
  emails: LeadEmail[];
  beds?: number;
  pipelineStatus: PipelineStatus;
  salesStatus: SalesStatus;
  pipelineError?: string;
  crawledPages: string[];
  crawledAt?: string;
  ai?: LeadAI;
  notes?: string;
  createdAt: string;
}

export interface LeadDetail extends Lead {
  outreach: EmailMessage[];
}

export interface LeadFilters {
  q?: string;
  productId?: string;
  searchId?: string;
  pipelineStatus?: PipelineStatus | '';
  salesStatus?: SalesStatus | '';
  minScore?: number | '';
  hasEmail?: 'true' | 'false' | '';
  sort?: 'score' | 'recent' | 'name';
  page?: number;
  limit?: number;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

export interface EmailLeadRef {
  _id: string;
  name: string;
  city?: string;
  website?: string;
  productId?: string;
  ai?: Pick<LeadAI, 'fitScore' | 'contactPersonName'>;
}

export interface EmailMessage {
  _id: string;
  leadId: string | EmailLeadRef;
  to?: string;
  subject: string;
  body: string;
  status: EmailStatus;
  model?: string;
  approvedAt?: string;
  sentAt?: string;
  dryRun?: boolean;
  testMode?: boolean;
  deliveredTo?: string[];
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Stats {
  funnel: {
    leads: number;
    withWebsite: number;
    withEmail: number;
    researched: number;
    qualified: number;
    sent: number;
  };
  emails: Record<EmailStatus, number>;
  sending: {
    sentToday: number;
    dailyLimit: number;
    perMinute: number;
    dryRun: boolean;
    testMode: boolean;
    testEmails: string[];
  };
  config: { googlePlaces: boolean; ai: boolean; aiModel: string; smtp: boolean };
  qualifiedScore: number;
}

export interface AppSettings {
  companyName: string;
  senderName: string;
  senderTitle: string;
  signature: string;
  testMode: boolean;
  testEmails: string[];
}
