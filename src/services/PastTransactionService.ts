// src/services/PastTransactionService.ts
//
// Service dédié à la création de transactions sur une date PASSÉE.
// Fichier séparé de TransactionService.ts : aucune méthode existante
// n'est modifiée.

import pastTransactionRoutes from "@/Routes/PastTransactionRoutes";
import type {
  CreatePastTransactionPayload,
  CreatePastTransactionResponse,
} from "@/types/pastTransaction.types";

const PastTransactionService = {
  /**
   * true si dateStr (format 'YYYY-MM-DD') est strictement avant aujourd'hui.
   * Sert à décider, côté composant, s'il faut appeler ce service
   * (date passée) ou le service normal TransactionService (aujourd'hui).
   */
  isPastDate(dateStr?: string | null): boolean {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return target < today;
  },

  /**
   * Crée une transaction pour une date passée.
   * Écrit dans DailySnapshot côté backend (pas dans Account) —
   * ne modifie jamais le solde en direct d'aujourd'hui.
   * Réservé à l'ADMIN : un appel par un superviseur renverra 403.
   */
  async createPastTransaction(
    payload: CreatePastTransactionPayload
  ): Promise<CreatePastTransactionResponse> {
    const { data } = await pastTransactionRoutes.createPastTransaction(payload);
    return data.data!;
  },

  /** Formate un montant en FCFA (identique à TransactionService.formatAmount) */
  formatAmount(amount: number, withSign = false): string {
    const formatted = Math.abs(amount).toLocaleString("fr-FR") + "\u202FF";
    if (!withSign) return formatted;
    return amount >= 0 ? `+${formatted}` : `-${formatted}`;
  },
};

export default PastTransactionService;