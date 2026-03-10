// src/services/TransactionService.ts
import transactionRoutes from "@/Routes/TransactionRoutes";
import type {
  Period,
  AdminDashboard,
  SupervisorDashboard,
  PartnerDashboard,
  CreateAdminTransactionPayload,
  CreateAdminTransactionResponse,
  UpdateTransactionPayload,
  UpdateSupervisorAccountPayload,
  AvailableDate,
  ActivePartner,
  AccountTypeInfo,
  AuditHistoryParams,
  AuditRecord,
  ArchivedTransaction,
  ArchivedTransactionsParams,
  FrequentFreePartnersParams,
  FrequentFreePartner,
  ConvertFreePartnerPayload,
  ConvertFreePartnerResponse,
} from "@/types/transaction.types";

const TransactionService = {
  // ─── DASHBOARDS ─────────────────────────────────────────────────────────────

  async getAdminDashboard(
    period: Period = "today",
    date?: string
  ): Promise<AdminDashboard> {
    const { data } = await transactionRoutes.getAdminDashboard({
      period,
      ...(period === "custom" && date ? { date } : {}),
    });
    return data.data!.dashboard as AdminDashboard;
  },

  async getSupervisorDashboard(
    supervisorId?: string,
    period: Period = "today",
    date?: string
  ): Promise<SupervisorDashboard> {
    const { data } = await transactionRoutes.getSupervisorDashboard(
      supervisorId,
      { period, ...(period === "custom" && date ? { date } : {}) }
    );
    return data.data!.dashboard as SupervisorDashboard;
  },

  async getPartnerDashboard(
    period: Period = "today",
    date?: string
  ): Promise<PartnerDashboard> {
    const { data } = await transactionRoutes.getPartnerDashboard({
      period,
      ...(period === "custom" && date ? { date } : {}),
    });
    return data.data!.dashboard as PartnerDashboard;
  },

  /** Dashboard auto selon rôle connecté */
  async getDashboard(
    period: Period = "today",
    date?: string
  ): Promise<AdminDashboard | SupervisorDashboard | PartnerDashboard> {
    const { data } = await transactionRoutes.getDashboard({
      period,
      ...(period === "custom" && date ? { date } : {}),
    });
    return data.data!.dashboard;
  },

  // ─── DATES ──────────────────────────────────────────────────────────────────

  async getAvailableDates(): Promise<AvailableDate[]> {
    const { data } = await transactionRoutes.getAvailableDates();
    return data.data!.availableDates;
  },

  // ─── TRANSACTIONS ────────────────────────────────────────────────────────────

  async createAdminTransaction(
    payload: CreateAdminTransactionPayload
  ): Promise<CreateAdminTransactionResponse> {
    const { data } = await transactionRoutes.createAdminTransaction(payload);
    return data.data!;
  },

  async createTransaction(
    payload: CreateAdminTransactionPayload
  ): Promise<CreateAdminTransactionResponse> {
    const { data } = await transactionRoutes.createTransaction(payload);
    return data.data!;
  },

  async updateTransaction(
    transactionId: string,
    payload: UpdateTransactionPayload
  ): Promise<void> {
    await transactionRoutes.updateTransaction(transactionId, payload);
  },

  async updateSupervisorAccount(
    supervisorId: string,
    payload: UpdateSupervisorAccountPayload
  ): Promise<void> {
    await transactionRoutes.updateSupervisorAccount(supervisorId, payload);
  },

  // ─── UTILITAIRES ────────────────────────────────────────────────────────────

  async getActivePartners(): Promise<ActivePartner[]> {
    const { data } = await transactionRoutes.getActivePartners();
    return data.data!.partners;
  },

  async getAccountTypes(): Promise<AccountTypeInfo[]> {
    const { data } = await transactionRoutes.getAccountTypes();
    return data.data!.accountTypes;
  },

  async getAvailableSupervisors() {
    const { data } = await transactionRoutes.getAvailableSupervisors();
    return data.data;
  },

  // ─── PARTENAIRES LIBRES FRÉQUENTS — NOUVEAU ──────────────────────────────────

  /**
   * Récupère les partenaires libres qui reviennent fréquemment.
   * Utilisé pour la bannière de suggestion de conversion sur le dashboard admin.
   */
  async getFrequentFreePartners(
    params?: FrequentFreePartnersParams
  ): Promise<FrequentFreePartner[]> {
    const { data } = await transactionRoutes.getFrequentFreePartners(params);
    return data.data!.partners;
  },

  /**
   * Convertit un partenaire libre en vrai compte PARTENAIRE.
   * ⚠️ Le codeAcces retourné est affiché UNE seule fois — l'admin doit le noter.
   */
  async convertFreePartner(
    payload: ConvertFreePartnerPayload
  ): Promise<ConvertFreePartnerResponse> {
    const { data } = await transactionRoutes.convertFreePartner(payload);
    return data.data!;
  },

  // ─── AUDIT ───────────────────────────────────────────────────────────────────

  async getAuditHistory(params?: AuditHistoryParams): Promise<{
    auditHistory: AuditRecord[];
    pagination: { currentPage: number; totalPages: number; totalCount: number; limit: number };
  }> {
    const { data } = await transactionRoutes.getAuditHistory(params);
    return data.data!;
  },

  async getArchivedTransactions(
    params?: ArchivedTransactionsParams
  ): Promise<ArchivedTransaction[]> {
    const { data } = await transactionRoutes.getArchivedTransactions(params);
    return data.data!.archivedTransactions;
  },

  // ─── HELPERS ─────────────────────────────────────────────────────────────────

  /** Formate un montant en FCFA */
  formatAmount(amount: number, withSign = false): string {
    const formatted = Math.abs(amount).toLocaleString("fr-FR") + "\u202FF";
    if (!withSign) return formatted;
    return amount >= 0 ? `+${formatted}` : `-${formatted}`;
  },

  /** Label lisible d'une période */
  getPeriodLabel(period: Period, customDate?: string): string {
    if (period === "custom" && customDate) {
      return new Date(customDate).toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    const labels: Record<Period, string> = {
      today: "Aujourd'hui",
      yesterday: "Hier",
      week: "Cette semaine",
      month: "Ce mois",
      year: "Cette année",
      all: "Tout",
      custom: "Personnalisé",
    };
    return labels[period];
  },

  /** Couleur d'une transaction */
  getTransactionColor(type: string): "positive" | "negative" | "neutral" {
    if (["DEPOT", "TRANSFERT_RECU", "ALLOCATION_UV_MASTER", "DEBUT_JOURNEE"].includes(type))
      return "positive";
    if (["RETRAIT", "TRANSFERT_ENVOYE", "FIN_JOURNEE"].includes(type))
      return "negative";
    return "neutral";
  },
};

export default TransactionService;