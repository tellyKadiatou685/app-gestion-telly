import partnerBalanceRoutes, {
    type PartnerBalance,
    type PartnerBalanceSummary,
    type PartnerHistoryData,
  } from "@/Routes/PartnerBalanceRoutes";
  
  const PartnerBalanceService = {
    getPartnerBalance: async (partenaireId: string): Promise<PartnerBalance> => {
      const res = await partnerBalanceRoutes.getPartnerBalance(partenaireId);
      return res.data.data;
    },
  
    getAllPartnersBalances: async (): Promise<PartnerBalanceSummary[]> => {
      const res = await partnerBalanceRoutes.getAllPartnersBalances();
      return res.data.data.partners;
    },
  
    // NOUVEAU — historique enrichi
    getPartnerHistory: async (partenaireId: string): Promise<PartnerHistoryData> => {
      const res = await partnerBalanceRoutes.getPartnerHistory(partenaireId);
      return res.data.data;
    },
  };
  
  export default PartnerBalanceService;
  