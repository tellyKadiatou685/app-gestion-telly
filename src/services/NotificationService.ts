import api from "@/config";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  data?: any;
}

export interface NotificationResponse {
  notifications: Notification[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
  unreadCount: number;
}

class NotificationService {

  // ── Récupérer les notifications ──────────────────────────────────────────
  async getNotifications(options: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    type?: string;
  } = {}): Promise<NotificationResponse> {
    const params = new URLSearchParams();
    if (options.page)      params.append("page",       String(options.page));
    if (options.limit)     params.append("limit",      String(options.limit));
    if (options.unreadOnly) params.append("unreadOnly", "true");
    if (options.type)      params.append("type",       options.type);

    const response = await api.get(`/notifications?${params.toString()}`);
    return response.data;
  }

  // ── Compter les non lues (badge) ─────────────────────────────────────────
  async getUnreadCount(): Promise<number> {
    const response = await api.get("/notifications/unread-count");
    return response.data.count;
  }

  // ── Marquer une comme lue ────────────────────────────────────────────────
  async markAsRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`);
  }

  // ── Marquer toutes comme lues ────────────────────────────────────────────
  async markAllAsRead(): Promise<{ count: number }> {
    const response = await api.patch("/notifications/read-all");
    return response.data;
  }

  // ── Marquer plusieurs comme lues ─────────────────────────────────────────
  async markManyAsRead(ids: string[]): Promise<{ count: number }> {
    const response = await api.patch("/notifications/read-many", { ids });
    return response.data;
  }

  // ── Supprimer une ────────────────────────────────────────────────────────
  async deleteNotification(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`);
  }

  // ── Supprimer plusieurs ──────────────────────────────────────────────────
  async deleteManyNotifications(ids: string[]): Promise<{ count: number }> {
    const response = await api.delete("/notifications/delete-many", { data: { ids } });
    return response.data;
  }

  // ── Supprimer les lues ───────────────────────────────────────────────────
  async deleteReadNotifications(): Promise<{ count: number }> {
    const response = await api.delete("/notifications/delete-read");
    return response.data;
  }

  // ── Supprimer toutes ─────────────────────────────────────────────────────
  async deleteAllNotifications(): Promise<{ count: number }> {
    const response = await api.delete("/notifications/delete-all");
    return response.data;
  }
}

export default new NotificationService();