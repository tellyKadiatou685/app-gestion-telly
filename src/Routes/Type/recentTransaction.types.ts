// src/types/recentTransaction.types.ts

// ─── ENUMS ────────────────────────────────────────────────────────────────────

export type TransactionType =
  | 'DEPOT'
  | 'RETRAIT'
  | 'TRANSFERT_ENVOYE'
  | 'TRANSFERT_RECU'
  | 'ALLOCATION_UV_MASTER'
  | 'DEBUT_JOURNEE'
  | 'FIN_JOURNEE';

export type AccountType =
  | 'LIQUIDE'
  | 'ORANGE_MONEY'
  | 'WAVE'
  | 'UV_MASTER'
  | 'FREE_MONEY'
  | 'WESTERN_UNION'
  | 'RIA'
  | 'MONEYGRAM'
  | 'AUTRES';

export type UserRole = 'ADMIN' | 'SUPERVISEUR' | 'PARTENAIRE' | 'OPERATEUR';

export type SortOrder = 'asc' | 'desc';

export type Period = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'all';

// ─── TRANSACTION ──────────────────────────────────────────────────────────────

export interface TransactionIntervenant {
  id:        string;
  nom:       string;
  role:      UserRole;
  telephone?: string;
}

export interface TransactionType_Label {
  key:   TransactionType;
  label: string;
  color: 'success' | 'warning' | 'info' | 'primary' | 'secondary' | 'default';
}

export interface TransactionMontant {
  valeur:    number;
  formate:   string;    // "12 500"
  devise:    string;    // "F CFA"
  signe:     '+' | '-';
}

export interface RecentTransaction {
  id:          string;
  type:        TransactionType_Label;
  montant:     TransactionMontant;
  compte:      AccountType | string;
  superviseur: TransactionIntervenant | { nom: string };
  partenaire?: TransactionIntervenant | null;
  intervenant: TransactionIntervenant;
  dateHeure:   string;        // ISO string
  timeAgo:     string;        // "Il y a 5 min"
  statut:      string;        // "✅ Validée"
  description?: string | null;
  archived:    boolean;
  isValidated: boolean;
  metadata?:   string | null;
}

// ─── PAGINATION ───────────────────────────────────────────────────────────────

export interface PaginationInfo {
  currentPage:  number;
  totalPages:   number;
  totalCount:   number;
  limit:        number;
  hasNextPage:  boolean;
  hasPrevPage:  boolean;
  nextPage:     number | null;
  prevPage:     number | null;
}

// ─── STATS ────────────────────────────────────────────────────────────────────

export interface TransactionStats {
  total:         number;
  depots:        number;
  retraits:      number;
  transferts:    number;
  allocations:   number;
  montantTotal:  number;
  montantEntrees:number;
  montantSorties:number;
  // répartition par rôle
  parRole?: {
    ADMIN?:       number;
    SUPERVISEUR?: number;
    PARTENAIRE?:  number;
    OPERATEUR?:   number;
  };
}

// ─── FILTERS ─────────────────────────────────────────────────────────────────

export interface TransactionFilters {
  search?:         string;
  supervisorId?:   string;
  partnerId?:      string;
  operatorId?:     string;
  transactionType?:TransactionType | '';
  period?:         Period;
  accountType?:    AccountType | '';
  supervisorName?: string;
  partnerName?:    string;
  operatorName?:   string;
  userName?:       string;
  page?:           number;
  limit?:          number;
  sortBy?:         string;
  sortOrder?:      SortOrder;
}

export interface AppliedFilters extends TransactionFilters {
  activeFiltersCount: number;
}

// ─── API RESPONSES ───────────────────────────────────────────────────────────

export interface RecentTransactionsResponse {
  success:   boolean;
  message:   string;
  data: {
    transactions:   RecentTransaction[];
    pagination:     PaginationInfo;
    stats:          TransactionStats;
    appliedFilters: AppliedFilters;
  };
}

export interface PaginatedByFiveResponse {
  success: boolean;
  message: string;
  data: {
    transactions: RecentTransaction[];
    pagination:   PaginationInfo;
    stats:        TransactionStats;
    filters:      TransactionFilters;
  };
}

export interface TransactionStatsResponse {
  success: boolean;
  data: {
    stats:    TransactionStats;
    period:   Period;
    userRole: UserRole;
  };
}

// ─── USERS ────────────────────────────────────────────────────────────────────

export interface UserSummary {
  id:            string;
  nom:           string;
  telephone:     string;
  email?:        string;
  role:          UserRole;
  status:        string;
  dateCreation:  string;
  statistiques: {
    totalTransactions: number;
    nombreComptes:     number;
  };
}

export interface AllUsersResponse {
  success: boolean;
  data: {
    superviseurs: UserSummary[];
    partenaires:  UserSummary[];
    operateurs:   UserSummary[];
    totaux: {
      superviseurs: number;
      partenaires:  number;
      operateurs:   number;
      total:        number;
    };
  };
}

// ─── SEARCH ───────────────────────────────────────────────────────────────────

export interface SearchResult {
  id:        string;
  nom:       string;
  telephone: string;
  role:      UserRole;
}

export interface SearchResponse {
  success: boolean;
  data: {
    superviseurs: SearchResult[];
    partenaires:  SearchResult[];
    operateurs:   SearchResult[];
    total:        number;
  };
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export interface AppNotification {
  id:        string;
  title:     string;
  message:   string;
  type:      string;
  isRead:    boolean;
  createdAt: string;
  timeAgo:   string;
  icon:      string;
  priority:  'high' | 'medium' | 'low';
}

export interface NotificationsResponse {
  success: boolean;
  data: {
    notifications: AppNotification[];
    unreadCount:   number;
    hasUnread:     boolean;
  };
}

// ─── BALANCE ─────────────────────────────────────────────────────────────────

export interface BalanceCheckResponse {
  success: boolean;
  data: {
    exists:         boolean;
    sufficient?:    boolean;
    currentBalance: number;
    requested?:     number;
    difference?:    number;
  };
}