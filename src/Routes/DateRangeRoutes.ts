// src/Routes/DateRangeRoutes.ts
//
// Route dédiée aux totaux CUMULÉS d'un superviseur sur une plage de dates.
// Fichier séparé de TransactionRoutes.ts : aucune route existante
// n'est modifiée.

import api from "@/config";
import type {
  GetSupervisorRangeTotalsParams,
  SupervisorRangeTotalsResult,
} from "@/types/dateRange.types";

const dateRangeRoutes = {
  /**
   * GET /api/transactions/supervisor/:supervisorId/range-totals?startDate=...&endDate=...
   * Accessible à l'ADMIN (n'importe quel superviseur) ou au SUPERVISEUR
   * lui-même (ses propres totaux uniquement).
   */
  getSupervisorRangeTotals: ({
    supervisorId,
    startDate,
    endDate,
  }: GetSupervisorRangeTotalsParams) =>
    api.get<ApiResponse<SupervisorRangeTotalsResult>>(
      `/transactions/supervisor/${supervisorId}/range-totals`,
      { params: { startDate, endDate } }
    ),
};

export default dateRangeRoutes;