// src/types/pastTransaction.types.ts
//
// Types dédiés à la création de transactions sur une date PASSÉE.
// Fichier séparé de transaction.types.ts : aucune interface existante
// n'est modifiée.

import type { AccountType, OperationType, TransactionType } from "./transaction.types";

// ─── PAYLOAD ENVOYÉ AU BACKEND ────────────────────────────────────────────────

export interface CreatePastTransactionPayload {
  superviseurId: string;
  typeOperation: OperationType; // "depot" (→ colonne DÉBUT) | "retrait" (→ colonne FIN)
  montant: number;

  // Transaction compte fixe (LIQUIDE, WAVE, ORANGE_MONEY, ...)
  typeCompte?: AccountType | string;

  // Transaction partenaire enregistré
  partenaireId?: string;

  // Transaction partenaire libre
  partenaireNom?: string;
  telephoneLibre?: string;

  // F2, uniquement pertinent si typeOperation === "retrait" sur un compte fixe
  finSecondaire?: number | null;

  /**
   * Date cible, format 'YYYY-MM-DD'. Obligatoire.
   * Doit être une date strictement antérieure à aujourd'hui,
   * sinon le backend renvoie une erreur 400.
   */
  targetDate: string;
}

// ─── RÉPONSE DU BACKEND ────────────────────────────────────────────────────────

export interface PastTransactionResult {
  id: string;
  type: TransactionType;
  montant: number;
  description?: string;
  typeCompte?: AccountType | string | null;
  targetDate: string;
  isPartnerTransaction: boolean;
  partnerName?: string | null;
  partnerId?: string | null;
  superviseurNom: string;
}

export interface CreatePastTransactionResponse {
  transaction: PastTransactionResult;
  snapshotUpdated: boolean;
  finSecondaire?: number | null;
}