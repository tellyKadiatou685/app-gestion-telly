// src/types/dateRange.types.ts
//
// Types dédiés aux totaux CUMULÉS d'un superviseur sur une plage de dates.
// Fichier séparé de transaction.types.ts : aucune interface existante
// n'est modifiée.

// ─── PARAMÈTRES DE LA REQUÊTE ──────────────────────────────────────────────────

export interface GetSupervisorRangeTotalsParams {
    supervisorId: string;
    /** Format 'YYYY-MM-DD' */
    startDate: string;
    /** Format 'YYYY-MM-DD' */
    endDate: string;
  }
  
  // ─── RÉPONSE DU BACKEND ────────────────────────────────────────────────────────
  
  export interface RangeTotalsSuperviseur {
    id: string;
    nom: string;
    status: string;
  }
  
  /**
   * Compte par type (LIQUIDE, WAVE, WESTERN_2, ...) ou par partenaire
   * (clé préfixée "part-<nom>"), montant en FCFA.
   */
  export type RangeTotalsComptesMap = Record<string, number>;
  
  export interface RangeTotalsComptes {
    debut: RangeTotalsComptesMap;
    sortie: RangeTotalsComptesMap;
  }
  
  export interface RangeTotalsPartenaire {
    depots: number;
    retraits: number;
  }
  
  export type RangeTotalsPartenairesMap = Record<string, RangeTotalsPartenaire>;
  
  export interface RangeTotalsFormatted {
    debutTotal: string;
    sortieTotal: string;
    grTotal: string;
  }
  
  export interface RangeTotalsTotaux {
    debutTotal: number;
    sortieTotal: number;
    grTotal: number;
    formatted: RangeTotalsFormatted;
  }
  
  export interface SupervisorRangeTotalsResult {
    superviseur: RangeTotalsSuperviseur;
    startDate: string;
    endDate: string;
    /** Nombre de jours de la plage pour lesquels un DailySnapshot existe */
    daysFound: number;
    /** Jours de la plage sans snapshot (hors "aujourd'hui", toujours exclu) */
    missingDays: string[];
    comptes: RangeTotalsComptes;
    partenaires: RangeTotalsPartenairesMap;
    totaux: RangeTotalsTotaux;
  }