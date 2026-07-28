// src/Routes/PartnerBalanceRoutes.ts
import api from "@/config";

type ApiResponse<T> = { success: boolean; message: string; data: T };

export type BalanceEtat = "BOUTIQUE_DOIT" | "PARTENAIRE_DOIT" | "SOLDE";

// ─── SOLDE ────────────────────────────────────────────────────────────────────

export interface PartnerBalanceSolde {
  montant:       number;
  montantAbsolu: number;
  etat:          BalanceEtat;
  label:         string;
}

// ─── STATS ────────────────────────────────────────────────────────────────────

export interface PartnerBalanceStats {
  totalDepots:         number;
  totalRetraits:       number;
  nombreTransactions:  number;
  derniereTransaction: string | null;
}

export interface PartnerBalanceStatsEnriched extends PartnerBalanceStats {
  premiereTransaction: string | null;
  moyenneTransaction:  number;
  plusGrosDepot:       number;
  plusGrosRetrait:     number;
}

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────

export interface PartnerBalanceTx {
  id:          string;
  type:        "DEPOT" | "RETRAIT";
  montant:     number;
  createdAt:   string;
  archived:    boolean;
  description: string | null;
  superviseur: string | null;
}

export interface TransactionDetail {
  id:            string;
  type:          "DEPOT" | "RETRAIT";
  montant:       number;
  createdAt:     string;
  archived:      boolean;
  description:   string | null;
  commentaire:   string | null;    // ← commentaire optionnel extrait de la description
  note:          string | null;
  reference:     string | null;
  isAdminDirect: boolean;
  superviseur: {
    id:         string;
    nomComplet: string;
    role:       "ADMIN" | "SUPERVISEUR";
    status:     "ACTIVE" | "SUSPENDED" | "DELETED";
  } | null;
}

// ─── FILTRES HISTORIQUE ───────────────────────────────────────────────────────

export interface HistoryFilters {
  type?:      "DEPOT" | "RETRAIT" | null;
  dateDebut?: string | null;   // YYYY-MM-DD
  dateFin?:   string | null;   // YYYY-MM-DD
}

export interface FiltresAppliques {
  type:      string | null;
  dateDebut: string | null;
  dateFin:   string | null;
}

// ─── MODÈLES COMPLETS ─────────────────────────────────────────────────────────

export interface PartnerBalance {
  partenaire:   { id: string; nomComplet: string; telephone: string; status: string };
  solde:        PartnerBalanceSolde;
  statistiques: PartnerBalanceStats;
  transactions: PartnerBalanceTx[];
}

export interface PartnerHistoryData {
  partenaire: {
    id: string; nomComplet: string; telephone: string;
    status: string; createdAt: string;
  };
  solde:            PartnerBalanceSolde;
  statistiques:     PartnerBalanceStatsEnriched;
  filtresAppliques: FiltresAppliques;
  transactions:     TransactionDetail[];
}

export interface PartnerBalanceSummary {
  id:           string;
  nomComplet:   string;
  telephone:    string;
  status:       string;
  solde:        PartnerBalanceSolde;
  statistiques: PartnerBalanceStats;
}

// ─── PAYLOADS ─────────────────────────────────────────────────────────────────

export interface AdminDirectTransactionPayload {
  type:         "depot" | "retrait";
  montant:      number;
  commentaire?: string | null;   // ← optionnel
}

export interface UpdateMontantPayload {
  montant: number;
}

// ─── RÉSULTATS ────────────────────────────────────────────────────────────────

export interface AdminDirectTransactionResult {
  id:          string;
  type:        "DEPOT" | "RETRAIT";
  montant:     number;
  description: string;
  commentaire: string | null;
  createdAt:   string;
  partenaire:  string;
  admin:       string;
}

export interface DeleteTransactionResult {
  success:       boolean;
  transactionId: string;
  affectsCard:   boolean;
  superviseurId: string | null;
  message:       string;
}

export interface UpdateMontantResult {
  success:        boolean;
  transactionId:  string;
  ancienMontant:  number;
  nouveauMontant: number;
  affectsCard:    boolean;
  message:        string;
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────

const partnerBalanceRoutes = {

  // GET /partner-balance
  getAllPartnersBalances: () =>
    api.get<ApiResponse<{ partners: PartnerBalanceSummary[] }>>(
      "/partner-balance"
    ),

  // GET /partner-balance/:id
  getPartnerBalance: (partenaireId: string) =>
    api.get<ApiResponse<PartnerBalance>>(
      `/partner-balance/${partenaireId}`
    ),

  // GET /partner-balance/:id/history?type=&dateDebut=&dateFin=
  getPartnerHistory: (partenaireId: string, filters?: HistoryFilters) => {
    const params = new URLSearchParams();
    if (filters?.type)      params.set("type",      filters.type);
    if (filters?.dateDebut) params.set("dateDebut", filters.dateDebut);
    if (filters?.dateFin)   params.set("dateFin",   filters.dateFin);
    const qs = params.toString();
    return api.get<ApiResponse<PartnerHistoryData>>(
      `/partner-balance/${partenaireId}/history${qs ? `?${qs}` : ""}`
    );
  },

  // POST /partner-balance/:id/transaction  — admin direct, pas de superviseur impliqué
  createAdminDirectTransaction: (
    partenaireId: string,
    payload: AdminDirectTransactionPayload
  ) =>
    api.post<ApiResponse<AdminDirectTransactionResult>>(
      `/partner-balance/${partenaireId}/transaction`,
      payload
    ),

  // PATCH /partner-balance/transaction/:transactionId/montant
  updateTransactionMontant: (
    transactionId: string,
    payload: UpdateMontantPayload
  ) =>
    api.patch<ApiResponse<UpdateMontantResult>>(
      `/partner-balance/transaction/${transactionId}/montant`,
      payload
    ),

  // DELETE /partner-balance/transaction/:transactionId
  deleteTransaction: (transactionId: string) =>
    api.delete<ApiResponse<DeleteTransactionResult>>(
      `/partner-balance/transaction/${transactionId}`
    ),
};

export default partnerBalanceRoutes;