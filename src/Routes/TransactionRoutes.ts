// src/Routes/TransactionRoutes.ts
import api from "@/config";
import type {
  GetDashboardParams,
  DashboardResponse,
  CreateAdminTransactionPayload,
  CreateAdminTransactionResponse,
  UpdateTransactionPayload,
  UpdateSupervisorAccountPayload,
  AvailableDatesResponse,
  ActivePartnersResponse,
  AuditHistoryParams,
  AuditHistoryResponse,
  ArchivedTransactionsParams,
  ArchivedTransaction,
  AccountTypeInfo,
  ResetStatus,
  FrequentFreePartnersParams,
  FrequentFreePartnersResponse,
  ConvertFreePartnerPayload,
  ConvertFreePartnerResponse,
} from "@/types/transaction.types";


const transactionRoutes = {
  // ─── DASHBOARDS ─────────────────────────────────────────────────────────────

  /** Dashboard adapté au rôle connecté */
  getDashboard: (params?: GetDashboardParams) =>
    api.get<ActivePartnersResponse<DashboardResponse>>("/transactions/dashboard", {
      params,
    }),

  /** Dashboard admin (tous les superviseurs) */
  getAdminDashboard: (params?: GetDashboardParams) =>
    api.get<ApiResponse<DashboardResponse>>("/transactions/dashboard/admin", {
      params,
    }),

  /** Dashboard superviseur spécifique */
  getSupervisorDashboard: (supervisorId?: string, params?: GetDashboardParams) =>
    api.get<ApiResponse<DashboardResponse>>(
      `/transactions/dashboard/supervisor${supervisorId ? `/${supervisorId}` : ""}`,
      { params }
    ),

  /** Dashboard partenaire */
  getPartnerDashboard: (params?: GetDashboardParams) =>
    api.get<ApiResponse<DashboardResponse>>("/transactions/dashboard/partner", {
      params,
    }),

  // ─── DATES ──────────────────────────────────────────────────────────────────

  /** Dates disponibles pour le filtre custom */
  getAvailableDates: () =>
    api.get<ApiResponse<AvailableDatesResponse>>(
      "/transactions/dashboard/dates/available"
    ),

  /** Test filtrage date (admin seulement) */
  testDateFilter: (date: string) =>
    api.post("/transactions/dashboard/test-date-filter", { date }),

  // ─── CRÉATIONS ──────────────────────────────────────────────────────────────

  /** Transaction universelle (role-based) */
  createTransaction: (payload: CreateAdminTransactionPayload) =>
    api.post<ApiResponse<CreateAdminTransactionResponse>>(
      "/transactions/create",
      payload
    ),

  /** Transaction admin directe */
  createAdminTransaction: (payload: CreateAdminTransactionPayload) =>
    api.post<ApiResponse<CreateAdminTransactionResponse>>(
      "/transactions/admin/create",
      payload
    ),

  // ─── MISE À JOUR ────────────────────────────────────────────────────────────

  /** Modifier une transaction */
  updateTransaction: (transactionId: string, payload: UpdateTransactionPayload) =>
    api.patch<ApiResponse>(`/transactions/${transactionId}`, payload),

  /** Modifier un compte superviseur (admin) */
  updateSupervisorAccount: (
    supervisorId: string,
    payload: UpdateSupervisorAccountPayload
  ) =>
    api.patch<ApiResponse>(
      `/transactions/supervisors/${supervisorId}/accounts/update`,
      payload
    ),

  // ─── DÉTAILS ────────────────────────────────────────────────────────────────

  /** Détails d'une transaction */
  getTransactionDetails: (transactionId: string) =>
    api.get<ApiResponse>(`/transactions/${transactionId}`),

  // ─── UTILITAIRES ────────────────────────────────────────────────────────────

  /** Superviseurs actifs — pour le formulaire transaction (admin + partenaire) */
  getAvailableSupervisors: () =>
    api.get<ApiResponse>("/transactions/supervisors/available"),

  /** Partenaires actifs (pour superviseurs/admin) */
  getActivePartners: () =>
    api.get<ApiResponse<ActivePartnersResponse>>("/transactions/partners/active"),

  /** Types de comptes disponibles */
  getAccountTypes: () =>
    api.get<ApiResponse<{ accountTypes: AccountTypeInfo[] }>>(
      "/transactions/account-types"
    ),

  // ─── PARTENAIRES LIBRES FRÉQUENTS — NOUVEAU ──────────────────────────────────

  /** Partenaires libres fréquents (admin seulement) */
  getFrequentFreePartners: (params?: FrequentFreePartnersParams) =>
    api.get<ApiResponse<FrequentFreePartnersResponse>>(
      "/transactions/partners/frequent-free",
      { params }
    ),

  /** Convertir un partenaire libre en vrai compte (admin seulement) */
  convertFreePartner: (payload: ConvertFreePartnerPayload) =>
    api.post<ApiResponse<ConvertFreePartnerResponse>>(
      "/transactions/partners/convert-free",
      payload
    ),

  // ─── AUDIT (admin) ───────────────────────────────────────────────────────────

  /** Historique des modifications */
  getAuditHistory: (params?: AuditHistoryParams) =>
    api.get<ApiResponse<AuditHistoryResponse>>(
      "/transactions/audit/history",
      { params }
    ),

  /** Transactions archivées */
  getArchivedTransactions: (params?: ArchivedTransactionsParams) =>
    api.get<ApiResponse<{ archivedTransactions: ArchivedTransaction[]; pagination: Pagination }>>(
      "/transactions/admin/transactions/archived",
      { params }
    ),

  /** Statut du reset quotidien */
  getResetStatus: () =>
    api.get<ApiResponse<ResetStatus>>("/transactions/admin/daily-transfer/status"),
};

export default transactionRoutes;