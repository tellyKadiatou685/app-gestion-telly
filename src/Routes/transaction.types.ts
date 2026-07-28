// src/types/transaction.types.ts

import type { User, UserRole } from "./user.types";

// ─── ENUMS ───────────────────────────────────────────────────────────────────

export type TransactionType =
  | "DEPOT"
  | "RETRAIT"
  | "TRANSFERT_ENVOYE"
  | "TRANSFERT_RECU"
  | "ALLOCATION_UV_MASTER"
  | "DEBUT_JOURNEE"
  | "FIN_JOURNEE"
  | "AUDIT_MODIFICATION"
  | "AUDIT_SUPPRESSION";

export type AccountType =
  | "LIQUIDE"
  | "ORANGE_MONEY"
  | "WAVE"
  | "UV_MASTER"
  | "FREE_MONEY"
  | "WESTERN_UNION"
  | "RIA"
  | "MONEYGRAM"
  | "SEDDO"          // ← ajout
  | "VERSEMENT_BANK"
  | "WESTERN_2"       // ← NOUVEAU
  | "RIA_2"           // ← NOUVEAU
  | "AUTRES";

export type OperationType = "depot" | "retrait";

export type Period = "today" | "yesterday" | "week" | "month" | "year" | "all" | "custom";

export type TransactionCategory = "PARTENAIRE" | "JOURNEE";

// ─── ENTITÉS DE BASE ─────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  type: TransactionType;
  montant: number;
  description?: string | null;
  createdAt: string;
  envoyeurId?: string | null;
  destinataireId?: string | null;
  partenaireId?: string | null;
  partenaireNom?: string | null;
  telephoneLibre?: string | null;
  archived?: boolean;
  archivedAt?: string | null;
  envoyeur?: Pick<User, "id" | "nomComplet" | "role"> | null;
  destinataire?: Pick<User, "id" | "nomComplet" | "role"> | null;
  partenaire?: Pick<User, "id" | "nomComplet"> | null;
}

export interface Account {
  id: string;
  type: AccountType;
  balance: number;
  initialBalance: number;
  previousInitialBalance?: number | null;
  userId: string;
}

export interface AccountTypeInfo {
  key: AccountType;
  label: string;
  icon: string;
  adminOnly?: boolean;
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

export interface AccountsByType {
  debut:    Partial<Record<AccountType | string, number>>;
  sortie:   Partial<Record<AccountType | string, number>>;
  /** F2 persisté en base — peuplé uniquement si finSecondaire > 0 */
  sortieF2?: Partial<Record<AccountType | string, number>>;
  /** Différence F2 − F1, retournée par le backend */
  diffF2F1?: Partial<Record<AccountType | string, number>>;
}

export interface SupervisorTotaux {
  debutTotal: number;
  sortieTotal: number;
  grTotal: number;
  formatted: {
    debutTotal: string;
    sortieTotal: string;
    grTotal: string;
  };
}

export interface SupervisorCard {
  id: string;
  nom: string;
  status: string;
  comptes: AccountsByType;
  totaux: SupervisorTotaux;
}

export interface GlobalTotals {
  featured: {
    type: string;
    label: string;
    solde: number;
    sorties: number;
    formatted: { solde: string; sorties: string };
  };
  uvMaster?: {
    solde: number;
    sorties: number;
    formatted: { solde: string; sorties: string };
  };
  debutTotalGlobal: number;
  sortieTotalGlobal: number;
  grTotalGlobal: number;
  formatted: {
    debutTotalGlobal: string;
    sortieTotalGlobal: string;
    grTotalGlobal: string;
  };
}

export interface DynamicConfig {
  resetConfig: ResetConfig;
  includeArchived: boolean;
  targetDateTime?: string | null;
  filterApplied: "archived_included" | "archived_excluded";
  dataSource: "current_live" | "historical_snapshot" | "historical_after_reset" | "empty";
  snapshotDate?: string | null;
  cronStatus: string;
  featuredType?: string;
  featuredLabel?: string;
}

export interface AdminDashboard {
  period: Period;
  customDate?: string | null;
  globalTotals: GlobalTotals;
  supervisorCards: SupervisorCard[];
  dynamicConfig: DynamicConfig;
}

export interface RecentTransaction {
  id: string;
  type: TransactionType;
  montant: number;
  description?: string | null;
  personne: string;
  createdAt: string;
  envoyeurId?: string | null;
  destinataireId?: string | null;
  partenaireId?: string | null;
  partenaireNom?: string | null;
  archived?: boolean;
}

export interface UvMasterInfo {
  personal: { debut: number; sortie: number; formatted: string };
  total: number;
  formatted: string;
}

export interface FeaturedInfo {
  type: string;
  label: string;
  personal: { debut: number; sortie: number; formatted: string };
  total: number;
  formatted: string;
}

export interface SupervisorDashboard {
  superviseur: { id: string; nom: string; status: string };
  period: Period;
  customDate?: string | null;
  /** Alias legacy — utiliser featured en priorité */
  uvMaster?: UvMasterInfo;
  /** Compte vedette dynamique (remplace uvMaster) */
  featured?: FeaturedInfo;
  comptes: AccountsByType;
  totaux: SupervisorTotaux;
  recentTransactions: RecentTransaction[];
  dynamicConfig: DynamicConfig & {
    totalTransactionsFound: number;
    partnerTransactionsFound?: number;
  };
}

export interface PartnerStatistiques {
  totalDepots: number;
  totalRetraits: number;
  soldeNet: number;
  nombreTransactions: number;
  formatted: {
    totalDepots: string;
    totalRetraits: string;
    soldeNet: string;
  };
}

export interface PartnerTransactionDetail {
  id: string;
  type: TransactionType;
  montant: number;
  description?: string | null;
  superviseur?: string | null;
  createdAt: string;
  formatted: { montant: string; type: string };
}

export interface PartnerDashboard {
  partenaire: { id: string; nom: string };
  period: Period;
  customDate?: string | null;
  statistiques: PartnerStatistiques;
  transactions: PartnerTransactionDetail[];
  superviseursDisponibles: Pick<User, "id" | "nomComplet" | "telephone">[];
}

// ─── PAYLOADS REQUÊTES ───────────────────────────────────────────────────────

export interface GetDashboardParams {
  period?: Period;
  date?: string;
}

export interface CreateAdminTransactionPayload {
  superviseurId: string;
  typeOperation: OperationType;
  montant: number;
  // Transactions journée
  typeCompte?: AccountType | string;
  // Transactions partenaire enregistré
  partenaireId?: string;
  // Transactions partenaire libre
  partenaireNom?: string;
  telephoneLibre?: string;
  /**
   * F2 (fin prévue / fin secondaire) — envoyé uniquement pour typeOperation=retrait.
   * Persisté en base via account.finSecondaire.
   * null = effacer F2 existant.
   */
  finSecondaire?: number | null;
}

export interface CreateAdminTransactionResponse {
  transaction: {
    id: string;
    type: TransactionType;
    montant: number;
    description: string;
    superviseurNom: string;
    typeCompte: AccountType | null;
    createdAt: string;
    isPartnerTransaction: boolean;
    partnerName: string | null;
    partnerId: string | null;
    partenaireNom: string | null;
    telephoneLibre: string | null;
    isRegisteredPartner: boolean;
    transactionCategory: TransactionCategory;
  };
  accountUpdated: boolean;
  soldeActuel?: number;
  soldeInitial?: number;
  /** F2 confirmé par le backend après persistance (null si non saisi) */
  finSecondaire?: number | null;
  /** Différence F2 − F1 retournée par le backend */
  diffF2F1?: number | null;
  summary?: {
    type: TransactionCategory;
    operation: OperationType;
    superviseur: string;
    partenaire: string | null;
    montant: number;
    typeCompte: AccountType | null;
    soldeApres: number | null;
    isRegisteredPartner: boolean;
  };
}

export interface UpdateTransactionPayload {
  montant?: number;
  description?: string;
}

export interface UpdateSupervisorAccountPayload {
  accountType: "debut" | "sortie";
  accountKey: AccountType | string;
  newValue: number;
}

// ─── PARTENAIRES LIBRES FRÉQUENTS ────────────────────────────────────────────

export interface FrequentFreePartner {
  partenaireNom: string;
  telephoneLibre: string | null;
  nombreTransactions: number;
  totalDepots: number;
  totalRetraits: number;
  derniereTransaction: string;
  superviseurIds: string[];
  peutConvertir: boolean;
}

export interface FrequentFreePartnersParams {
  superviseurId?: string;
  daysBack?: number;
  minTransactions?: number;
}

export interface FrequentFreePartnersResponse {
  partners: FrequentFreePartner[];
  config: { daysBack: number; minTransactions: number };
}

export interface ConvertFreePartnerPayload {
  partenaireNom: string;
  telephoneLibre: string;
}

export interface ConvertFreePartnerResponse {
  user: {
    id: string;
    nomComplet: string;
    telephone: string;
    role: string;
    status: string;
    createdAt: string;
  };
  codeAcces: string;
}

// ─── RÉPONSES API ─────────────────────────────────────────────────────────────

export interface DashboardResponse {
  userRole: UserRole;
  period: Period;
  customDate?: string | null;
  dashboard: AdminDashboard | SupervisorDashboard | PartnerDashboard;
}

export interface AvailableDate {
  value: string;
  display: string;
  displayLong: string;
  hasSnapshots: boolean;
}

export interface AvailableDatesResponse {
  availableDates: AvailableDate[];
  totalDates: number;
}

export interface ActivePartner {
  id: string;
  nomComplet: string;
  telephone: string;
}

export interface ActivePartnersResponse {
  partners: ActivePartner[];
}

export interface ActiveSupervisor {
  id: string;
  nomComplet: string;
  telephone: string;
}

// ─── RESET CONFIG ─────────────────────────────────────────────────────────────

export interface ResetConfig {
  hour: number;
  minute: number;
  windowMinutes: number;
}

export interface ResetStatus {
  resetExecutedToday: boolean;
  lastReset: string | null;
  nextScheduledReset: string;
  currentTime: string;
  resetConfig: ResetConfig;
  canExecuteNow: boolean;
  cronWorking: boolean;
}

// ─── AUDIT ────────────────────────────────────────────────────────────────────

export interface AuditRecord {
  id: string;
  type: TransactionType;
  description: string;
  createdAt: string;
  adminResponsable: string;
  superviseurConcerne: string;
  montant: number;
  metadata?: Record<string, unknown> | null;
}

export interface AuditHistoryParams {
  page?: number;
  limit?: number;
  type?: "all" | "modifications" | "suppressions";
}

export interface AuditHistoryResponse {
  auditHistory: AuditRecord[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
  };
}

// ─── ARCHIVED TRANSACTIONS ────────────────────────────────────────────────────

export interface ArchivedTransaction {
  id: string;
  type: TransactionType;
  montant: number;
  description?: string | null;
  createdAt: string;
  archivedAt: string;
  partenaire?: string | null;
  superviseur?: string | null;
  typeCompte?: AccountType | null;
}

export interface ArchivedTransactionsParams {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
}