// src/Routes/PastTransactionRoutes.ts
//
// Route dédiée à la création de transactions sur une date PASSÉE.
// Fichier séparé de TransactionRoutes.ts : aucune route existante
// n'est modifiée.

import api from "@/config";
import type {
  CreatePastTransactionPayload,
  CreatePastTransactionResponse,
} from "@/types/pastTransaction.types";

const pastTransactionRoutes = {
  /**
   * POST /api/transactions/past
   * Réservé à l'ADMIN côté backend.
   */
  createPastTransaction: (payload: CreatePastTransactionPayload) =>
    api.post<ApiResponse<CreatePastTransactionResponse>>(
      "/transactions/past",
      payload
    ),
};

export default pastTransactionRoutes;