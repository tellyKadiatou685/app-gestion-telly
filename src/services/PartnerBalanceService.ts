// src/services/PartnerBalanceService.ts
import partnerBalanceRoutes, {
  type PartnerBalance,
  type PartnerBalanceSummary,
  type PartnerHistoryData,
  type AdminDirectTransactionPayload,
  type AdminDirectTransactionResult,
  type DeleteTransactionResult,
  type UpdateMontantResult,
  type HistoryFilters,
} from "@/Routes/PartnerBalanceRoutes";

const PartnerBalanceService = {

  // ─── Tous les soldes ───────────────────────────────────────────────────────
  getAllPartnersBalances: async (): Promise<PartnerBalanceSummary[]> => {
    const res = await partnerBalanceRoutes.getAllPartnersBalances();
    return res.data.data.partners;
  },

  // ─── Solde d'un partenaire ─────────────────────────────────────────────────
  getPartnerBalance: async (partenaireId: string): Promise<PartnerBalance> => {
    const res = await partnerBalanceRoutes.getPartnerBalance(partenaireId);
    return res.data.data;
  },

  // ─── Historique avec filtres optionnels ────────────────────────────────────
  // filters.type      : "DEPOT" | "RETRAIT" | null
  // filters.dateDebut : "YYYY-MM-DD" | null
  // filters.dateFin   : "YYYY-MM-DD" | null
  getPartnerHistory: async (
    partenaireId: string,
    filters?: HistoryFilters
  ): Promise<PartnerHistoryData> => {
    const res = await partnerBalanceRoutes.getPartnerHistory(partenaireId, filters);
    return res.data.data;
  },

  // ─── Transaction directe admin → partenaire ────────────────────────────────
  // Sans destinataireId → n'impacte AUCUN superviseur
  // commentaire optionnel → visible dans l'historique partenaire uniquement
  createAdminDirectTransaction: async (
    partenaireId: string,
    type: "depot" | "retrait",
    montant: number,
    commentaire?: string | null
  ): Promise<AdminDirectTransactionResult> => {
    const payload: AdminDirectTransactionPayload = {
      type,
      montant,
      ...(commentaire?.trim() ? { commentaire: commentaire.trim() } : {}),
    };
    const res = await partnerBalanceRoutes.createAdminDirectTransaction(
      partenaireId,
      payload
    );
    return res.data.data;
  },

  // ─── Modification du montant d'une transaction ─────────────────────────────
  // Si superviseur impliqué → recompute snapshot → card mise à jour auto
  // Si transaction admin directe → historique partenaire uniquement
  updateTransactionMontant: async (
    transactionId: string,
    montant: number
  ): Promise<UpdateMontantResult> => {
    const res = await partnerBalanceRoutes.updateTransactionMontant(
      transactionId,
      { montant }
    );
    return res.data.data;
  },

  // ─── Suppression logique d'une transaction ─────────────────────────────────
  // Marque [SUPPRIMÉ] dans la description
  // Si superviseur impliqué → recompute snapshot → card mise à jour auto
  // Si transaction admin directe → aucun impact sur les cards
  deleteTransaction: async (
    transactionId: string
  ): Promise<DeleteTransactionResult> => {
    const res = await partnerBalanceRoutes.deleteTransaction(transactionId);
    return res.data.data;
  },
};

export default PartnerBalanceService;