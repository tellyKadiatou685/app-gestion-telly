import api from "@/config";

// ─── TYPES ───────────────────────────────────────────────────────

export type BalanceEtat = "BOUTIQUE_DOIT" | "PARTENAIRE_DOIT" | "SOLDE";

export interface PartnerBalanceSolde {
  montant:       number;
  montantAbsolu: number;
  etat:          BalanceEtat;
  label:         string;
}

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

export interface PartnerBalanceTx {
  id:        string;
  type:      "DEPOT" | "RETRAIT";
  montant:   number;
  createdAt: string;
  archived:  boolean;
  // Ancien format (solde simple)
  superviseur: string | null;
}

// Transaction enrichie (historique)
export interface TransactionDetail {
  id:        string;
  type:      "DEPOT" | "RETRAIT";
  montant:   number;
  createdAt: string;
  archived:  boolean;
  note:      string | null;
  reference: string | null;
  superviseur: {
    id:         string;
    nomComplet: string;
    role:       string;
    status:     "ACTIVE" | "SUSPENDED" | "DELETED";
  } | null;
}

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
  solde:          PartnerBalanceSolde;
  statistiques:   PartnerBalanceStatsEnriched;
  transactions:   TransactionDetail[];
}

export interface PartnerBalanceSummary {
  id: string; nomComplet: string; telephone: string; status: string;
  solde: PartnerBalanceSolde;
  statistiques: PartnerBalanceStats;
}

// ─── ROUTES ──────────────────────────────────────────────────────

const partnerBalanceRoutes = {
  // GET /partner-balance
  getAllPartnersBalances: () =>
    api.get<ApiResponse<{ partners: PartnerBalanceSummary[] }>>("/partner-balance"),

  // GET /partner-balance/:id
  getPartnerBalance: (partenaireId: string) =>
    api.get<ApiResponse<PartnerBalance>>(`/partner-balance/${partenaireId}`),

  // GET /partner-balance/:id/history  ← NOUVEAU
  getPartnerHistory: (partenaireId: string) =>
    api.get<ApiResponse<PartnerHistoryData>>(`/partner-balance/${partenaireId}/history`),
};

export default partnerBalanceRoutes;