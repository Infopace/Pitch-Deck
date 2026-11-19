// Admin panel types. Field names are camelCase — the api client's response
// interceptor camelCases every JSON response before it reaches here.

export interface AdminOverview {
  totalUsers: number;
  newUsersToday: number;
  newUsersWeek: number;
  totalProjects: number;
  projectsByStatus: Record<string, number>;
  revenueInrToday: number;
  revenueInrWeek: number;
  revenueInrMonth: number;
  revenueInrAllTime: number;
  revenueByDay: Array<{ date: string; revenueInr: number }>;
  revenueByDeckType: Array<{ deckType: string; label: string; revenueInr: number; count: number }>;
}

export interface AdminEvent {
  id: string;
  type: "user_login" | "user_registered" | "deck_created" | "payment_received" | "admin_action" | string;
  userId?: string | null;
  userEmail?: string | null;
  summary: string;
  meta?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  role: "free" | "pro" | "enterprise" | "admin";
  isActive: boolean;
  isVerified: boolean;
  isBillingExempt: boolean;
  createdAt: string;
  deckCount: number;
  totalSpendInr: number;
}

export interface AdminUserListResponse {
  data: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminTransactionRow {
  paymentId: string;
  paidAt: string;
  userId: string;
  userEmail: string;
  userName: string;
  deckType: string;
  deckLabel: string;
  amountInr: number;
  razorpayPaymentId: string;
  projectId?: string | null;
  projectName?: string | null;
  projectStatus?: string | null;
  deckGenerated: boolean;
  latestDeckUrl?: string | null;
}

export interface AdminTransactionListResponse {
  data: AdminTransactionRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminProjectRow {
  id: string;
  name: string;
  deckType: string;
  status: string;
  userId: string;
  userEmail: string;
  latestJobStatus?: string | null;
  createdAt: string;
  isDeleted: boolean;
}

export interface AdminProjectListResponse {
  data: AdminProjectRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminSettings {
  maintenanceMode: boolean;
  signupsEnabled: boolean;
  deckTypeOverrides?: Record<string, boolean> | null;
}
