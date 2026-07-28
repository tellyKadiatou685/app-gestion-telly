// src/services/CumulService.ts
import cumulRoutes from "@/Routes/CumulRoutes";

// ── Types ────────────────────────────────────────────────────────────────────

export type F1F2Preset = "2j" | "3j" | "1m" | "1an";
export type IntlPreset = "1m" | "3m" | "6m" | "1an";

/** mode indique si la réponse couvre une date unique ou une plage */
export type ResponseMode = "date_unique" | "plage";

export interface SuperviseurF1F2Jour {
  id:      string;
  nom:     string;
  f1:      number;
  f2:      number;
  diff:    number;
  cumulativeDiff?: number;  // 👈 NOUVEAU : cumul progressif du superviseur
  hasData: boolean;
}

export interface DayF1F2 {
  date:             string;
  dateDisplay:      string;
  f1:               number;
  f2:               number;
  diff:             number;
  cumulativeTotal?: number;  // 👈 NOUVEAU : cumul progressif à ce jour
  superviseurs:     SuperviseurF1F2Jour[];
}

export interface SuperviseurF1F2 {
  id:             string;
  nom:            string;
  cumulF1:        number;
  cumulF2:        number;
  cumulDiff:      number;
  cumulativeDiff?: number;  // 👈 NOUVEAU : cumul progressif du superviseur
  jours:          number;
}

/**
 * Réponse unifiée F1/F2.
 * - mode "date_unique" : parJour est vide, totaux contient f1/f2/diff (pas cumulF1…)
 * - mode "plage"       : comportement habituel avec cumul progressif
 */
export interface CumulF1F2Response {
  success: boolean;
  mode:    ResponseMode;

  // date unique
  date?:        string;
  dateDisplay?: string;

  // plage
  plage?: { debut: string; fin: string; nombreJours: number };

  totaux: {
    // plage
    cumulF1?:        number;
    cumulF2?:        number;
    cumulDiff?:      number;
    cumulativeTotal?: number;  // 👈 NOUVEAU : cumul total sur la période
    // date unique
    f1?:             number;
    f2?:             number;
    diff?:           number;
  };

  parJour:        DayF1F2[];
  parSuperviseur: SuperviseurF1F2[];
}

export interface IntlOp { 
  debut: number; 
  fin: number; 
  gr: number;
}

export interface IntlOpWithCumul extends IntlOp {
  cumulativeGR?: number;  // 👈 NOUVEAU : cumul progressif
}

export interface DayIntl {
  date:           string;
  dateDisplay:    string;
  ops:            Record<string, IntlOp>;
  total:          IntlOp;
  cumulativeGR?:  number;  // 👈 NOUVEAU : cumul GR à ce jour
}

export interface CumulIntlResponse {
  success: boolean;
  mode:    ResponseMode;

  date?:        string;
  dateDisplay?: string;
  plage?:       { debut: string; fin: string; nombreJours: number; joursAvecDonnees: number };

  totauxParOperateur: Record<string, IntlOp>;
  totalGlobal:        IntlOpWithCumul;  // 👈 MODIFIÉ : inclut cumulativeTotal
  parJour:            DayIntl[];
  parSuperviseur:     { 
    id: string; 
    nom: string; 
    ops: Record<string, IntlOp>;
    cumulativeGR?: number;  // 👈 NOUVEAU : cumul progressif par superviseur
    hasData?: boolean;
  }[];
}

// ── Helpers de normalisation ──────────────────────────────────────────────────

/** Ramène toujours vers {f1, f2, diff} peu importe le mode */
export function normalizeTotauxF1F2(r: CumulF1F2Response) {
  return {
    f1:   r.totaux.cumulF1   ?? r.totaux.f1   ?? 0,
    f2:   r.totaux.cumulF2   ?? r.totaux.f2   ?? 0,
    diff: r.totaux.cumulDiff ?? r.totaux.diff ?? 0,
  };
}

/** Récupère le cumul total (pour F1/F2) */
export function getCumulativeTotalF1F2(r: CumulF1F2Response): number {
  return r.totaux.cumulativeTotal ?? r.totaux.diff ?? 0;
}

/** Récupère le cumul total (pour International) */
export function getCumulativeTotalIntl(r: CumulIntlResponse): number {
  return r.totalGlobal?.cumulativeGR ?? r.totalGlobal?.gr ?? 0;
}

/** Retourne un label de période lisible */
export function periodLabel(r: CumulF1F2Response | CumulIntlResponse): string {
  if (r.mode === "date_unique" && r.dateDisplay) return r.dateDisplay;
  if (r.plage) {
    const fmt = (s: string) =>
      new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
    return `${fmt(r.plage.debut)} → ${fmt(r.plage.fin)}`;
  }
  return "";
}

/**
 * Vérifie si c'est une plage de dates (vs date unique)
 */
export function isDateRange(r: CumulF1F2Response | CumulIntlResponse): boolean {
  return r.mode === "plage";
}

/**
 * Formate un nombre en F CFA
 */
export function formatFCFA(value: number): string {
  if (value === 0) return "0 F";
  return value.toLocaleString("fr-FR") + " F";
}

/**
 * Formate un nombre avec signe (+/-)
 */
export function formatSignedFCFA(value: number): string {
  if (value === 0) return "0 F";
  return (value >= 0 ? "+" : "") + formatFCFA(value);
}

// ── Service ───────────────────────────────────────────────────────────────────

const CumulService = {

  // F1/F2
  async getF1F2ByPreset(preset: F1F2Preset): Promise<CumulF1F2Response> {
    const { data } = await cumulRoutes.getF1F2ByPreset(preset);
    return data;
  },

  /** Plage complète : start ≠ end */
  async getF1F2ByRange(start: string, end: string): Promise<CumulF1F2Response> {
    const { data } = await cumulRoutes.getF1F2ByRange(start, end);
    return data;
  },

  /** Date unique */
  async getF1F2ByDate(date: string): Promise<CumulF1F2Response> {
    const { data } = await cumulRoutes.getF1F2ByRange(date);
    return data;
  },

  // Internationaux
  async getIntlByPreset(preset: IntlPreset): Promise<CumulIntlResponse> {
    const { data } = await cumulRoutes.getIntlByPreset(preset);
    return data;
  },

  async getIntlByRange(start: string, end: string): Promise<CumulIntlResponse> {
    const { data } = await cumulRoutes.getIntlByRange(start, end);
    return data;
  },

  async getIntlByDate(date: string): Promise<CumulIntlResponse> {
    const { data } = await cumulRoutes.getIntlByRange(date);
    return data;
  },
};

export default CumulService;