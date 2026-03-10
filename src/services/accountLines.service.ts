// src/services/accountLines.service.ts
import axios from 'axios';
import api from '@/config';
import type {
  LineType,
  AccountLineResponse,
  AuditHistoryResponse,
  AuditHistoryParams,
} from '@/types/accountLines.types';

// BASE sans /api car api instance a déjà baseURL = '...../api'
const BASE = '/account-lines';

// ─── HELPER : parse les erreurs Axios en erreurs lisibles ─────────────────────
function parseApiError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as {
      message?: string;
      code?: string;
      success?: boolean;
    } | undefined;

    const message = data?.message || error.message || 'Erreur inconnue';
    const code    = data?.code || '';

    const err = new Error(message) as Error & { code?: string; status?: number };
    err.code   = code;
    err.status = error.response?.status;
    throw err;
  }
  throw error instanceof Error
    ? error
    : new Error('Erreur réseau. Vérifiez votre connexion.');
}

// ─── SERVICE ──────────────────────────────────────────────────────────────────
const AccountLineService = {

  async deleteAccountLine(
    supervisorId: string,
    lineType: LineType,
    accountKey: string,
    targetDate?: string,
  ): Promise<AccountLineResponse> {
    try {
      const res = await api.delete<AccountLineResponse>(
        `${BASE}/supervisor/${supervisorId}/${lineType}`,
        { data: { accountKey, ...(targetDate && { targetDate }) } }
      );
      return res.data;
    } catch (e) {
      return parseApiError(e);
    }
  },

  async updateAccountLine(
    supervisorId: string,
    lineType: LineType,
    accountKey: string,
    newValue: number,
    targetDate?: string,
  ): Promise<AccountLineResponse> {
    try {
      const res = await api.patch<AccountLineResponse>(
        `${BASE}/supervisor/${supervisorId}/${lineType}/update`,
        { accountKey, newValue, ...(targetDate && { targetDate }) }
      );
      return res.data;
    } catch (e) {
      return parseApiError(e);
    }
  },

  async resetAccountLine(
    supervisorId: string,
    lineType: LineType,
    accountKey: string,
    newValue = 0,
  ): Promise<AccountLineResponse> {
    try {
      const res = await api.put<AccountLineResponse>(
        `${BASE}/supervisor/${supervisorId}/${lineType}/reset`,
        { accountKey, newValue }
      );
      return res.data;
    } catch (e) {
      return parseApiError(e);
    }
  },

  async getAuditHistory(params: AuditHistoryParams = {}): Promise<AuditHistoryResponse> {
    try {
      const res = await api.get<AuditHistoryResponse>(`${BASE}/deletion-history`, { params });
      return res.data;
    } catch (e) {
      return parseApiError(e);
    }
  },
};

export default AccountLineService;