// src/services/DateRangeService.ts
//
// Service dédié aux totaux CUMULÉS d'un superviseur sur une plage de dates.
// Fichier séparé de TransactionService.ts : aucune méthode existante
// n'est modifiée.

import dateRangeRoutes from "@/Routes/DateRangeRoutes";
import type {
  GetSupervisorRangeTotalsParams,
  SupervisorRangeTotalsResult,
} from "@/types/dateRange.types";

const DateRangeService = {
  /**
   * Récupère les totaux cumulés (début + fin, comptes + partenaires)
   * d'un superviseur sur une plage de dates inclusive.
   *
   * Les deux dates peuvent être passées dans n'importe quel ordre,
   * le backend les normalise. "Aujourd'hui" est toujours ignoré côté
   * backend (son snapshot n'existe qu'après le reset de minuit) :
   * si la plage inclut la date du jour, ses données en direct ne sont
   * pas comptées dans le total.
   */
  async getSupervisorRangeTotals(
    params: GetSupervisorRangeTotalsParams
  ): Promise<SupervisorRangeTotalsResult> {
    const { data } = await dateRangeRoutes.getSupervisorRangeTotals(params);
    return data.data!;
  },

  /** true si la plage contient au moins un jour sans snapshot */
  hasMissingDays(result: SupervisorRangeTotalsResult): boolean {
    return result.missingDays.length > 0;
  },

  /** Formate un montant en FCFA (identique à TransactionService.formatAmount) */
  formatAmount(amount: number, withSign = false): string {
    const formatted = Math.abs(amount).toLocaleString("fr-FR") + "\u202FF";
    if (!withSign) return formatted;
    return amount >= 0 ? `+${formatted}` : `-${formatted}`;
  },

  /**
   * Sépare les entrées de comptes.debut / comptes.sortie entre
   * types de compte "classiques" (LIQUIDE, WAVE, ...) et lignes
   * partenaires (préfixées "part-"), pour faciliter l'affichage.
   */
  splitComptesAndPartenaires(
    comptesMap: Record<string, number>
  ): { comptes: Record<string, number>; partenaires: Record<string, number> } {
    const comptes: Record<string, number> = {};
    const partenaires: Record<string, number> = {};

    for (const [key, value] of Object.entries(comptesMap)) {
      if (key.startsWith("part-")) {
        partenaires[key.replace(/^part-/, "")] = value;
      } else {
        comptes[key] = value;
      }
    }

    return { comptes, partenaires };
  },
};

export default DateRangeService;