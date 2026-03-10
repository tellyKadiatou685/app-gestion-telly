// src/services/RecentTransactionService.ts
// votre instance axios avec baseURL + auth token
import api from '@/config';
import type {
  RecentTransactionsResponse,
  PaginatedByFiveResponse,
  TransactionStatsResponse,
  AllUsersResponse,
  SearchResponse,
  NotificationsResponse,
  BalanceCheckResponse,
  TransactionFilters,
  Period,
  AccountType,
  UserRole,
} from '@/types/recentTransaction.types';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Supprime les clés dont la valeur est vide / undefined */
function cleanParams(obj: Record<string, any>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => [k, String(v)])
  );
}

// ─── SERVICE ─────────────────────────────────────────────────────────────────

const RecentTransactionService = {

  // ──────────────────────────────────────────────────────────────────────────
  // 1. TRANSACTIONS AVEC FILTRES AVANCÉS  →  GET /api/recent
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Récupère les transactions avec filtrage avancé (pagination 20 par défaut).
   */
  async getRecentTransactions(
    filters: TransactionFilters = {}
  ): Promise<RecentTransactionsResponse['data']> {
    const params = cleanParams({
      search:         filters.search,
      supervisorId:   filters.supervisorId,
      partnerId:      filters.partnerId,
      operatorId:     filters.operatorId,
      type:           filters.transactionType || 'all',
      period:         filters.period         ?? 'today',
      accountType:    filters.accountType    || 'all',
      supervisorName: filters.supervisorName,
      partnerName:    filters.partnerName,
      operatorName:   filters.operatorName,
      userName:       filters.userName,
      page:           filters.page           ?? 1,
      limit:          filters.limit          ?? 20,
      sortBy:         filters.sortBy         ?? 'createdAt',
      sortOrder:      filters.sortOrder      ?? 'desc',
    });

    const res = await api.get<RecentTransactionsResponse>('/recent', { params });
    return res.data.data;
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 2. PAGINATION PAR 5  →  GET /api/recent/paginated
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Pagination fixée à 5 transactions par page (pour le dashboard).
   */
  async getTransactionsPaginatedByFive(
    filters: TransactionFilters = {},
    page = 1
  ): Promise<PaginatedByFiveResponse['data']> {
    const params = cleanParams({
      search:       filters.search,
      supervisorId: filters.supervisorId,
      partnerId:    filters.partnerId,
      operatorId:   filters.operatorId,
      type:         filters.transactionType || 'all',
      period:       filters.period         ?? 'today',
      accountType:  filters.accountType    || 'all',
      page,
    });

    const res = await api.get<PaginatedByFiveResponse>('/api/recent/paginated', { params });
    return res.data.data;
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 3. STATISTIQUES  →  GET /api/recent/stats
  // ──────────────────────────────────────────────────────────────────────────

  async getTransactionStats(
    period: Period = 'today'
  ): Promise<TransactionStatsResponse['data']> {
    const res = await api.get<TransactionStatsResponse>('/api/recent/stats', {
      params: { period },
    });
    return res.data.data;
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 4. UTILISATEURS  →  GET /api/recent/users/all
  // ──────────────────────────────────────────────────────────────────────────

  async getAllUsers(): Promise<AllUsersResponse['data']> {
    const res = await api.get<AllUsersResponse>('/api/recent/users/all');
    return res.data.data;
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 5. RECHERCHE  →  GET /api/recent/search
  // ──────────────────────────────────────────────────────────────────────────

  async searchEntities(
    q: string,
    type: 'all' | UserRole = 'all',
    limit = 10
  ): Promise<SearchResponse['data']> {
    const res = await api.get<SearchResponse>('/api/recent/search', {
      params: cleanParams({ q, type, limit }),
    });
    return res.data.data;
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 6. EXPORT  →  GET /api/recent/export  &  /export/csv
  // ──────────────────────────────────────────────────────────────────────────

  async exportJSON(filters: TransactionFilters = {}) {
    const params = cleanParams({
      search:       filters.search,
      supervisorId: filters.supervisorId,
      type:         filters.transactionType,
      period:       filters.period ?? 'today',
      accountType:  filters.accountType,
    });
    const res = await api.get('/api/recent/export', { params });
    return res.data;
  },

  async exportCSV(filters: TransactionFilters = {}): Promise<Blob> {
    const params = cleanParams({
      search:       filters.search,
      supervisorId: filters.supervisorId,
      type:         filters.transactionType,
      period:       filters.period ?? 'today',
    });
    const res = await api.get('/api/recent/export/csv', {
      params,
      responseType: 'blob',
    });
    return res.data as Blob;
  },

  /** Déclenche le téléchargement CSV dans le navigateur */
  async downloadCSV(filters: TransactionFilters = {}, filename?: string) {
    const blob = await this.exportCSV(filters);
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename ?? `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 7. NOTIFICATIONS  →  GET/PUT/DELETE /api/recent/notifications
  // ──────────────────────────────────────────────────────────────────────────

  async getNotifications(
    limit = 10,
    unreadOnly = false
  ): Promise<NotificationsResponse['data']> {
    const res = await api.get<NotificationsResponse>('/api/recent/notifications', {
      params: cleanParams({ limit, unreadOnly: String(unreadOnly) }),
    });
    return res.data.data;
  },

  async markAsRead(notificationId: string): Promise<void> {
    await api.put(`/api/recent/notifications/${notificationId}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await api.put('/api/recent/notifications/read-all');
  },

  async deleteNotification(notificationId: string): Promise<void> {
    await api.delete(`/api/recent/notifications/${notificationId}`);
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 8. BALANCE CHECK  →  GET /api/recent/balance/:supervisorId/:accountType
  // ──────────────────────────────────────────────────────────────────────────

  async checkBalance(
    supervisorId: string,
    accountType: AccountType,
    amount?: number
  ): Promise<BalanceCheckResponse['data']> {
    const res = await api.get<BalanceCheckResponse>(
      `/api/recent/balance/${supervisorId}/${accountType}`,
      { params: amount !== undefined ? { amount } : {} }
    );
    return res.data.data;
  },
};

export default RecentTransactionService;