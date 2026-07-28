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

// ─── TRANSFERTS INTERNATIONAUX ───────────────────────────────────────────────
// ── MODIFIÉ : ajout de WESTERN_2 et RIA_2 (mêmes règles que WESTERN_UNION/RIA) ──

const INTERNATIONAL_TYPES = [
  "WESTERN_UNION",
  "RIA",
  "MONEYGRAM",
  "WESTERN_2",
  "RIA_2",
] as const;
type InternationalType = (typeof INTERNATIONAL_TYPES)[number];

export interface InternationalProviderStats {
  debut: number;
  sortie: number;
  net: number;
  formatted: {
    debut: string;
    sortie: string;
    net: string;
  };
}

export interface InternationalTotals {
  byProvider: Record<InternationalType, InternationalProviderStats>;
  global: InternationalProviderStats;
}

// ─── SERVICE ─────────────────────────────────────────────────────────────────

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

  /**
   * Télécharge le dashboard admin complet en Excel (généré côté backend).
   * Récupère toutes les données fraîches du serveur — contrairement à un export
   * client, ce n'est pas limité à ce qui est déjà chargé en state React.
   */
  async exportAdminDashboardExcel(period: Period = "today", date?: string): Promise<void> {
    const { data } = await transactionRoutes.exportAdminDashboard({
      period,
      ...(period === "custom" && date ? { date } : {}),
    });

    const blob = new Blob([data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dashboard_${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  // ─── PARTENAIRES LIBRES FRÉQUENTS ────────────────────────────────────────────

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
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      limit: number;
    };
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

  // ─── TRANSFERTS INTERNATIONAUX ───────────────────────────────────────────────

  /**
   * Agrège les totaux Western Union / RIA / MoneyGram / Western 2 / Ria 2
   * depuis les supervisorCards du dashboard admin. Aucun appel backend
   * supplémentaire nécessaire.
   *
   * @example
   * const dashboard = await TransactionService.getAdminDashboard(period, date);
   * const intl = TransactionService.getInternationalTotals(dashboard);
   *
   * intl.byProvider.WESTERN_UNION  // { debut, sortie, net, formatted }
   * intl.byProvider.RIA
   * intl.byProvider.MONEYGRAM
   * intl.byProvider.WESTERN_2
   * intl.byProvider.RIA_2
   * intl.global                    // cumul des 5 opérateurs
   */
  getInternationalTotals(dashboard: AdminDashboard): InternationalTotals {
    // Initialisation à zéro pour chaque opérateur
    const byProvider = Object.fromEntries(
      INTERNATIONAL_TYPES.map((type) => [
        type,
        { debut: 0, sortie: 0, net: 0 },
      ])
    ) as Record<InternationalType, { debut: number; sortie: number; net: number }>;

    // Agrégation sur toutes les cartes superviseur
    for (const card of dashboard.supervisorCards) {
      for (const type of INTERNATIONAL_TYPES) {
        const debut = card.comptes.debut[type] ?? 0;
        const sortie = card.comptes.sortie[type] ?? 0;
        byProvider[type].debut += debut;
        byProvider[type].sortie += sortie;
        byProvider[type].net += debut - sortie;
      }
    }

    // Total global de tous les opérateurs
    const globalRaw = INTERNATIONAL_TYPES.reduce(
      (acc, type) => ({
        debut: acc.debut + byProvider[type].debut,
        sortie: acc.sortie + byProvider[type].sortie,
        net: acc.net + byProvider[type].net,
      }),
      { debut: 0, sortie: 0, net: 0 }
    );

    // Ajout des montants formatés
    const withFormatted = (
      raw: { debut: number; sortie: number; net: number }
    ): InternationalProviderStats => ({
      ...raw,
      formatted: {
        debut: TransactionService.formatAmount(raw.debut),
        sortie: TransactionService.formatAmount(raw.sortie),
        net: TransactionService.formatAmount(raw.net, true),
      },
    });

    return {
      byProvider: Object.fromEntries(
        INTERNATIONAL_TYPES.map((type) => [type, withFormatted(byProvider[type])])
      ) as Record<InternationalType, InternationalProviderStats>,
      global: withFormatted(globalRaw),
    };
  },

  /**
   * Retourne uniquement le total net (debut - sortie) d'un opérateur donné.
   * Raccourci pratique si tu n'as besoin que d'un seul chiffre.
   *
   * @example
   * const net = TransactionService.getProviderNet(dashboard, "WESTERN_UNION");
   * // 330 000
   */
  getProviderNet(
    dashboard: AdminDashboard,
    provider: InternationalType
  ): number {
    return dashboard.supervisorCards.reduce((acc, card) => {
      const debut = card.comptes.debut[provider] ?? 0;
      const sortie = card.comptes.sortie[provider] ?? 0;
      return acc + (debut - sortie);
    }, 0);
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
    if (
      ["DEPOT", "TRANSFERT_RECU", "ALLOCATION_UV_MASTER", "DEBUT_JOURNEE"].includes(type)
    )
      return "positive";
    if (["RETRAIT", "TRANSFERT_ENVOYE", "FIN_JOURNEE"].includes(type))
      return "negative";
    return "neutral";
  },

  /** Label lisible d'un opérateur international */
  getInternationalLabel(type: InternationalType): string {
    const labels: Record<InternationalType, string> = {
      WESTERN_UNION: "Western Union",
      RIA: "Ria",
      MONEYGRAM: "MoneyGram",
      WESTERN_2: "Western Union 2",
      RIA_2: "Ria 2",
    };
    return labels[type];
  },
};

export default TransactionService;
export type { InternationalType };