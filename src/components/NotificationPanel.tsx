import { useState, useEffect, useRef } from "react";
import {
  Bell, X, Check, CheckCheck, Trash2, Loader2,
  RefreshCw, BellOff, ChevronDown
} from "lucide-react";
import NotificationService, { type Notification } from "@/services/NotificationService";

const TYPE_CONFIG: Record<string, { emoji: string; color: string; bg: string }> = {
  DEPOT_PARTENAIRE:    { emoji: "💰", color: "#16a34a", bg: "#f0fdf4" },
  RETRAIT_PARTENAIRE:  { emoji: "💸", color: "#dc2626", bg: "#fef2f2" },
  DEBUT_JOURNEE:       { emoji: "🌅", color: "#2563eb", bg: "#eff6ff" },
  FIN_JOURNEE:         { emoji: "🌙", color: "#7c3aed", bg: "#f5f3ff" },
  RESET_SUPERVISOR:    { emoji: "🔄", color: "#0891b2", bg: "#ecfeff" },
  RESET_ADMIN:         { emoji: "✅", color: "#059669", bg: "#ecfdf5" },
  RESET_PARTNER:       { emoji: "🌅", color: "#d97706", bg: "#fffbeb" },
  CREATION_UTILISATEUR:{ emoji: "👤", color: "#7c3aed", bg: "#f5f3ff" },
  DEMANDE_INSCRIPTION: { emoji: "📋", color: "#ea580c", bg: "#fff7ed" },
  AUDIT_MODIFICATION:  { emoji: "✏️", color: "#ca8a04", bg: "#fefce8" },
  AUDIT_SUPPRESSION:   { emoji: "🗑️", color: "#dc2626", bg: "#fef2f2" },
};

const getConfig = (type: string) =>
  TYPE_CONFIG[type] ?? { emoji: "🔔", color: "#6b7280", bg: "#f9fafb" };

const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min  = Math.floor(diff / 60000);
  const h    = Math.floor(diff / 3600000);
  const d    = Math.floor(diff / 86400000);
  if (min < 1)  return "À l'instant";
  if (min < 60) return `Il y a ${min} min`;
  if (h < 24)   return `Il y a ${h}h`;
  if (d < 7)    return `Il y a ${d}j`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
};

interface NotificationPanelProps {
  onCountChange?: (count: number) => void;
}

export const NotificationPanel = ({ onCountChange }: NotificationPanelProps) => {
  const [open, setOpen]                       = useState(false);
  const [notifications, setNotifications]     = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount]         = useState(0);
  const [loading, setLoading]                 = useState(false);
  const [loadingMore, setLoadingMore]         = useState(false);
  const [page, setPage]                       = useState(1);
  const [hasMore, setHasMore]                 = useState(false);
  const [filter, setFilter]                   = useState<"all" | "unread">("all");
  const [selected, setSelected]               = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading]     = useState(false);
  const panelRef                              = useRef<HTMLDivElement>(null);

  // Fermer en cliquant dehors
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSelected(new Set());
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Polling badge toutes les 30s
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const count = await NotificationService.getUnreadCount();
        setUnreadCount(count);
        onCountChange?.(count);
      } catch { /* silencieux */ }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async (p = 1, reset = false) => {
    if (p === 1) setLoading(true); else setLoadingMore(true);
    try {
      const res = await NotificationService.getNotifications({
        page: p, limit: 15,
        unreadOnly: filter === "unread",
      });
      setNotifications(prev => reset ? res.notifications : [...prev, ...res.notifications]);
      setUnreadCount(res.unreadCount);
      onCountChange?.(res.unreadCount);
      setHasMore(res.pagination.hasMore);
      setPage(p);
    } catch { /* silencieux */ }
    finally { setLoading(false); setLoadingMore(false); }
  };

  useEffect(() => {
    if (open) fetchNotifications(1, true);
  }, [open, filter]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await NotificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
      onCountChange?.(Math.max(0, unreadCount - 1));
    } catch { /* silencieux */ }
  };

  const handleMarkAllAsRead = async () => {
    setActionLoading(true);
    try {
      await NotificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      onCountChange?.(0);
    } catch { /* silencieux */ }
    finally { setActionLoading(false); }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await NotificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch { /* silencieux */ }
  };

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    setActionLoading(true);
    try {
      await NotificationService.deleteManyNotifications(Array.from(selected));
      setNotifications(prev => prev.filter(n => !selected.has(n.id)));
      setSelected(new Set());
    } catch { /* silencieux */ }
    finally { setActionLoading(false); }
  };

  const handleDeleteRead = async () => {
    setActionLoading(true);
    try {
      await NotificationService.deleteReadNotifications();
      setNotifications(prev => prev.filter(n => !n.isRead));
    } catch { /* silencieux */ }
    finally { setActionLoading(false); }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(notifications.map(n => n.id)));
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bouton cloche */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-1.5 sm:p-2 rounded-lg bg-card border border-input hover:bg-muted transition-colors"
      >
        <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-destructive rounded-full text-[9px] text-white flex items-center justify-center font-bold px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
          style={{ maxHeight: "80vh" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="font-bold text-sm text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-destructive text-white px-1.5 py-0.5 rounded-full font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => fetchNotifications(1, true)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                title="Actualiser"
              >
                <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <button
                onClick={() => { setOpen(false); setSelected(new Set()); }}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Filtres + actions */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border gap-2">
            <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
              {(["all", "unread"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    filter === f
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f === "all" ? "Toutes" : "Non lues"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {selected.size > 0 ? (
                <>
                  <span className="text-[10px] text-muted-foreground">{selected.size} sélectionnée(s)</span>
                  <button
                    onClick={handleDeleteSelected}
                    disabled={actionLoading}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors"
                  >
                    {actionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    Supprimer
                  </button>
                </>
              ) : (
                <>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      disabled={actionLoading}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted text-xs text-muted-foreground hover:text-foreground transition-colors"
                      title="Tout marquer lu"
                    >
                      <CheckCheck className="h-3 w-3" />
                      <span className="hidden sm:inline">Tout lire</span>
                    </button>
                  )}
                  <button
                    onClick={handleDeleteRead}
                    disabled={actionLoading}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted text-xs text-muted-foreground hover:text-destructive transition-colors"
                    title="Supprimer les lues"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span className="hidden sm:inline">Nettoyer</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Sélection tout */}
          {notifications.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-muted/10">
              <input
                type="checkbox"
                checked={selected.size === notifications.length}
                onChange={selected.size === notifications.length
                  ? () => setSelected(new Set())
                  : selectAll
                }
                className="rounded"
              />
              <span className="text-[10px] text-muted-foreground">Tout sélectionner</span>
            </div>
          )}

          {/* Liste */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Chargement...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <BellOff className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {filter === "unread" ? "Aucune notification non lue" : "Aucune notification"}
                </p>
              </div>
            ) : (
              <div>
                {notifications.map(notif => {
                  const cfg = getConfig(notif.type);
                  return (
                    <div
                      key={notif.id}
                      onClick={() => toggleSelect(notif.id)}
                      className={`flex items-start gap-3 px-3 py-3 border-b border-border cursor-pointer transition-colors hover:bg-muted/30 ${
                        !notif.isRead ? "bg-primary/3" : ""
                      } ${selected.has(notif.id) ? "bg-primary/8 border-l-2 border-l-primary" : ""}`}
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={selected.has(notif.id)}
                        onChange={() => toggleSelect(notif.id)}
                        onClick={e => e.stopPropagation()}
                        className="mt-1 rounded flex-shrink-0"
                      />

                      {/* Emoji */}
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-base"
                        style={{ background: cfg.bg }}
                      >
                        {cfg.emoji}
                      </div>

                      {/* Contenu */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <p className={`text-xs font-semibold leading-tight truncate ${
                            !notif.isRead ? "text-foreground" : "text-muted-foreground"
                          }`}>
                            {notif.title}
                          </p>
                          {!notif.isRead && (
                            <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {timeAgo(notif.createdAt)}
                        </p>
                      </div>

                      {/* Actions rapides */}
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        {!notif.isRead && (
                          <button
                            onClick={e => handleMarkAsRead(notif.id, e)}
                            className="p-1 rounded hover:bg-green-100 transition-colors"
                            title="Marquer lu"
                          >
                            <Check className="h-3 w-3 text-green-600" />
                          </button>
                        )}
                        <button
                          onClick={e => handleDelete(notif.id, e)}
                          className="p-1 rounded hover:bg-red-100 transition-colors"
                          title="Supprimer"
                        >
                          <X className="h-3 w-3 text-red-400" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Charger plus */}
                {hasMore && (
                  <button
                    onClick={() => fetchNotifications(page + 1)}
                    disabled={loadingMore}
                    className="w-full py-3 flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                  >
                    {loadingMore
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <ChevronDown className="h-3.5 w-3.5" />
                    }
                    Charger plus
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};