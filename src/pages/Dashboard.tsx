// src/pages/Dashboard.tsx
import { useState, useEffect, useMemo } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { TransactionModal } from "@/components/TransactionModal";
import {
  Bell, Plus, RefreshCw, TrendingUp, TrendingDown,
  Minus, ChevronDown, ChevronLeft, ChevronRight,
  Calendar, Users, Loader2, X, Pencil, Trash2,
  RotateCcw, Check, AlertTriangle, Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import TransactionService from "@/services/TransactionService";
import AuthService from "@/services/Authservice";
import AccountLineService from "@/services/accountLines.service";
import type { AdminDashboard, SupervisorCard, Period } from "@/types/transaction.types";
import type { LineType } from "@/types/accountLines.types";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => Math.abs(n).toLocaleString("fr-FR") + "\u202FF";

const PERIODS: { value: string; label: string; emoji: string }[] = [
  { value: "today",     label: "Aujourd'hui", emoji: "📅" },
  { value: "yesterday", label: "Hier",         emoji: "🕐" },
  { value: "custom",    label: "Date...",       emoji: "🔎" },
];

const PeopleIcon = () => (
  <svg width="14" height="11" viewBox="0 0 22 15" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="7.5" cy="4.5" r="3.5" fill="#3b9edd" />
    <circle cx="14.5" cy="4.5" r="3.5" fill="#3b9edd" opacity="0.6" />
    <path d="M1 14c0-3 2.9-5.5 6.5-5.5S14 11 14 14" fill="#3b9edd" />
    <path d="M13.5 9c2.2.7 3.8 2.7 3.8 5" stroke="#3b9edd" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
  </svg>
);

const StatBadge = ({ value, color }: { value: number; color: "green" | "blue" }) => (
  <span className={`inline-block border rounded-full px-3 py-0.5 text-xs font-bold tabular-nums ${
    color === "green" ? "bg-green-50 text-green-700 border-green-200" : "bg-blue-50 text-blue-700 border-blue-200"
  }`}>
    {fmt(value)}
  </span>
);

// ─── TYPES ACTIONS ────────────────────────────────────────────────────────────

type ActionMode = "edit" | "delete" | "reset";

interface ActiveAction {
  supervisorId: string;
  lineType: LineType;
  accountKey: string;
  currentValue: number;
  mode: ActionMode;
  targetDate?: string;
}

// ─── POPOVER ACTION ───────────────────────────────────────────────────────────

const ActionPopover = ({
  action, onClose, onSuccess,
}: {
  action: ActiveAction; onClose: () => void; onSuccess: () => void;
}) => {
  const [inputValue, setInputValue] = useState(String(action.currentValue));
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const isPartner    = action.accountKey.startsWith("part-");
  const displayLabel = isPartner ? action.accountKey.replace("part-", "") : action.accountKey;
  const lineLabel    = action.lineType === "debut" ? "Début" : "Fin";
  const isPastDate   = !!action.targetDate;

  const cfg = {
    edit:   { title: "Modifier la valeur",  icon: <Pencil className="h-3.5 w-3.5" />,    accent: "#10b981", light: "rgba(16,185,129,0.08)", textColor: "#065f46", btn: "bg-emerald-500 hover:bg-emerald-600 text-white", btnLabel: "Enregistrer"  },
    delete: { title: "Supprimer la ligne",  icon: <Trash2 className="h-3.5 w-3.5" />,    accent: "#ef4444", light: "rgba(239,68,68,0.08)",   textColor: "#991b1b", btn: "bg-red-500 hover:bg-red-600 text-white",         btnLabel: "Supprimer"    },
    reset:  { title: "Remettre à zéro",     icon: <RotateCcw className="h-3.5 w-3.5" />, accent: "#f59e0b", light: "rgba(245,158,11,0.08)",  textColor: "#92400e", btn: "bg-amber-500 hover:bg-amber-600 text-white",      btnLabel: "Réinitialiser"},
  }[action.mode];

  const handleSubmit = async () => {
    setLoading(true); setError(null);
    try {
      if (action.mode === "delete") {
        await AccountLineService.deleteAccountLine(action.supervisorId, action.lineType, action.accountKey, action.targetDate);
      } else if (action.mode === "reset") {
        await AccountLineService.resetAccountLine(action.supervisorId, action.lineType, action.accountKey, 0);
      } else {
        const val = parseFloat(inputValue);
        if (isNaN(val) || val < 0) { setError("Valeur invalide"); setLoading(false); return; }
        await AccountLineService.updateAccountLine(action.supervisorId, action.lineType, action.accountKey, val, action.targetDate);
      }
      onSuccess();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Une erreur est survenue");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" style={{ border: `1.5px solid ${cfg.accent}40` }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ background: cfg.light, borderBottom: `1px solid ${cfg.accent}25` }}>
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex items-center justify-center h-8 w-8 rounded-full text-white flex-shrink-0" style={{ background: cfg.accent }}>{cfg.icon}</span>
            <div className="min-w-0">
              <p className="text-sm font-bold" style={{ color: cfg.textColor }}>{cfg.title}</p>
              <p className="text-xs font-medium mt-0.5 truncate" style={{ color: cfg.textColor, opacity: 0.75 }}>
                {isPartner ? "👤 " : "💳 "}{displayLabel} · {lineLabel}
                {isPastDate && <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-600">📅 {action.targetDate}</span>}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5 transition-colors flex-shrink-0 ml-2"><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between bg-muted/40 rounded-xl px-4 py-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valeur actuelle</span>
            <span className="text-sm font-extrabold text-foreground tabular-nums">{fmt(action.currentValue)}</span>
          </div>
          {isPastDate && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl text-xs bg-orange-50 text-orange-700 border border-orange-200">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <p>Modification d'une <strong>date passée</strong> — le snapshot historique sera mis à jour.</p>
            </div>
          )}
          {action.mode === "edit" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nouvelle valeur (F)</label>
              <input type="number" min={0} value={inputValue} onChange={e => setInputValue(e.target.value)} autoFocus
                className="w-full px-3 py-2.5 rounded-xl border text-sm bg-background text-foreground focus:outline-none transition-all"
                style={{ borderColor: `${cfg.accent}60` }}
                onFocus={e => (e.target.style.boxShadow = `0 0 0 2px ${cfg.accent}40`)}
                onBlur={e => (e.target.style.boxShadow = "none")} />
            </div>
          )}
          {(action.mode === "delete" || action.mode === "reset") && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-sm" style={{ background: cfg.light, color: cfg.textColor }}>
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="leading-relaxed">
                {action.mode === "delete"
                  ? isPastDate ? "Cette ligne sera supprimée du snapshot historique. Action irréversible." : "Cette ligne sera archivée. Les transactions passées restent intactes."
                  : "La valeur sera remise à 0. Les transactions passées restent intactes."}
              </p>
            </div>
          )}
          {error && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-border text-muted-foreground hover:bg-muted transition-colors">Annuler</button>
            <button onClick={handleSubmit} disabled={loading}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60 ${cfg.btn}`}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {cfg.btnLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── CARD SUPERVISEUR ─────────────────────────────────────────────────────────

const SupervisorCardComponent = ({
  card, onRefresh, targetDate,
}: {
  card: SupervisorCard; onRefresh: () => void; targetDate?: string;
}) => {
  const [expanded, setExpanded]         = useState(true);
  const [activeAction, setActiveAction] = useState<ActiveAction | null>(null);

  const systemKeys  = Object.keys(card.comptes.debut).filter(k => !k.startsWith("part-"));
  const partnerKeys = [...new Set([...Object.keys(card.comptes.debut), ...Object.keys(card.comptes.sortie)].filter(k => k.startsWith("part-")))];

  type RowEntry = { key: string; label: string; montant: number };
  const makeRows = (side: "debut" | "sortie"): RowEntry[] => [
    ...systemKeys.map(k  => ({ key: k, label: k,                      montant: card.comptes[side][k] ?? 0 })),
    ...partnerKeys.map(k => ({ key: k, label: k.replace("part-", ""), montant: card.comptes[side][k] ?? 0 })),
  ].filter(r => r.montant > 0);

  const debutRows = makeRows("debut");
  const finRows   = makeRows("sortie");
  const rows      = Array.from({ length: Math.max(debutRows.length, finRows.length) }, (_, i) => ({
    debut: debutRows[i] || null, fin: finRows[i] || null,
  }));
  const grPositive = card.totaux.grTotal >= 0;

  const open = (lineType: LineType, key: string, val: number, mode: ActionMode) =>
    setActiveAction({ supervisorId: card.id, lineType, accountKey: key, currentValue: val, mode, targetDate });

  const handleSuccess = () => { setActiveAction(null); onRefresh(); };

  const ActionButtons = ({ lineType, rowKey, montant }: { lineType: LineType; rowKey: string; montant: number }) => (
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-150 flex-shrink-0">
      <button title="Modifier" onClick={e => { e.stopPropagation(); open(lineType, rowKey, montant, "edit"); }}
        className="p-1 sm:p-1.5 rounded-lg hover:bg-emerald-100 text-zinc-400 hover:text-emerald-600 transition-colors">
        <Pencil className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
      </button>
      {!targetDate && (
        <button title="Réinitialiser à zéro" onClick={e => { e.stopPropagation(); open(lineType, rowKey, montant, "reset"); }}
          className="p-1 sm:p-1.5 rounded-lg hover:bg-amber-100 text-zinc-400 hover:text-amber-500 transition-colors">
          <RotateCcw className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
        </button>
      )}
      <button title="Supprimer" onClick={e => { e.stopPropagation(); open(lineType, rowKey, montant, "delete"); }}
        className="p-1 sm:p-1.5 rounded-lg hover:bg-red-100 text-zinc-400 hover:text-red-500 transition-colors">
        <Trash2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
      </button>
    </div>
  );

  return (
    <>
      {activeAction && <ActionPopover action={activeAction} onClose={() => setActiveAction(null)} onSuccess={handleSuccess} />}
      <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in">

        {/* ── EN-TÊTE ── */}
        <div
          className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 cursor-pointer hover:bg-muted/30 transition-colors gap-2"
          onClick={() => setExpanded(v => !v)}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-sm truncate">{card.nom}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${card.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                {card.status === "ACTIVE" ? "Actif" : "Suspendu"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <div className="text-right">
              <p className="text-[10px] sm:text-xs text-muted-foreground">GR Total</p>
              <p className={`text-sm sm:text-base font-extrabold tabular-nums ${grPositive ? "text-green-600" : "text-red-500"}`}>
                {grPositive ? "+" : ""}{fmt(card.totaux.grTotal)}
              </p>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 ${expanded ? "rotate-180" : ""}`} />
          </div>
        </div>

        {expanded && (
          <div className="border-t border-border">

            {/* ── HEADERS DÉBUT / FIN ── */}
            <div className="grid grid-cols-2">
              <div className="px-3 sm:px-5 py-2 border-r border-border border-b-2 border-b-green-400" style={{ background: "rgba(34,197,94,0.06)" }}>
                <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase text-green-700">● Début</span>
              </div>
              <div className="px-3 sm:px-5 py-2 border-b-2 border-b-blue-400" style={{ background: "rgba(59,130,246,0.06)" }}>
                <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase text-blue-700">● Fin</span>
              </div>
            </div>

            {/* ── SOUS-HEADERS ── */}
            <div className="grid grid-cols-2 bg-muted/20 border-b border-border">
              {(["Début", "Fin"] as const).map((label, idx) => (
                <div key={label} className={`flex justify-between px-3 sm:px-5 py-1.5 text-[9px] sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-wider ${idx === 0 ? "border-r border-border" : ""}`}>
                  <span>Type / Partenaire</span><span>Montant</span>
                </div>
              ))}
            </div>

            {/* ── LIGNES ── */}
            {rows.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Aucune donnée pour cette période</div>
            ) : rows.map((row, i) => (
              <div key={i} className="grid grid-cols-2 border-b border-border last:border-0">

                {/* Colonne Début */}
                <div className="group flex items-center justify-between px-2 sm:px-5 py-2 sm:py-3 border-r border-border hover:bg-green-50/60 transition-colors min-w-0 overflow-hidden gap-1">
                  {row.debut ? (
                    <>
                      <span className="flex items-center gap-1 text-foreground min-w-0 flex-1 overflow-hidden">
                        <PeopleIcon />
                        <span className="text-[11px] sm:text-sm truncate">{row.debut.label}</span>
                      </span>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <span className="text-[10px] sm:text-sm font-semibold text-foreground tabular-nums whitespace-nowrap">{fmt(row.debut.montant)}</span>
                        <ActionButtons lineType="debut" rowKey={row.debut.key} montant={row.debut.montant} />
                      </div>
                    </>
                  ) : <span className="w-full" />}
                </div>

                {/* Colonne Fin */}
                <div className="group flex items-center justify-between px-2 sm:px-5 py-2 sm:py-3 hover:bg-blue-50/60 transition-colors min-w-0 overflow-hidden gap-1">
                  {row.fin ? (
                    <>
                      <span className="flex items-center gap-1 text-foreground min-w-0 flex-1 overflow-hidden">
                        <PeopleIcon />
                        <span className="text-[11px] sm:text-sm truncate">{row.fin.label}</span>
                      </span>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <span className="text-[10px] sm:text-sm font-semibold text-foreground tabular-nums whitespace-nowrap">{fmt(row.fin.montant)}</span>
                        <ActionButtons lineType="sortie" rowKey={row.fin.key} montant={row.fin.montant} />
                      </div>
                    </>
                  ) : <span className="w-full" />}
                </div>

              </div>
            ))}

            {/* ── FOOTER TOTAUX ── */}
            <div className="grid grid-cols-3 border-t-2 border-border">
              <div className="px-2 sm:px-5 py-3 sm:py-4 text-center border-r border-border" style={{ background: "rgba(34,197,94,0.07)" }}>
                <p className="text-[9px] sm:text-[10px] font-bold tracking-widest uppercase text-green-700 mb-1">Début</p>
                <p className="text-xs sm:text-base font-extrabold tabular-nums text-green-800 break-all leading-tight">{fmt(card.totaux.debutTotal)}</p>
              </div>
              <div className="px-2 sm:px-5 py-3 sm:py-4 text-center bg-green-500">
                <p className="text-[9px] sm:text-[10px] font-bold tracking-widest uppercase text-green-100 mb-1">GR Total</p>
                <p className="text-xs sm:text-base font-extrabold text-white tabular-nums break-all leading-tight">{fmt(card.totaux.grTotal)}</p>
              </div>
              <div className="px-2 sm:px-5 py-3 sm:py-4 text-center border-l border-border" style={{ background: "rgba(59,130,246,0.07)" }}>
                <p className="text-[9px] sm:text-[10px] font-bold tracking-widest uppercase text-blue-700 mb-1">Fin</p>
                <p className="text-xs sm:text-base font-extrabold tabular-nums text-blue-800 break-all leading-tight">{fmt(card.totaux.sortieTotal)}</p>
              </div>
            </div>

          </div>
        )}
      </div>
    </>
  );
};

// ─── DASHBOARD PRINCIPAL ──────────────────────────────────────────────────────

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen]         = useState(false);
  const [showTransaction, setShowTransaction] = useState(false);
  const [period, setPeriod]                   = useState<Period>("today");
  const [customDate, setCustomDate]           = useState("");
  const [showDatePicker, setShowDatePicker]   = useState(false);
  const [tempDate, setTempDate]               = useState("");
  const [dashboard, setDashboard]             = useState<AdminDashboard | null>(null);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [refreshing, setRefreshing]           = useState(false);
  const [supervisorIndex, setSupervisorIndex] = useState(0);
  const [showSupervisorMenu, setShowSupervisorMenu] = useState(false);
  const [refreshKey, setRefreshKey]           = useState(0);

  const user = AuthService.getStoredUser();

  const targetDate = useMemo<string | undefined>(() => {
    if (period === "yesterday") {
      const d = new Date(); d.setDate(d.getDate() - 1);
      return d.toISOString().split("T")[0];
    }
    if (period === "custom" && customDate) return customDate;
    return undefined;
  }, [period, customDate]);

  const fetchDashboard = async (p: Period = period, date = customDate, silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError(null);
    try {
      const data = await TransactionService.getAdminDashboard(p, p === "custom" ? date : undefined);
      setDashboard(data);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Erreur lors du chargement");
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchDashboard(period, customDate); }, [period, customDate]);

  const cards       = dashboard?.supervisorCards ?? [];
  const totalCards  = cards.length;
  const currentCard = cards[supervisorIndex] ?? null;
  const goNext = () => setSupervisorIndex(i => Math.min(i + 1, totalCards - 1));
  const goPrev = () => setSupervisorIndex(i => Math.max(i - 1, 0));

  const periodLabel = useMemo(() => {
    if (period === "custom" && customDate)
      return new Date(customDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
    return PERIODS.find(p => p.value === period)?.label ?? "Aujourd'hui";
  }, [period, customDate]);

  const initials = user?.nomComplet?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() ?? "??";

  const handlePeriodChange = (val: string) => {
    if (val === "custom") { setShowDatePicker(true); return; }
    setPeriod(val as Period); setCustomDate("");
  };

  const handleApplyDate = () => {
    if (!tempDate) return;
    setCustomDate(tempDate); setPeriod("custom"); setShowDatePicker(false);
  };

  const handleCardRefresh = () => fetchDashboard(period, customDate, false);

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />

      <TransactionModal
        isOpen={showTransaction}
        onClose={() => setShowTransaction(false)}
        onSuccess={() => { setShowTransaction(false); fetchDashboard(period, customDate, true); }}
      />

      {/* ── DATE PICKER ── */}
      {showDatePicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDatePicker(false)} />
          <div className="relative bg-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-6 border border-border shadow-xl">
            <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-5 sm:hidden" />
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-500" />
                <h3 className="font-semibold text-foreground">Date personnalisée</h3>
              </div>
              <button onClick={() => setShowDatePicker(false)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <input type="date" value={tempDate} onChange={e => setTempDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              min={new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
              className="w-full px-3 py-2.5 border border-input rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-green-500 mb-4" />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowDatePicker(false)}>Annuler</Button>
              <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white" onClick={handleApplyDate} disabled={!tempDate}>Consulter</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── SUPERVISOR MENU ── */}
      {showSupervisorMenu && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSupervisorMenu(false)} />
          <div className="relative bg-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-5 border border-border shadow-xl max-h-[70vh] flex flex-col">
            <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-4 sm:hidden" />
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-green-500" />
                <h3 className="font-semibold text-foreground">Choisir un superviseur</h3>
              </div>
              <button onClick={() => setShowSupervisorMenu(false)} className="p-1 rounded-lg hover:bg-muted"><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <div className="overflow-y-auto flex-1 space-y-1.5">
              {cards.map((card, idx) => (
                <button key={card.id} onClick={() => { setSupervisorIndex(idx); setShowSupervisorMenu(false); }}
                  className={`w-full text-left p-3 rounded-xl transition-all border-2 ${idx === supervisorIndex ? "bg-green-50 border-green-500" : "bg-muted/40 hover:bg-muted border-transparent"}`}>
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${idx === supervisorIndex ? "text-green-700" : "text-foreground"}`}>{card.nom}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">GR : {card.totaux.grTotal >= 0 ? "+" : ""}{fmt(card.totaux.grTotal)}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-2 ${card.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {card.status === "ACTIVE" ? "Actif" : "Suspendu"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN ── */}
      <main className="flex-1 min-w-0 p-3 sm:p-6 overflow-auto">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">

          {/* Gauche : hamburger + titre */}
          <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-card border border-input hover:bg-muted transition-colors flex-shrink-0"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-2xl font-bold text-foreground leading-tight whitespace-nowrap">
                Tableau de bord 👋
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">Vue globale de tous les superviseurs</p>
            </div>
          </div>

          {/* Droite : contrôles */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Sélecteur période */}
            <div className="relative">
              <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground pointer-events-none" />
              <select
                value={period}
                onChange={e => handlePeriodChange(e.target.value)}
                className="pl-6 sm:pl-8 pr-5 sm:pr-6 py-1.5 sm:py-2 text-[11px] sm:text-sm rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
              >
                {PERIODS.map(p => <option key={p.value} value={p.value}>{p.emoji} {p.label}</option>)}
              </select>
            </div>

            {/* Refresh */}
            <button
              onClick={() => fetchDashboard(period, customDate, true)}
              disabled={refreshing}
              className="p-1.5 sm:p-2 rounded-lg bg-card border border-input hover:bg-muted transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground ${refreshing ? "animate-spin" : ""}`} />
            </button>

            {/* Bell */}
            <button className="relative p-1.5 sm:p-2 rounded-lg bg-card border border-input">
              <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 sm:h-4 sm:w-4 bg-destructive rounded-full text-[9px] text-destructive-foreground flex items-center justify-center font-bold">3</span>
            </button>

            {/* Avatar */}
            <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs sm:text-sm font-bold flex-shrink-0">
              {initials}
            </div>
            <span className="text-sm font-medium text-foreground hidden xl:block">{user?.nomComplet ?? "Admin"}</span>
          </div>
        </div>

        {/* ── BANDEAU DATE CUSTOM ── */}
        {period === "custom" && customDate && (
          <div className="bg-green-50 border-l-4 border-green-400 p-3 rounded-r-lg mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Calendar className="h-4 w-4 text-green-600 flex-shrink-0" />
              <p className="text-green-700 text-xs sm:text-sm font-medium truncate">Données historiques — {periodLabel}</p>
            </div>
            <button onClick={() => { setPeriod("today"); setCustomDate(""); }} className="text-green-600 hover:text-green-800 transition-colors flex-shrink-0 ml-2">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── BANDEAU HIER ── */}
        {period === "yesterday" && (
          <div className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded-r-lg mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
            <p className="text-orange-700 text-xs sm:text-sm font-medium">
              Mode historique — Les modifications s'appliquent sur les données d'hier
            </p>
          </div>
        )}

        {/* ── LOADING ── */}
        {loading && (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Chargement du dashboard...</p>
          </div>
        )}

        {/* ── ERREUR ── */}
        {error && !loading && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
            <p className="text-destructive font-medium mb-3">{error}</p>
            <Button variant="outline" onClick={() => fetchDashboard(period, customDate)}>Réessayer</Button>
          </div>
        )}

        {dashboard && !loading && (
          <>
            {/* ── STATS GLOBALES ── */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
              {/* Début */}
              <div className="bg-card rounded-xl border border-border p-2.5 sm:p-5 animate-fade-in">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-3">
                  <div className="p-1 sm:p-2 rounded-lg bg-green-100 flex-shrink-0">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                  </div>
                  <span className="text-[9px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:block">Total Début</span>
                </div>
                <p className="text-xs sm:text-2xl font-extrabold text-foreground tabular-nums break-all leading-tight">
                  {fmt(dashboard.globalTotals.debutTotalGlobal)}
                </p>
                <p className="text-[9px] text-muted-foreground mt-0.5 sm:hidden font-medium">Début</p>
              </div>

              {/* GR Total */}
              <div className="bg-green-500 rounded-xl p-2.5 sm:p-5 animate-fade-in">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-3">
                  <div className="p-1 sm:p-2 rounded-lg bg-white/20 flex-shrink-0">
                    <Minus className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                  </div>
                  <span className="text-[9px] sm:text-xs font-semibold text-green-100 uppercase tracking-wider hidden sm:block">GR Total Global</span>
                </div>
                <p className="text-xs sm:text-2xl font-extrabold text-white tabular-nums break-all leading-tight">
                  {fmt(dashboard.globalTotals.grTotalGlobal)}
                </p>
                <p className="text-[9px] text-green-100 mt-0.5 sm:hidden font-medium">GR Total</p>
              </div>

              {/* Fin */}
              <div className="bg-card rounded-xl border border-border p-2.5 sm:p-5 animate-fade-in">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-3">
                  <div className="p-1 sm:p-2 rounded-lg bg-blue-100 flex-shrink-0">
                    <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                  </div>
                  <span className="text-[9px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:block">Total Fin</span>
                </div>
                <p className="text-xs sm:text-2xl font-extrabold text-foreground tabular-nums break-all leading-tight">
                  {fmt(dashboard.globalTotals.sortieTotalGlobal)}
                </p>
                <p className="text-[9px] text-muted-foreground mt-0.5 sm:hidden font-medium">Fin</p>
              </div>
            </div>

            {/* ── UV MASTER ── */}
            {dashboard.globalTotals.uvMaster.sorties > 0 && (
              <div className="bg-card rounded-xl border border-border p-3 sm:p-4 mb-4 sm:mb-5 flex items-center justify-between animate-fade-in gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg">⭐</span>
                  <span className="text-xs sm:text-sm font-semibold text-foreground">UV Master</span>
                </div>
                <div className="flex items-center gap-3 sm:gap-6">
                  <div className="text-right">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Solde</p>
                    <StatBadge value={dashboard.globalTotals.uvMaster.solde} color="green" />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Sorties</p>
                    <StatBadge value={dashboard.globalTotals.uvMaster.sorties} color="blue" />
                  </div>
                </div>
              </div>
            )}

            {/* ── NAVIGATION SUPERVISEUR ── */}
            {totalCards > 0 && (
              <div className="flex items-center justify-between gap-1.5 sm:gap-3 mb-3 sm:mb-4">
                <button onClick={goPrev} disabled={supervisorIndex === 0}
                  className="p-1.5 sm:p-2 rounded-lg border border-input bg-card hover:bg-muted disabled:opacity-30 transition-colors flex-shrink-0">
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </button>

                <button onClick={() => setShowSupervisorMenu(true)}
                  className="flex-1 flex items-center justify-between gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-input bg-card hover:bg-green-50 hover:border-green-300 transition-all min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-foreground truncate">{currentCard?.nom ?? "—"}</span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground flex-shrink-0">{supervisorIndex + 1}/{totalCards}</span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                </button>

                <button onClick={goNext} disabled={supervisorIndex === totalCards - 1}
                  className="p-1.5 sm:p-2 rounded-lg border border-input bg-card hover:bg-muted disabled:opacity-30 transition-colors flex-shrink-0">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>

                <Button
                  onClick={() => setShowTransaction(true)}
                  className="gap-1 sm:gap-2 flex-shrink-0 px-2.5 sm:px-4 text-xs sm:text-sm h-8 sm:h-10"
                >
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Ajouter Transaction</span>
                  <span className="sm:hidden">Ajouter</span>
                </Button>
              </div>
            )}

            {/* ── CARD SUPERVISEUR ── */}
            {currentCard ? (
              <SupervisorCardComponent
                key={`${currentCard.id}-${refreshKey}`}
                card={currentCard}
                onRefresh={handleCardRefresh}
                targetDate={targetDate}
              />
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Aucun superviseur actif pour cette période</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;