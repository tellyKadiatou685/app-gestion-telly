// src/types/accountLines.types.ts

export type LineType = 'debut' | 'sortie';

export type AccountKey =
  | 'LIQUIDE' | 'ORANGE_MONEY' | 'WAVE' | 'UV_MASTER'
  | 'FREE_MONEY' | 'WESTERN_UNION' | 'RIA' | 'MONEYGRAM' | 'AUTRES'
  | `part-${string}`;

export type AuditType = 'AUDIT_SUPPRESSION' | 'AUDIT_MODIFICATION';

// ─── REQUÊTES ─────────────────────────────────────────────────────────────────

export interface DeleteAccountLineRequest {
  accountKey: AccountKey | string;
  targetDate?: string; // YYYY-MM-DD — si absent = aujourd'hui
}

export interface ResetAccountLineRequest {
  accountKey: AccountKey | string;
  newValue?: number;
}

export interface UpdateAccountLineRequest {
  accountKey: AccountKey | string;
  newValue: number;
  targetDate?: string; // YYYY-MM-DD — si absent = aujourd'hui
  reason?: string;
}

// ─── RÉPONSES ─────────────────────────────────────────────────────────────────

export interface AccountLineResult {
  accountId?: string;
  accountKey: string;
  lineType: LineType;
  oldValue: number;
  newValue: number;
  targetDate?: string;
  source?: 'snapshot' | 'archived_transactions' | 'live';
  partnerName?: string;
  partnerId?: string | null;
  transactionType?: string;
  transactionsDeleted?: number;
}

export interface AccountLineResponse {
  success: boolean;
  message: string;
  data: AccountLineResult & {
    supervisor: string;
    deletedAt?: string;
    updatedAt?: string;
    resetAt?: string;
    auditCreated: boolean;
  };
}

// ─── AUDIT ────────────────────────────────────────────────────────────────────

export interface AuditMetadata {
  action:
    | 'DELETE_ACCOUNT_LINE' | 'DELETE_PARTNER_TRANSACTIONS'
    | 'DELETE_PAST_ACCOUNT_LINE' | 'DELETE_PAST_PARTNER_TRANSACTIONS'
    | 'RESET_ACCOUNT_LINE'
    | 'UPDATE_ACCOUNT_LINE' | 'UPDATE_PAST_ACCOUNT_LINE' | 'UPDATE_PAST_PARTNER_LINE';
  lineType: LineType;
  accountKey: string;
  oldValue: number;
  newValue: number;
  targetDate?: string;
  deletedBy?: string;
  updatedBy?: string;
  resetBy?: string;
  resetByRole?: string;
  deletedAt?: string;
  updatedAt?: string;
  resetAt?: string;
  reason?: string;
  partnerName?: string;
  partnerId?: string | null;
  transactionCount?: number;
  totalValue?: number;
}

export interface AuditRecord {
  id: string;
  type: AuditType;
  description: string;
  createdAt: string;
  executedBy: string;
  superviseur: string;
  partenaire?: string | null;
  montant: number;
  metadata: AuditMetadata | null;
}

export interface AuditHistoryResponse {
  success: boolean;
  message: string;
  data: {
    history: AuditRecord[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      limit: number;
    };
  };
}

export interface AuditHistoryParams {
  page?: number;
  limit?: number;
  supervisorId?: string;
}