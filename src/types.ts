export type PlanTier = 'free' | 'foundation' | 'pro' | 'scholar';
export type BillingCycle = 'monthly' | 'quarterly' | 'annual';
export type CurrencyCode = 'INR' | 'USD';

export interface PricingPlan {
  id: string;
  name: string;
  kicker: string;
  tierKey: 'foundation' | 'pro' | 'scholar';
  monthlyInr: number;
  quarterlyInr: number;
  annualInr: number;
  monthlyUsd: number;
  quarterlyUsd: number;
  annualUsd: number;
  description: string;
  features: string[];
  highlighted: boolean;
  order: number;
}

export interface CourseTrack {
  id: string;
  title: string;
  category: string;
  kicker: string;
  monthlyInr: number;
  fullCourseInr: number;
  monthlyUsd: number;
  fullCourseUsd: number;
  durationLabel: string;
  scheduleLabel: string;
  requiredTier: PlanTier;
  highlights: string[];
  order: number;
}

export interface LiveClassItem {
  id: string;
  title: string;
  subject: string;
  instructor: string;
  batchTime: string;
  durationMinutes: number;
  status: 'live' | 'upcoming' | 'ended';
  streamUrl?: string;
  requiredTier: PlanTier;
  seatsRemaining: number;
  topicNotes: string;
}

export interface RecordedVideoItem {
  id: string;
  title: string;
  subject: string;
  instructor: string;
  duration: string;
  videoUrl: string;
  isLocalUpload: boolean;
  requiredTier: PlanTier;
  description: string;
  createdAt?: string;
}

export interface StudyPdfItem {
  id: string;
  title: string;
  subject: string;
  chapter: string;
  fileUrl: string;
  fileName: string;
  fileSizeLabel: string;
  requiredTier: PlanTier;
  createdAt?: string;
}

export interface StudentProfile {
  loginId: string;
  fullName: string;
  email: string;
  phone: string;
  targetExam: string;
  plan: PlanTier;
  status: 'pending' | 'active' | 'suspended';
  createdAt: string;
  lastLoginAt?: string;
  otpVerified?: boolean;
  privacyMode?: boolean;
}

export interface LiveDoubtItem {
  id: string;
  classId: string;
  authorName: string;
  authorBadge: string;
  question: string;
  reply?: string;
  createdAt: string;
}

const TIER_RANK: Record<PlanTier, number> = {
  free: 0,
  foundation: 1,
  pro: 2,
  scholar: 3
};

export function hasTierAccess(userTier: PlanTier | undefined, requiredTier: PlanTier, isActiveStudent: boolean, isOwner: boolean): boolean {
  if (isOwner) return true;
  if (requiredTier === 'free') return true;
  if (!isActiveStudent || !userTier) return false;
  return TIER_RANK[userTier] >= TIER_RANK[requiredTier];
}

export function formatTierLabel(tier: PlanTier): string {
  switch (tier) {
    case 'free':
      return 'Free Demo';
    case 'foundation':
      return 'Foundation';
    case 'pro':
      return 'Cohort Pro';
    case 'scholar':
      return 'Scholar 1:1';
  }
}
