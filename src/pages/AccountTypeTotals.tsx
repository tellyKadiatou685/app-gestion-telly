// src/pages/AccountTypeTotals.tsx
// ✅ Aucun appel backend supplémentaire — réutilise getAdminDashboard exactement comme Dashboard.tsx

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardSidebar from "@/components/DashboardSidebar";
import {
  TrendingUp, TrendingDown, Minus, RefreshCw,
  Calendar, Loader2, X, AlertTriangle, Menu,
  BarChart2, Table2, Globe, ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import TransactionService from "@/services/TransactionService";
import type { AdminDashboard, SupervisorCard, Period } from "@/types/transaction.types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) => Math.abs(n).toLocaleString("fr-FR") + "\u202FF";
const fmtSigned = (n: number) => (n >= 0 ? "+" : "−") + fmt(n);

const PERIODS: { value: string; label: string }[] = [
  { value: "today",     label: "Aujourd'hui" },
  { value: "yesterday", label: "Hier"         },
  { value: "custom",    label: "Date..."       },
];

const TYPE_COLORS: Record<string, string> = {
  LIQUIDE:          "#1D9E75",
  ORANGE_MONEY:     "#D85A30",
  WAVE:             "#185FA5",
  UV_MASTER:        "#7F77DD",
  FREE_MONEY:       "#BA7517",
  WESTERN_UNION:    "#D4537E",
  RIA:              "#3B6D11",
  MONEYGRAM:        "#378ADD",
  __PARTENAIRES__:  "#888780",
};
const FALLBACK = ["#5DCAA5","#85B7EB","#EF9F27","#97C459","#F09595","#AFA9EC"];
const getColor = (type: string, i: number) => TYPE_COLORS[type] ?? FALLBACK[i % FALLBACK.length];

// ─── Types transferts internationaux ─────────────────────────────────────────

const INTERNATIONAL_TYPES = ["WESTERN_UNION", "RIA", "MONEYGRAM"] as const;
type InternationalType = (typeof INTERNATIONAL_TYPES)[number];

const INTL_META: Record<InternationalType, { label: string; color: string; bg: string; border: string; text: string }> = {
  WESTERN_UNION: {
    label:  "Western Union",
    color:  "#D4537E",
    bg:     "bg-pink-50",
    border: "border-pink-200",
    text:   "text-pink-800",
  },
  RIA: {
    label:  "Ria",
    color:  "#3B6D11",
    bg:     "bg-green-50",
    border: "border-green-200",
    text:   "text-green-800",
  },
  MONEYGRAM: {
    label:  "MoneyGram",
    color:  "#378ADD",
    bg:     "bg-blue-50",
    border: "border-blue-200",
    text:   "text-blue-800",
  },
};

interface IntlProviderStats {
  debut:  number;
  sortie: number;
  net:    number;
}

interface IntlTotals {
  byProvider: Record<InternationalType, IntlProviderStats>;
  global:     IntlProviderStats;
}

// ─── Agrégation transferts internationaux ────────────────────────────────────

function computeIntlTotals(cards: SupervisorCard[]): IntlTotals {
  const byProvider = Object.fromEntries(
    INTERNATIONAL_TYPES.map((t) => [t, { debut: 0, sortie: 0, net: 0 }])
  ) as Record<InternationalType, IntlProviderStats>;

  for (const card of cards) {
    for (const type of INTERNATIONAL_TYPES) {
      const debut  = (card.comptes?.debut  as any)?.[type] ?? 0;
      const sortie = ((card.comptes as any)?.sortie ?? (card.comptes as any)?.fin)?.[type] ?? 0;
      byProvider[type].debut  += debut;
      byProvider[type].sortie += sortie;
      byProvider[type].net    += debut - sortie;
    }
  }

  const global = INTERNATIONAL_TYPES.reduce(
    (acc, t) => ({
      debut:  acc.debut  + byProvider[t].debut,
      sortie: acc.sortie + byProvider[t].sortie,
      net:    acc.net    + byProvider[t].net,
    }),
    { debut: 0, sortie: 0, net: 0 }
  );

  return { byProvider, global };
}

// ─── Agrégation globale par type ──────────────────────────────────────────────

interface TypeRow {
  type:         string;
  label:        string;
  debut:        number;
  fin:          number;
  gr:           number;
  superviseurs: number;
}

const TYPE_LABELS: Record<string, string> = {
  LIQUIDE:          "Liquide",
  ORANGE_MONEY:     "Orange Money",
  WAVE:             "Wave",
  UV_MASTER:        "UV Master",
  FREE_MONEY:       "Free Money",
  WESTERN_UNION:    "Western Union",
  RIA:              "Ria",
  MONEYGRAM:        "MoneyGram",
  __PARTENAIRES__:  "Partenaires libres",
};

function aggregateByType(cards: SupervisorCard[]): TypeRow[] {
  const map: Record<string, { debut: number; fin: number; sups: Set<string> }> = {};

  const ensure = (key: string) => {
    if (!map[key]) map[key] = { debut: 0, fin: 0, sups: new Set() };
  };

  for (const card of cards) {
    for (const [key, val] of Object.entries(card.comptes?.debut ?? {})) {
      if (!val) continue;
      const bucket = key.startsWith("part-") ? "__PARTENAIRES__" : key;
      ensure(bucket);
      map[bucket].debut += val as number;
      map[bucket].sups.add(card.id);
    }
    const finObj = (card.comptes as any)?.sortie ?? (card.comptes as any)?.fin ?? {};
    for (const [key, val] of Object.entries(finObj)) {
      if (!val) continue;
      const bucket = key.startsWith("part-") ? "__PARTENAIRES__" : key;
      ensure(bucket);
      map[bucket].fin += val as number;
      map[bucket].sups.add(card.id);
    }
  }

  return Object.entries(map)
    .map(([type, agg]) => ({
      type,
      label:        TYPE_LABELS[type] ?? type,
      debut:        agg.debut,
      fin:          agg.fin,
      gr:           agg.debut - agg.fin,
      superviseurs: agg.sups.size,
    }))
    .sort((a, b) => b.debut - a.debut);
}

// ─── Barre horizontale ────────────────────────────────────────────────────────

const HBar = ({
  label, value, max, color, signed = false,
}: {
  label: string; value: number; max: number; color: string; signed?: boolean;
}) => {
  const pct = max === 0 ? 0 : Math.round((Math.abs(value) / max) * 100);
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <span className="text-xs text-muted-foreground truncate w-28 flex-shrink-0">{label}</span>
      <div className="flex-1 bg-muted/40 rounded-full h-3 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs tabular-nums text-foreground w-24 text-right flex-shrink-0">
        {signed ? fmtSigned(value) : fmt(value)}
      </span>
    </div>
  );
};

// ─── Composant carte opérateur international ──────────────────────────────────

const IntlProviderCard = ({
  type,
  stats,
}: {
  type: InternationalType;
  stats: IntlProviderStats;
}) => {
  const meta = INTL_META[type];
  const hasData = stats.debut > 0 || stats.sortie > 0;

  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-3 ${meta.bg} ${meta.border}`}>
      {/* En-tête */}
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ background: meta.color }}
        />
        <span className={`text-sm font-bold ${meta.text}`}>{meta.label}</span>
      </div>

      {/* Chiffres */}
      {hasData ? (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Début</p>
            <p className={`text-xs sm:text-sm font-extrabold tabular-nums ${meta.text}`}>
              {fmt(stats.debut)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Fin</p>
            <p className={`text-xs sm:text-sm font-extrabold tabular-nums ${meta.text}`}>
              {fmt(stats.sortie)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Net</p>
            <p className={`text-xs sm:text-sm font-extrabold tabular-nums ${stats.net >= 0 ? "text-green-600" : "text-red-500"}`}>
              {fmtSigned(stats.net)}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-1">Aucune donnée</p>
      )}
    </div>
  );
};

// ─── Page ────────────────────────────────────────────────────────────────────

const AccountTypeTotals = () => {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [period, setPeriod]                 = useState<Period>("today");
  const [customDate, setCustomDate]         = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate]             = useState("");
  const [dashboard, setDashboard]           = useState<AdminDashboard | null>(null);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [refreshing, setRefreshing]         = useState(false);
  const [view, setView]                     = useState<"table" | "charts">("table");

  // ✅ Même appel exact que Dashboard.tsx — getAdminDashboard
  const fetchDashboard = async (p: Period = period, date = customDate, silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError(null);
    try {
      const data = await TransactionService.getAdminDashboard(p, p === "custom" ? date : undefined);
      setDashboard(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Erreur lors du chargement");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchDashboard(period, customDate); }, [period, customDate]);

  const handlePeriodChange = (val: string) => {
    if (val === "custom") { setShowDatePicker(true); return; }
    setPeriod(val as Period);
    setCustomDate("");
  };

  const handleApplyDate = () => {
    if (!tempDate) return;
    setCustomDate(tempDate);
    setPeriod("custom");
    setShowDatePicker(false);
  };

  // ✅ Agrégation pure frontend — zéro appel backend supplémentaire
  const rows = useMemo<TypeRow[]>(() => {
    if (!dashboard) return [];
    return aggregateByType(dashboard.supervisorCards ?? []);
  }, [dashboard]);

  // ✅ Totaux internationaux — pure frontend
  const intlTotals = useMemo<IntlTotals | null>(() => {
    if (!dashboard) return null;
    return computeIntlTotals(dashboard.supervisorCards ?? []);
  }, [dashboard]);

  const totalDebut = rows.reduce((s, r) => s + r.debut, 0);
  const totalFin   = rows.reduce((s, r) => s + r.fin,   0);
  const totalGR    = totalDebut - totalFin;
  const maxDebut   = Math.max(...rows.map(r => r.debut), 1);
  const maxFin     = Math.max(...rows.map(r => r.fin),   1);
  const maxGR      = Math.max(...rows.map(r => Math.abs(r.gr)), 1);

  const periodLabel = useMemo(() => {
    if (period === "custom" && customDate)
      return new Date(customDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
    return PERIODS.find(p => p.value === period)?.label ?? "Aujourd'hui";
  }, [period, customDate]);

  // Vrai si au moins un opérateur a des données
  const hasIntlData = intlTotals
    ? INTERNATIONAL_TYPES.some(
        (t) => intlTotals.byProvider[t].debut > 0 || intlTotals.byProvider[t].sortie > 0
      )
    : false;

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />

      {/* ── Date picker ── */}
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
              <button onClick={() => setShowDatePicker(false)} className="p-1 rounded-lg hover:bg-muted">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <input
              type="date" value={tempDate} onChange={e => setTempDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              min={new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
              className="w-full px-3 py-2.5 border border-input rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-green-500 mb-4"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowDatePicker(false)}>Annuler</Button>
              <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white" onClick={handleApplyDate} disabled={!tempDate}>
                Consulter
              </Button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0 p-3 sm:p-6 overflow-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-card border border-input hover:bg-muted transition-colors flex-shrink-0"
            >
              <Menu className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-2xl font-bold text-foreground leading-tight whitespace-nowrap">
                Totaux par type 📊
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                Sommes agrégées sur tous les superviseurs — {periodLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">

            {/* ── BOUTON NAVIGATION CUMUL ANALYTICS ── */}
            <button
              onClick={() => navigate("/admin/cumul")}
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold border transition-all duration-200
                bg-indigo-50 border-indigo-200 text-indigo-700
                hover:bg-indigo-600 hover:text-white hover:border-indigo-600 hover:shadow-sm
                active:scale-95"
              title="Voir l'analyse cumulative (F1/F2 + Internationaux)"
            >
              <BarChart2 className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="hidden sm:inline">Analyse cumulative</span>
              <span className="sm:hidden">Cumul</span>
              <ArrowUpRight className="h-3 w-3 flex-shrink-0 opacity-60" />
            </button>

            <div className="relative">
              <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <select
                value={period}
                onChange={e => handlePeriodChange(e.target.value)}
                className="pl-8 pr-6 py-2 text-sm rounded-lg border border-input bg-card text-foreground focus:outline-none appearance-none cursor-pointer"
              >
                {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <button
              onClick={() => fetchDashboard(period, customDate, true)}
              disabled={refreshing}
              className="p-2 rounded-lg bg-card border border-input hover:bg-muted transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 text-muted-foreground ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* ── Bandeaux période ── */}
        {period === "custom" && customDate && (
          <div className="bg-green-50 border-l-4 border-green-400 p-3 rounded-r-lg mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-600 flex-shrink-0" />
              <p className="text-green-700 text-xs sm:text-sm font-medium">Données historiques — {periodLabel}</p>
            </div>
            <button onClick={() => { setPeriod("today"); setCustomDate(""); }}>
              <X className="h-4 w-4 text-green-600" />
            </button>
          </div>
        )}
        {period === "yesterday" && (
          <div className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded-r-lg mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
            <p className="text-orange-700 text-xs sm:text-sm font-medium">Mode historique — données d'hier</p>
          </div>
        )}

        {/* ── Loading / Error ── */}
        {loading && (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Chargement...</p>
          </div>
        )}
        {error && !loading && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
            <p className="text-destructive font-medium mb-3">{error}</p>
            <Button variant="outline" onClick={() => fetchDashboard(period, customDate)}>Réessayer</Button>
          </div>
        )}

        {dashboard && !loading && (
          <>
            {/* ── Cartes globales ── */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
              <div className="bg-card rounded-xl border border-border p-2.5 sm:p-5 animate-fade-in">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-3">
                  <div className="p-1 sm:p-2 rounded-lg bg-green-100 flex-shrink-0">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                  </div>
                  <span className="text-[9px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:block">Total Début</span>
                </div>
                <p className="text-xs sm:text-2xl font-extrabold text-foreground tabular-nums break-all leading-tight">{fmt(totalDebut)}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5 sm:hidden font-medium">Début</p>
              </div>

              <div className="bg-green-500 rounded-xl p-2.5 sm:p-5 animate-fade-in">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-3">
                  <div className="p-1 sm:p-2 rounded-lg bg-white/20 flex-shrink-0">
                    <Minus className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                  </div>
                  <span className="text-[9px] sm:text-xs font-semibold text-green-100 uppercase tracking-wider hidden sm:block">GR Total</span>
                </div>
                <p className="text-xs sm:text-2xl font-extrabold text-white tabular-nums break-all leading-tight">{fmt(totalGR)}</p>
                <p className="text-[9px] text-green-100 mt-0.5 sm:hidden font-medium">GR</p>
              </div>

              <div className="bg-card rounded-xl border border-border p-2.5 sm:p-5 animate-fade-in">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-3">
                  <div className="p-1 sm:p-2 rounded-lg bg-blue-100 flex-shrink-0">
                    <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                  </div>
                  <span className="text-[9px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:block">Total Fin</span>
                </div>
                <p className="text-xs sm:text-2xl font-extrabold text-foreground tabular-nums break-all leading-tight">{fmt(totalFin)}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5 sm:hidden font-medium">Fin</p>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                ── SECTION TRANSFERTS INTERNATIONAUX ──
                Pure frontend — données issues de supervisorCards[].comptes
            ══════════════════════════════════════════════════════════════════ */}
            {intlTotals && (
              <div className="mb-4 sm:mb-6 bg-card rounded-xl border border-border overflow-hidden animate-fade-in">
                {/* En-tête section */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-muted/20">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-100">
                      <Globe className="h-3.5 w-3.5 text-indigo-600" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-foreground">Transferts internationaux</span>
                      <span className="ml-2 text-[10px] text-muted-foreground hidden sm:inline">
                        Western Union · Ria · MoneyGram
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Total net global des 3 opérateurs */}
                    {hasIntlData && (
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Net global</p>
                        <p className={`text-sm font-extrabold tabular-nums ${intlTotals.global.net >= 0 ? "text-green-600" : "text-red-500"}`}>
                          {fmtSigned(intlTotals.global.net)}
                        </p>
                      </div>
                    )}

                    {/* ── BOUTON VOIR CUMUL DANS LA SECTION INTERNATIONALE ── */}
                    <button
                      onClick={() => navigate("/admin/cumul")}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all duration-200
                        bg-indigo-50 border-indigo-200 text-indigo-600
                        hover:bg-indigo-600 hover:text-white hover:border-indigo-600
                        active:scale-95"
                      title="Voir les cumuls sur plusieurs jours / mois / 1 an"
                    >
                      <span className="hidden sm:inline">Voir cumuls</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Cartes par opérateur */}
                <div className="p-3 sm:p-4">
                  {hasIntlData ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {INTERNATIONAL_TYPES.map((type) => (
                          <IntlProviderCard
                            key={type}
                            type={type}
                            stats={intlTotals.byProvider[type]}
                          />
                        ))}
                      </div>

                      {/* Ligne de totaux cumulés */}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-4 py-3 rounded-xl bg-muted/30 border border-border">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Cumul 3 opérateurs
                        </span>
                        <div className="flex items-center gap-4 sm:gap-6">
                          <div className="text-center">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Début</p>
                            <p className="text-xs sm:text-sm font-extrabold tabular-nums text-foreground">
                              {fmt(intlTotals.global.debut)}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Fin</p>
                            <p className="text-xs sm:text-sm font-extrabold tabular-nums text-foreground">
                              {fmt(intlTotals.global.sortie)}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Net</p>
                            <p className={`text-xs sm:text-sm font-extrabold tabular-nums ${intlTotals.global.net >= 0 ? "text-green-600" : "text-red-500"}`}>
                              {fmtSigned(intlTotals.global.net)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                      <Globe className="h-8 w-8 opacity-30" />
                      <p className="text-sm">Aucun transfert international pour cette période</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* ═════════════════════════════════════════════════════════════════ */}

            {/* ── Toggle vue ── */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setView("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                  view === "table"
                    ? "bg-card border-green-400 text-green-700"
                    : "bg-card border-input text-muted-foreground hover:bg-muted"
                }`}
              >
                <Table2 className="h-3.5 w-3.5" /> Tableau
              </button>
              <button
                onClick={() => setView("charts")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                  view === "charts"
                    ? "bg-card border-green-400 text-green-700"
                    : "bg-card border-input text-muted-foreground hover:bg-muted"
                }`}
              >
                <BarChart2 className="h-3.5 w-3.5" /> Graphiques
              </button>
            </div>

            {rows.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-sm">
                Aucune donnée pour cette période
              </div>
            ) : view === "table" ? (

              /* ── VUE TABLEAU ── */
              <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type de compte</th>
                        <th className="text-right px-4 sm:px-6 py-3 text-xs font-semibold text-green-700 uppercase tracking-wider">● Début</th>
                        <th className="text-right px-4 sm:px-6 py-3 text-xs font-semibold text-blue-700 uppercase tracking-wider">● Fin</th>
                        <th className="text-right px-4 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">GR</th>
                        <th className="text-right px-4 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Superviseurs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => {
                        const color = getColor(row.type, i);
                        const isIntl = (INTERNATIONAL_TYPES as readonly string[]).includes(row.type);
                        return (
                          <tr
                            key={row.type}
                            className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${isIntl ? "bg-indigo-50/30" : ""}`}
                          >
                            <td className="px-4 sm:px-6 py-3 sm:py-4">
                              <div className="flex items-center gap-2">
                                <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                                <span className="font-medium text-foreground">{row.label}</span>
                                {isIntl && (
                                  <span className="hidden sm:inline-block text-[9px] font-bold text-indigo-500 bg-indigo-50 border border-indigo-200 rounded-full px-1.5 py-0.5 uppercase tracking-wider">
                                    Intl
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4 text-right">
                              {row.debut > 0
                                ? <span className="inline-block bg-green-50 text-green-800 border border-green-200 rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums">{fmt(row.debut)}</span>
                                : <span className="text-muted-foreground text-xs">—</span>}
                            </td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4 text-right">
                              {row.fin > 0
                                ? <span className="inline-block bg-blue-50 text-blue-800 border border-blue-200 rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums">{fmt(row.fin)}</span>
                                : <span className="text-muted-foreground text-xs">—</span>}
                            </td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4 text-right">
                              <span className={`text-sm font-bold tabular-nums ${row.gr >= 0 ? "text-green-600" : "text-red-500"}`}>
                                {fmtSigned(row.gr)}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4 text-right text-muted-foreground text-sm hidden sm:table-cell">
                              {row.superviseurs}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/30">
                        <td className="px-4 sm:px-6 py-3 font-bold text-foreground text-sm">TOTAL</td>
                        <td className="px-4 sm:px-6 py-3 text-right">
                          <span className="inline-block bg-green-500 text-white rounded-full px-3 py-0.5 text-xs font-extrabold tabular-nums">{fmt(totalDebut)}</span>
                        </td>
                        <td className="px-4 sm:px-6 py-3 text-right">
                          <span className="inline-block bg-blue-500 text-white rounded-full px-3 py-0.5 text-xs font-extrabold tabular-nums">{fmt(totalFin)}</span>
                        </td>
                        <td className="px-4 sm:px-6 py-3 text-right">
                          <span className={`text-sm font-extrabold tabular-nums ${totalGR >= 0 ? "text-green-600" : "text-red-500"}`}>
                            {fmtSigned(totalGR)}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

            ) : (

              /* ── VUE GRAPHIQUES ── */
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-card rounded-xl border border-border p-4 sm:p-5">
                    <p className="text-xs font-bold text-green-700 uppercase tracking-widest mb-4">● Début par type</p>
                    {rows.filter(r => r.debut > 0).map((r, i) => (
                      <HBar key={r.type} label={r.label} value={r.debut} max={maxDebut} color={getColor(r.type, i)} />
                    ))}
                  </div>
                  <div className="bg-card rounded-xl border border-border p-4 sm:p-5">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-4">● Fin par type</p>
                    {rows.filter(r => r.fin > 0).map((r, i) => (
                      <HBar key={r.type} label={r.label} value={r.fin} max={maxFin} color={getColor(r.type, i)} />
                    ))}
                  </div>
                </div>

                <div className="bg-card rounded-xl border border-border p-4 sm:p-5">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">GR (Début − Fin) par type</p>
                  <p className="text-xs text-muted-foreground mb-4">Vert = positif · Rouge = négatif</p>
                  {rows.map((r, i) => (
                    <HBar key={r.type} label={r.label} value={r.gr} max={maxGR} color={r.gr >= 0 ? "#1D9E75" : "#E24B4A"} signed />
                  ))}
                </div>

                <div className="bg-card rounded-xl border border-border p-4 sm:p-5">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Légende</p>
                  <div className="flex flex-wrap gap-3">
                    {rows.map((r, i) => (
                      <div key={r.type} className="flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: getColor(r.type, i) }} />
                        <span className="text-xs text-foreground">{r.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default AccountTypeTotals;