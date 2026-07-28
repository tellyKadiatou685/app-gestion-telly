// src/components/PartnerTransactionHistory.tsx
// ✅ Filtres date + type envoyés au backend
// ✅ Commentaire affiché sur chaque transaction
// ✅ Boutons Modifier montant + Supprimer sur chaque transaction

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  X, ArrowUpCircle, ArrowDownCircle, Calendar, Clock,
  User, UserX, Search, Filter, TrendingUp, TrendingDown,
  Activity, AlertCircle, Loader2, Check,
  ReceiptText, Banknote, Hash, BadgeCheck, ShieldOff,
  ArrowLeftRight, BarChart3, CircleDot, Pencil, Trash2,
  MessageSquare, ChevronDown, ChevronUp,
} from "lucide-react";
import PartnerBalanceService from "@/services/PartnerBalanceService";
import type { HistoryFilters, TransactionDetail, PartnerHistoryData } from "@/Routes/PartnerBalanceRoutes";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => Math.abs(n).toLocaleString("fr-FR") + "\u202FF";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateFull(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
}

function groupByDate(transactions: TransactionDetail[]) {
  const groups: Record<string, TransactionDetail[]> = {};
  transactions.forEach(tx => {
    const key = new Date(tx.createdAt).toISOString().split("T")[0];
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
  });
  return groups;
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────

const StatCard = ({ icon, label, value, color, sub }: {
  icon: React.ReactNode; label: string; value: string; color: string; sub?: string;
}) => (
  <div className={`rounded-xl p-3 border ${color} flex flex-col gap-1.5`}>
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</span>
    </div>
    <p className="text-base font-extrabold tabular-nums leading-none">{value}</p>
    {sub && <p className="text-[10px] opacity-60">{sub}</p>}
  </div>
);

// ─── MODAL MODIFIER MONTANT ───────────────────────────────────────────────────

const EditMontantModal = ({
  tx, onClose, onSuccess,
}: {
  tx:        TransactionDetail;
  onClose:   () => void;
  onSuccess: (newMontant: number) => void;
}) => {
  const [montant, setMontant]   = useState(String(tx.montant));
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState<string | null>(null);
  const montantFloat            = parseFloat(montant);
  const isValid                 = !isNaN(montantFloat) && montantFloat > 0 && montantFloat !== tx.montant;

  const handleSave = async () => {
    if (!isValid) return;
    setLoading(true); setError(null);
    try {
      await PartnerBalanceService.updateTransactionMontant(tx.id, montantFloat);
      onSuccess(montantFloat);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const isDepot = tx.type === "DEPOT";

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm overflow-hidden border border-border">
        <div className="w-12 h-1 bg-muted rounded-full mx-auto mt-3 mb-1 sm:hidden" />
        <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${isDepot ? "bg-blue-100" : "bg-orange-100"}`}>
              <Pencil className={`h-4 w-4 ${isDepot ? "text-blue-600" : "text-orange-600"}`} />
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">Modifier le montant</p>
              <p className="text-[11px] text-muted-foreground">
                {isDepot ? "Dépôt" : "Retrait"} — ancien montant : <span className="font-semibold">{fmt(tx.montant)}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
              Nouveau montant <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                type="number" min="1" step="any" autoFocus
                value={montant}
                onChange={e => { setMontant(e.target.value); setError(null); }}
                onKeyDown={e => e.key === "Enter" && handleSave()}
                className="w-full px-4 py-3 pr-10 rounded-xl border border-border bg-background text-sm font-mono font-bold text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">F</span>
            </div>
            {!isNaN(montantFloat) && montantFloat > 0 && (
              <p className="text-[11px] text-muted-foreground pl-1">{montantFloat.toLocaleString("fr-FR")} F</p>
            )}
          </div>
          {error && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-border text-muted-foreground hover:bg-muted transition-colors">
              Annuler
            </button>
            <button onClick={handleSave} disabled={loading || !isValid}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-60 transition-all">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Sauvegarde...</> : <><Check className="h-4 w-4" />Enregistrer</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── MODAL CONFIRMATION SUPPRESSION ──────────────────────────────────────────

const DeleteConfirmModal = ({
  tx, onClose, onSuccess,
}: {
  tx:        TransactionDetail;
  onClose:   () => void;
  onSuccess: () => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const isDepot               = tx.type === "DEPOT";

  const handleDelete = async () => {
    setLoading(true); setError(null);
    try {
      await PartnerBalanceService.deleteTransaction(tx.id);
      onSuccess();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm overflow-hidden border border-rose-300/50">
        <div className="w-12 h-1 bg-muted rounded-full mx-auto mt-3 mb-1 sm:hidden" />
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
              <Trash2 className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <p className="font-bold text-foreground">Supprimer cette transaction ?</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isDepot ? "Dépôt" : "Retrait"} de <span className="font-semibold text-foreground">{fmt(tx.montant)}</span>
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p className="text-xs leading-relaxed">
              Cette suppression est <strong>logique</strong> — la transaction reste en base mais ne compte plus dans le solde.
              {tx.superviseur && !tx.isAdminDirect && (
                <> La <strong>card de {tx.superviseur.nomComplet}</strong> sera mise à jour automatiquement.</>
              )}
            </p>
          </div>
          {error && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-border text-muted-foreground hover:bg-muted transition-colors">
              Annuler
            </button>
            <button onClick={handleDelete} disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center gap-2 disabled:opacity-60 transition-all">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Suppression...</> : <><Trash2 className="h-4 w-4" />Supprimer</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── TRANSACTION ROW ──────────────────────────────────────────────────────────

const TxRow = ({
  tx,
  onEdit,
  onDelete,
}: {
  tx:       TransactionDetail;
  onEdit:   (tx: TransactionDetail) => void;
  onDelete: (tx: TransactionDetail) => void;
}) => {
  const isDepot     = tx.type === "DEPOT";
  const isDeleted   = !tx.superviseur || tx.superviseur.status === "DELETED";
  const isSuspended = tx.superviseur?.status === "SUSPENDED";

  return (
    <div className={`
      flex items-start gap-3 p-3 rounded-xl border transition-all
      ${isDepot
        ? "bg-blue-50/60 border-blue-100 hover:bg-blue-50"
        : "bg-orange-50/60 border-orange-100 hover:bg-orange-50"}
    `}>
      {/* Icône type */}
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${isDepot ? "bg-blue-100" : "bg-orange-100"}`}>
        {isDepot
          ? <ArrowUpCircle   className="h-4 w-4 text-blue-600" />
          : <ArrowDownCircle className="h-4 w-4 text-orange-600" />
        }
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-extrabold tabular-nums ${isDepot ? "text-blue-700" : "text-orange-700"}`}>
              {isDepot ? "+" : "−"}{fmt(tx.montant)}
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isDepot ? "bg-blue-200 text-blue-800" : "bg-orange-200 text-orange-800"}`}>
              {isDepot ? "Dépôt" : "Retrait"}
            </span>
            {tx.archived && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gray-200 text-gray-600">Archivé</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />{formatTime(tx.createdAt)}
            </div>
            {/* ── Boutons actions ── */}
            <button
              onClick={() => onEdit(tx)}
              title="Modifier le montant"
              className="p-1 rounded-lg hover:bg-white/80 text-muted-foreground hover:text-primary transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(tx)}
              title="Supprimer la transaction"
              className="p-1 rounded-lg hover:bg-white/80 text-muted-foreground hover:text-rose-600 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Superviseur */}
        <div className="flex items-center gap-1.5">
          {isDeleted ? (
            <>
              <UserX className="h-3 w-3 text-muted-foreground/60 flex-shrink-0" />
              <span className="text-[11px] text-muted-foreground/60 italic">Employé supprimé</span>
            </>
          ) : (
            <>
              <div className="relative flex-shrink-0">
                <User className="h-3 w-3 text-muted-foreground" />
                {isSuspended && <CircleDot className="h-2 w-2 text-rose-500 absolute -top-0.5 -right-0.5" />}
              </div>
              <span className="text-[11px] text-muted-foreground truncate">{tx.superviseur!.nomComplet}</span>
              {isSuspended && (
                <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-rose-100 text-rose-600 flex-shrink-0">Suspendu</span>
              )}
              {tx.isAdminDirect && (
                <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-violet-100 text-violet-600 flex-shrink-0">Admin direct</span>
              )}
            </>
          )}
        </div>

        {/* ── Commentaire optionnel ── */}
        {tx.commentaire && (
          <div className="mt-1.5 flex items-start gap-1">
            <MessageSquare className="h-3 w-3 text-muted-foreground/50 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-muted-foreground italic">{tx.commentaire}</p>
          </div>
        )}

        {/* Référence / Note legacy */}
        {(tx.reference || (tx.note && !tx.commentaire)) && (
          <div className="mt-1 flex items-start gap-1">
            <ReceiptText className="h-3 w-3 text-muted-foreground/50 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-muted-foreground/70 italic">
              {tx.reference && <span className="font-mono">{tx.reference}</span>}
              {tx.reference && tx.note && " · "}
              {tx.note}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────────

interface Props {
  partnerId:            string;
  partnerName:          string;
  onClose:              () => void;
  fetchHistory:         (id: string, filters?: HistoryFilters) => Promise<PartnerHistoryData>;
  onTransactionDeleted?: () => void;   // callback pour rafraîchir le solde dans la card
  onTransactionUpdated?: () => void;   // callback pour rafraîchir le solde dans la card
}

type FilterType = "ALL" | "DEPOT" | "RETRAIT";

export const PartnerTransactionHistory = ({
  partnerId,
  partnerName,
  onClose,
  fetchHistory,
  onTransactionDeleted,
  onTransactionUpdated,
}: Props) => {
  const [data,    setData]    = useState<PartnerHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // Filtres — envoyés directement au backend
  const [filterType,   setFilterType]   = useState<FilterType>("ALL");
  const [dateDebut,    setDateDebut]    = useState("");
  const [dateFin,      setDateFin]      = useState("");
  const [showFilters,  setShowFilters]  = useState(false);

  // Recherche locale (sur superviseur / montant / commentaire)
  const [search, setSearch] = useState("");

  const [activeTab, setActiveTab] = useState<"timeline" | "stats">("timeline");

  // Modals
  const [editTx,   setEditTx]   = useState<TransactionDetail | null>(null);
  const [deleteTx, setDeleteTx] = useState<TransactionDetail | null>(null);

  // ── Chargement ──
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const filters: HistoryFilters = {
        type:      filterType !== "ALL" ? filterType : null,
        dateDebut: dateDebut || null,
        dateFin:   dateFin   || null,
      };
      const result = await fetchHistory(partnerId, filters);
      setData(result);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Impossible de charger l'historique");
    } finally {
      setLoading(false);
    }
  }, [partnerId, filterType, dateDebut, dateFin, fetchHistory]);

  useEffect(() => { load(); }, [load]);

  // ── Recherche locale (filtre résiduel sur les données déjà filtrées par le backend) ──
  const filteredTx = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data.transactions;
    const q = search.toLowerCase();
    return data.transactions.filter(t =>
      t.superviseur?.nomComplet?.toLowerCase().includes(q) ||
      fmt(t.montant).includes(q) ||
      t.commentaire?.toLowerCase().includes(q) ||
      t.reference?.toLowerCase().includes(q) ||
      t.note?.toLowerCase().includes(q)
    );
  }, [data, search]);

  // ── Top employés ──
  const topEmployes = useMemo(() => {
    if (!data) return [];
    const map: Record<string, { name: string; count: number; total: number; role: string; deleted: boolean }> = {};
    data.transactions.forEach(tx => {
      const key = tx.superviseur?.id ?? "__deleted__";
      if (!map[key]) map[key] = { name: tx.superviseur?.nomComplet ?? "Employé supprimé", count: 0, total: 0, role: tx.superviseur?.role ?? "—", deleted: !tx.superviseur };
      map[key].count++;
      map[key].total += tx.montant;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [data]);

  const grouped    = useMemo(() => groupByDate(filteredTx), [filteredTx]);
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  const isActive    = data?.partenaire.status === "ACTIVE";

  // ── Callbacks après edit/delete ──
  const handleEditSuccess = (txId: string, newMontant: number) => {
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        transactions: prev.transactions.map(t =>
          t.id === txId ? { ...t, montant: newMontant } : t
        ),
      };
    });
    setEditTx(null);
    onTransactionUpdated?.();
  };

  const handleDeleteSuccess = (txId: string) => {
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        transactions: prev.transactions.filter(t => t.id !== txId),
      };
    });
    setDeleteTx(null);
    onTransactionDeleted?.();
  };

  const hasActiveFilters = filterType !== "ALL" || !!dateDebut || !!dateFin;

  return (
    <>
      {/* ── Modals ── */}
      {editTx && (
        <EditMontantModal
          tx={editTx}
          onClose={() => setEditTx(null)}
          onSuccess={(newMontant) => handleEditSuccess(editTx.id, newMontant)}
        />
      )}
      {deleteTx && (
        <DeleteConfirmModal
          tx={deleteTx}
          onClose={() => setDeleteTx(null)}
          onSuccess={() => handleDeleteSuccess(deleteTx.id)}
        />
      )}

      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px]" onClick={onClose} />

        {/* Panel */}
        <div className="relative bg-card w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[88vh] rounded-t-3xl sm:rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden">

          {/* ── Header ── */}
          <div className="px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4 sm:hidden" />
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <ArrowLeftRight className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-foreground leading-tight">{partnerName}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                    }`}>
                      {isActive ? <><BadgeCheck className="h-3 w-3" />Actif</> : <><ShieldOff className="h-3 w-3" />Suspendu</>}
                    </span>
                    {data && (
                      <span className="text-[10px] text-muted-foreground">
                        {data.statistiques.nombreTransactions} opération{data.statistiques.nombreTransactions > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground flex-shrink-0">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-4 bg-muted/50 rounded-xl p-1">
              {(["timeline", "stats"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === tab ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}>
                  {tab === "timeline"
                    ? <><Activity className="h-3.5 w-3.5" />Timeline</>
                    : <><BarChart3 className="h-3.5 w-3.5" />Statistiques</>}
                </button>
              ))}
            </div>
          </div>

          {/* ── Contenu ── */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Chargement de l'historique...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 px-6">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-sm text-destructive text-center">{error}</p>
                <button onClick={load} className="text-xs text-primary underline">Réessayer</button>
              </div>
            ) : data ? (
              <>
                {/* ── TAB TIMELINE ── */}
                {activeTab === "timeline" && (
                  <div className="p-4 space-y-3">

                    {/* Solde actuel */}
                    <div className={`rounded-xl border p-3 flex items-center justify-between ${
                      data.solde.etat === "SOLDE"         ? "bg-emerald-50 border-emerald-200" :
                      data.solde.etat === "BOUTIQUE_DOIT" ? "bg-blue-50 border-blue-200"       :
                                                            "bg-rose-50 border-rose-200"
                    }`}>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Solde actuel</p>
                        <p className={`text-xl font-extrabold tabular-nums ${
                          data.solde.etat === "SOLDE"         ? "text-emerald-700" :
                          data.solde.etat === "BOUTIQUE_DOIT" ? "text-blue-700"    :
                                                                "text-rose-700"
                        }`}>
                          {data.solde.etat === "SOLDE" ? "Soldé ✅" : fmt(data.solde.montantAbsolu)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-muted-foreground">{data.solde.label}</p>
                        {data.statistiques.derniereTransaction && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Dernière op. : {formatDate(data.statistiques.derniereTransaction)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* ── Zone filtres ── */}
                    <div className="space-y-2">

                      {/* Recherche locale */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Rechercher par employé, montant, commentaire..."
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                        />
                      </div>

                      {/* Filtre type (envoyé au backend) */}
                      <div className="flex gap-2 items-center">
                        <div className="flex gap-1 bg-muted/40 rounded-lg p-1 flex-1">
                          {(["ALL", "DEPOT", "RETRAIT"] as FilterType[]).map(f => (
                            <button key={f} onClick={() => setFilterType(f)}
                              className={`flex-1 text-[10px] font-bold py-1.5 rounded-md transition-all ${
                                filterType === f
                                  ? f === "DEPOT"   ? "bg-blue-500 text-white" :
                                    f === "RETRAIT" ? "bg-orange-500 text-white" :
                                                      "bg-card shadow-sm text-foreground"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}>
                              {f === "ALL" ? "Tous" : f === "DEPOT" ? "Dépôts" : "Retraits"}
                            </button>
                          ))}
                        </div>

                        {/* Bouton afficher/masquer filtre date */}
                        <button
                          onClick={() => setShowFilters(v => !v)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                            hasActiveFilters && (!!dateDebut || !!dateFin)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                          }`}
                        >
                          <Calendar className="h-3 w-3" />
                          Dates
                          {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                      </div>

                      {/* Filtres date — envoyés au backend */}
                      {showFilters && (
                        <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-muted/30 border border-border">
                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Du</label>
                            <input
                              type="date"
                              value={dateDebut}
                              onChange={e => setDateDebut(e.target.value)}
                              className="w-full px-2.5 py-2 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Au</label>
                            <input
                              type="date"
                              value={dateFin}
                              min={dateDebut || undefined}
                              onChange={e => setDateFin(e.target.value)}
                              className="w-full px-2.5 py-2 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                          </div>
                          {(dateDebut || dateFin) && (
                            <button
                              onClick={() => { setDateDebut(""); setDateFin(""); }}
                              className="col-span-2 text-[10px] font-semibold text-muted-foreground hover:text-foreground underline text-center"
                            >
                              Effacer les dates
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Compteur résultats */}
                    <p className="text-[10px] text-muted-foreground px-0.5">
                      {filteredTx.length} transaction{filteredTx.length > 1 ? "s" : ""}
                      {filteredTx.length !== data.transactions.length && ` (sur ${data.transactions.length})`}
                      {hasActiveFilters && (
                        <span className="ml-1 text-primary font-semibold">· filtres actifs</span>
                      )}
                    </p>

                    {/* Timeline groupée par date */}
                    {filteredTx.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Filter className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Aucune transaction trouvée</p>
                        {hasActiveFilters && (
                          <button
                            onClick={() => { setFilterType("ALL"); setDateDebut(""); setDateFin(""); setSearch(""); }}
                            className="mt-2 text-xs text-primary underline"
                          >
                            Réinitialiser les filtres
                          </button>
                        )}
                      </div>
                    ) : (
                      sortedDates.map(dateKey => (
                        <div key={dateKey}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-px flex-1 bg-border" />
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 border border-border">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="text-[10px] font-bold text-muted-foreground capitalize">
                                {formatDateFull(grouped[dateKey][0].createdAt)}
                              </span>
                              <span className="text-[10px] font-bold text-primary ml-1">{grouped[dateKey].length}</span>
                            </div>
                            <div className="h-px flex-1 bg-border" />
                          </div>
                          <div className="space-y-2 mb-3">
                            {grouped[dateKey].map(tx => (
                              <TxRow
                                key={tx.id}
                                tx={tx}
                                onEdit={setEditTx}
                                onDelete={setDeleteTx}
                              />
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* ── TAB STATS ── */}
                {activeTab === "stats" && (
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <StatCard icon={<ArrowUpCircle className="h-3.5 w-3.5 text-blue-600" />} label="Total dépôts"     value={fmt(data.statistiques.totalDepots)}    color="bg-blue-50 border-blue-200 text-blue-900" />
                      <StatCard icon={<ArrowDownCircle className="h-3.5 w-3.5 text-orange-600" />} label="Total retraits" value={fmt(data.statistiques.totalRetraits)} color="bg-orange-50 border-orange-200 text-orange-900" />
                      <StatCard icon={<Hash className="h-3.5 w-3.5 text-violet-600" />} label="Nb transactions"  value={String(data.statistiques.nombreTransactions)} color="bg-violet-50 border-violet-200 text-violet-900"
                        sub={data.statistiques.premiereTransaction ? `Depuis ${formatDate(data.statistiques.premiereTransaction)}` : undefined} />
                      <StatCard icon={<Banknote className="h-3.5 w-3.5 text-emerald-600" />} label="Moyenne / op." value={fmt(data.statistiques.moyenneTransaction)} color="bg-emerald-50 border-emerald-200 text-emerald-900" />
                      <StatCard icon={<TrendingUp className="h-3.5 w-3.5 text-green-600" />}   label="Plus gros dépôt"   value={fmt(data.statistiques.plusGrosDepot)}   color="bg-green-50 border-green-200 text-green-900" />
                      <StatCard icon={<TrendingDown className="h-3.5 w-3.5 text-red-600" />}  label="Plus gros retrait" value={fmt(data.statistiques.plusGrosRetrait)} color="bg-red-50 border-red-200 text-red-900" />
                    </div>

                    {/* Top employés */}
                    <div>
                      <h3 className="text-xs font-bold text-foreground mb-2 flex items-center gap-2">
                        <User className="h-3.5 w-3.5" />Employés ayant effectué des transactions
                      </h3>
                      <div className="space-y-2">
                        {topEmployes.map((emp, i) => {
                          const pct = Math.round((emp.count / data.statistiques.nombreTransactions) * 100);
                          return (
                            <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 border border-border">
                              <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                                emp.deleted ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                              }`}>
                                {emp.deleted ? <UserX className="h-4 w-4" /> : i + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <p className={`text-xs font-semibold truncate ${emp.deleted ? "text-muted-foreground italic" : "text-foreground"}`}>
                                    {emp.name}
                                  </p>
                                  {!emp.deleted && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex-shrink-0">{emp.role}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0">{emp.count} op. ({pct}%)</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Période d'activité */}
                    {data.statistiques.premiereTransaction && data.statistiques.derniereTransaction && (
                      <div className="rounded-xl border border-border bg-muted/20 p-3">
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Période d'activité</h3>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 text-center">
                            <p className="text-[10px] text-muted-foreground">Première</p>
                            <p className="text-xs font-bold text-foreground">{formatDate(data.statistiques.premiereTransaction)}</p>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <div className="h-px w-8 bg-border" />
                            <Activity className="h-3.5 w-3.5" />
                            <div className="h-px w-8 bg-border" />
                          </div>
                          <div className="flex-1 text-center">
                            <p className="text-[10px] text-muted-foreground">Dernière</p>
                            <p className="text-xs font-bold text-foreground">{formatDate(data.statistiques.derniereTransaction)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border flex-shrink-0">
            <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors">
              Fermer
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default PartnerTransactionHistory;