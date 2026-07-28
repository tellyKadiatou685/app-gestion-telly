// src/Routes/CumulRoutes.ts
import api from "@/config";

// ════════════════════════════════════════════════════════════════════════════
// TYPES — F1 / F2
// ════════════════════════════════════════════════════════════════════════════

export type F1F2Preset = "2j" | "3j" | "1m" | "1an";

export interface F1F2OperateurData {
  f1: number;
  f2: number;
  diff: number;
}

export interface F1F2JourEntry {
  date: string;
  dateDisplay: string;
  ops: Record<string, F1F2OperateurData>;
  total: F1F2OperateurData;
  cumulativeDiff: number;
}

export interface CumulF1F2Response {
  success: boolean;
  mode: "date_unique" | "plage";
  date?: string;
  dateDisplay?: string;
  plage?: {
    debut: string;
    fin: string;
    nombreJours: number;
    joursAvecDonnees: number;
  };
  totauxParOperateur: Record<string, F1F2OperateurData>;
  totalGlobal: F1F2OperateurData & { cumulativeTotal: number };
  parJour?: F1F2JourEntry[];
  parSuperviseur?: Array<{
    id: string;
    nom: string;
    ops: Record<string, F1F2OperateurData>;
    cumulativeDiff: number;
    hasData?: boolean;
  }>;
  isLiveData?: boolean;
}

// ════════════════════════════════════════════════════════════════════════════
// TYPES — INTERNATIONAUX
// ════════════════════════════════════════════════════════════════════════════

export type IntlPreset = "1m" | "3m" | "6m" | "1an";
export type IntlOperateurType = "WESTERN_UNION" | "RIA" | "MONEYGRAM";

export interface IntlOperateurData {
  f1: number;
  f2: number;
  diff: number;
}

export interface IntlJourEntry {
  date: string;
  dateDisplay: string;
  ops: Record<IntlOperateurType, IntlOperateurData>;
  total: IntlOperateurData;
  cumulativeDiff: number;
}

export interface CumulIntlResponse {
  success: boolean;
  mode: "date_unique" | "plage";
  date?: string;
  dateDisplay?: string;
  plage?: {
    debut: string;
    fin: string;
    nombreJours: number;
    joursAvecDonnees: number;
  };
  totauxParOperateur: Record<IntlOperateurType, IntlOperateurData>;
  totalGlobal: IntlOperateurData & { cumulativeTotal: number };
  parJour?: IntlJourEntry[];
  parSuperviseur?: Array<{
    id: string;
    nom: string;
    ops: Record<IntlOperateurType, IntlOperateurData>;
    cumulativeDiff: number;
    hasData?: boolean;
  }>;
  isLiveData?: boolean;
}

// ════════════════════════════════════════════════════════════════════════════
// TYPES — OPÉRATIONS CUMUL TOTAL (DÉPÔT / RETRAIT / HISTORIQUE)
// ════════════════════════════════════════════════════════════════════════════

export type CumulOperationType = "DEPOT" | "RETRAIT";

// ─── Payload dépôt ──────────────────────────────────────────────────────────

export interface CreateCumulDepotPayload {
  montant: number;
  commentaire?: string | null;
}

// ─── Payload retrait ────────────────────────────────────────────────────────

export interface CreateCumulRetraitPayload {
  montant: number;
  commentaire?: string | null;
}

// ─── Réponse création (dépôt ou retrait) ────────────────────────────────────

export interface CreateCumulOperationResponse {
  success: boolean;
  id: string;
  type: CumulOperationType;
  montant: number;
  description: string;
  commentaire: string | null;
  createdAt: string;
  admin: string;
  message: string;
}

// ─── Transaction dans l'historique ──────────────────────────────────────────

export interface CumulOperationHistoryItem {
  id: string;
  type: CumulOperationType;
  montant: number;
  createdAt: string;
  description: string;
  commentaire: string | null;
  auteur: {
    id: string;
    nomComplet: string;
  } | null;
}

// ─── Réponse historique ──────────────────────────────────────────────────────

export interface CumulOperationsHistoryResponse {
  success: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  statistiques: {
    totalDepots: number;
    totalRetraits: number;
    soldeNet: number;
    nombreOperations: number;
    plusGrosDepot: number;
    plusGrosRetrait: number;
  };
  filtresAppliques: {
    type: CumulOperationType | null;
    dateDebut: string | null;
    dateFin: string | null;
  };
  transactions: CumulOperationHistoryItem[];
}

// ─── Réponse modification montant ────────────────────────────────────────────

export interface UpdateCumulMontantResponse {
  success: boolean;
  transactionId: string;
  ancienMontant: number;
  nouveauMontant: number;
  message: string;
}

// ─── Réponse suppression ─────────────────────────────────────────────────────

export interface DeleteCumulOperationResponse {
  success: boolean;
  transactionId: string;
  ancienMontant: number;
  type: CumulOperationType;
  message: string;
}

// ─── Params historique ───────────────────────────────────────────────────────

export interface CumulHistoryParams {
  type?: CumulOperationType;
  dateDebut?: string;
  dateFin?: string;
  page?: number;
  limit?: number;
}

// ════════════════════════════════════════════════════════════════════════════
// TYPES — PARTENAIRES (existants)
// ════════════════════════════════════════════════════════════════════════════

export interface CumulPartenairesResponse {
  success: boolean;
  [key: string]: unknown;
}

// ════════════════════════════════════════════════════════════════════════════
// ROUTES
// ════════════════════════════════════════════════════════════════════════════

const cumulRoutes = {

  // ─── F1 / F2 ───────────────────────────────────────────────────────────────

  getF1F2ByPreset: (preset: F1F2Preset) =>
    api.get<CumulF1F2Response>(`/cumul/f1f2/preset/${preset}`),

  getF1F2ByRange: (start: string, end?: string) =>
    api.get<CumulF1F2Response>("/cumul/f1f2", {
      params: end && end !== start ? { start, end } : { start },
    }),

  // ─── INTERNATIONAUX ────────────────────────────────────────────────────────

  getIntlByPreset: (preset: IntlPreset) =>
    api.get<CumulIntlResponse>(`/cumul/international/preset/${preset}`),

  getIntlByRange: (start: string, end?: string) =>
    api.get<CumulIntlResponse>("/cumul/international", {
      params: end && end !== start ? { start, end } : { start },
    }),

  // ─── TOTAL GÉNÉRAL ─────────────────────────────────────────────────────────

  /**
   * Récupère le cumul total depuis le premier snapshot jusqu'à aujourd'hui
   * GET /cumul/total-general
   */
  getTotalGeneral: () =>
    api.get<CumulIntlResponse>("/cumul/total-general"),

  // ─── PARTENAIRES ───────────────────────────────────────────────────────────

  getCumulPartenaires: (start: string, end?: string, partenaireId?: string) =>
    api.get<CumulPartenairesResponse>("/cumul/partenaires", {
      params: { start, end, partenaireId },
    }),

  getCumulPartenairesByPreset: (preset: IntlPreset) =>
    api.get<CumulPartenairesResponse>(`/cumul/partenaires/preset/${preset}`),

  // ─── OPÉRATIONS CUMUL TOTAL — DÉPÔT ────────────────────────────────────────
  //
  // POST /cumul/operations/depot
  // Body : { montant: number, commentaire?: string }

  createDepot: (payload: CreateCumulDepotPayload) =>
    api.post<CreateCumulOperationResponse>("/cumul/operations/depot", payload),

  // ─── OPÉRATIONS CUMUL TOTAL — RETRAIT ──────────────────────────────────────
  //
  // POST /cumul/operations/retrait
  // Body : { montant: number, commentaire?: string }

  createRetrait: (payload: CreateCumulRetraitPayload) =>
    api.post<CreateCumulOperationResponse>("/cumul/operations/retrait", payload),

  // ─── OPÉRATIONS CUMUL TOTAL — HISTORIQUE ───────────────────────────────────
  //
  // GET /cumul/operations/history
  // Params : type?, dateDebut?, dateFin?, page?, limit?

  getOperationsHistory: (params: CumulHistoryParams = {}) =>
    api.get<CumulOperationsHistoryResponse>("/cumul/operations/history", {
      params,
    }),

  // ─── OPÉRATIONS CUMUL TOTAL — MODIFICATION MONTANT ─────────────────────────
  //
  // PATCH /cumul/operations/:id/montant
  // Body : { montant: number }

  updateOperationMontant: (id: string, montant: number) =>
    api.patch<UpdateCumulMontantResponse>(`/cumul/operations/${id}/montant`, {
      montant,
    }),

  // ─── OPÉRATIONS CUMUL TOTAL — SUPPRESSION LOGIQUE ──────────────────────────
  //
  // DELETE /cumul/operations/:id

  deleteOperation: (id: string) =>
    api.delete<DeleteCumulOperationResponse>(`/cumul/operations/${id}`),
};

export default cumulRoutes;