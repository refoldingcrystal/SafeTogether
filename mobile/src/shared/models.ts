export type PersonalHelpCategory = 'Injured' | 'Stranded' | 'Lost' | 'Other personal assistance';

export type IncidentCategory = PersonalHelpCategory
  | 'Medical emergency'
  | 'Trapped person'
  | 'Missing person'
  | 'Fire'
  | 'Flooding'
  | 'Road blockage'
  | 'Infrastructure damage'
  | 'Other';

export type HelpCategory = 'Shelter' | 'Food and water' | 'Transport' | 'Qualified first aid' | 'Supplies' | 'Other practical help';
export type VerificationStatus = 'unverified' | 'verified' | 'rejected';
export type IncidentStatus = 'under_review' | 'verified' | 'assigned' | 'in_progress' | 'resolved' | 'rejected';
export type NoticeStatus = 'draft' | 'published' | 'expired' | 'withdrawn';
export type DataFreshness = 'live' | 'recently_synced' | 'cached' | 'outdated' | 'queued';

export type ApproximateLocation = {
  label: string;
  latitude?: number;
  longitude?: number;
  precision: 'neighborhood' | 'district' | 'landmark';
};

export type Incident = {
  id: string;
  category: IncidentCategory;
  description: string;
  approximateLocation: ApproximateLocation;
  submittedAt: string;
  updatedAt: string;
  source: 'community' | 'authority';
  verificationStatus: VerificationStatus;
};

export type HelpOffer = {
  id: string;
  category: HelpCategory;
  description: string;
  approximateLocation: ApproximateLocation;
  availability: string;
  capacity?: string;
  status: 'active' | 'withdrawn' | 'expired';
  createdAt: string;
  expiresAt?: string;
};

export type OfficialNotice = {
  id: string;
  title: string;
  body: string;
  status: NoticeStatus;
  publishedAt?: string;
  expiresAt?: string;
  authorId?: string;
};

export type Guide = {
  id: string;
  icon: string;
  title: string;
  summary: string;
  when: string;
  steps: string[];
  warning: string;
  reviewedAt?: string;
  sourceUrl?: string;
};

export type AuditEvent = {
  id: string;
  action: 'report_verified' | 'report_rejected' | 'incident_status_changed' | 'notice_published' | 'notice_withdrawn';
  targetType: 'incident' | 'notice' | 'help_offer';
  targetId: string;
  actorId: string;
  createdAt: string;
};
