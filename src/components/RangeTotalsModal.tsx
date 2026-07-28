// src/components/RangeTotalsModal.tsx
//
// Modal dédié aux totaux CUMULÉS d'un ou plusieurs superviseurs sur une plage
// de dates. Composant 100% additif : n'importe et ne modifie aucun état
// existant du Dashboard. Utilise DateRangeService (fichier séparé).
//
// Nouveautés vs version précédente :
//  - On peut choisir "Tous les superviseurs" OU un seul superviseur.
//  - Vue "Tous" -> tableau récapitulatif (1 ligne par superviseur + total),
//    avec une ligne dépliable pour voir le détail des comptes/partenaires.
//  - Vue "Un seul" -> détail complet (comme avant), mais présenté en vrai
//    tableau, plus lisible.
//  - Modal nettement agrandi (large écran) pour que le tableau respire.

import { useMemo, useState } from "react";
import {
  X,
  Calendar,
  Loader2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronRight,
  Users,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import DateRangeService from "@/services/DateRangeService";
import type { SupervisorRangeTotalsResult } from "@/types/dateRange.types";

// On réutilise le formatage du service (identique à TransactionService.formatAmount)
// plutôt que de dupliquer la logique ici.
const fmt = (n: number) => DateRangeService.formatAmount(n, false);
const fmtSigned = (n: number) => DateRangeService.formatAmount(n, true);

export interface SupervisorOption {
  id: string;
  name: string;
}

interface RangeTotalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Liste de tous les superviseurs sélectionnables dans le modal. */
  supervisors?: SupervisorOption[];
  /** Superviseur pré-sélectionné à l'ouverture (optionnel). null/undefined = "Tous". */
  initialSupervisorId?: string | null;
}

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: SupervisorRangeTotalsResult };

const SELECTION_ALL = "__ALL__";

export const RangeTotalsModal = ({
  isOpen,
  onClose,
  supervisors = [],
  initialSupervisorId = null,
}: RangeTotalsModalProps) => {
  const [selectedId, setSelectedId] = useState<string>(
    initialSupervisorId ?? SELECTION_ALL
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<Record<string, FetchState>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isAllMode = selectedId === SELECTION_ALL;
  const targetSupervisors = isAllMode
    ? supervisors
    : supervisors.filter((s) => s.id === selectedId);

  const handleSearch = async () => {
    if (!startDate || !endDate || targetSupervisors.length === 0) return;
    setLoading(true);
    setHasSearched(true);
    setExpandedId(null);

    const initial: Record<string, FetchState> = {};
    targetSupervisors.forEach((s) => (initial[s.id] = { status: "loading" }));
    setResults(initial);

    await Promise.all(
      targetSupervisors.map(async (s) => {
        try {
          const data = await DateRangeService.getSupervisorRangeTotals({
            supervisorId: s.id,
            startDate,
            endDate,
          });
          setResults((prev) => ({ ...prev, [s.id]: { status: "success", data } }));
        } catch (e: any) {
          setResults((prev) => ({
            ...prev,
            [s.id]: {
              status: "error",
              message: e?.response?.data?.message || e?.message || "Erreur lors du chargement",
            },
          }));
        }
      })
    );

    setLoading(false);
  };

  const handleClose = () => {
    setStartDate("");
    setEndDate("");
    setResults({});
    setHasSearched(false);
    setExpandedId(null);
    onClose();
  };

  const successResults = useMemo(
    () =>
      targetSupervisors
        .map((s) => ({ supervisor: s, state: results[s.id] }))
        .filter((r): r is { supervisor: SupervisorOption; state: Extract<FetchState, { status: "success" }> } =>
          r.state?.status === "success"
        ),
    [targetSupervisors, results]
  );

  const grandTotals = useMemo(() => {
    return successResults.reduce(
      (acc, { state }) => {
        acc.debutTotal += state.data.totaux.debutTotal;
        acc.grTotal += state.data.totaux.grTotal;
        acc.sortieTotal += state.data.totaux.sortieTotal;
        acc.daysFound = Math.max(acc.daysFound, state.data.daysFound);
        return acc;
      },
      { debutTotal: 0, grTotal: 0, sortieTotal: 0, daysFound: 0 }
    );
  }, [successResults]);

  const anyLoading = targetSupervisors.some((s) => results[s.id]?.status === "loading");

  // IMPORTANT : ce return conditionnel doit rester APRÈS tous les hooks
  // (useState / useMemo) ci-dessus, sinon React casse les Rules of Hooks
  // dès que isOpen passe de false à true (nombre de hooks qui change).
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-5xl lg:max-w-6xl h-[92vh] sm:h-auto sm:max-h-[88vh] overflow-hidden flex flex-col border border-border shadow-xl">
        <div className="w-12 h-1 bg-muted rounded-full mx-auto mt-3 mb-1 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-4 pb-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Calendar className="h-4 w-4 text-green-500 flex-shrink-0" />
            <h3 className="font-semibold text-foreground truncate text-base">
              Cumul période
              {!isAllMode && targetSupervisors[0] ? ` — ${targetSupervisors[0].name}` : ""}
              {isAllMode ? " — Tous les superviseurs" : ""}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4">
          {supervisors.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Aucun superviseur disponible.
            </p>
          ) : (
            <>
              {/* Sélecteur de superviseur(s) */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Superviseur
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedId(SELECTION_ALL)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      isAllMode
                        ? "bg-green-500 border-green-500 text-white"
                        : "bg-background border-input text-muted-foreground hover:border-green-500 hover:text-foreground"
                    }`}
                  >
                    <Users className="h-3.5 w-3.5" />
                    Tous ({supervisors.length})
                  </button>
                  {supervisors.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedId(s.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        selectedId === s.id
                          ? "bg-green-500 border-green-500 text-white"
                          : "bg-background border-input text-muted-foreground hover:border-green-500 hover:text-foreground"
                      }`}
                    >
                      <User className="h-3.5 w-3.5" />
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                    Du
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2.5 border border-input rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                    Au
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2.5 border border-input rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground mb-4 -mt-2">
                Les données du jour en cours ne sont pas incluses (elles ne sont
                disponibles qu'après le reset de minuit).
              </p>

              <Button
                className="w-full bg-green-500 hover:bg-green-600 text-white mb-5"
                onClick={handleSearch}
                disabled={!startDate || !endDate || loading || targetSupervisors.length === 0}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Calculer le cumul
              </Button>

              {/* Résultats */}
              {hasSearched && (
                <>
                  {isAllMode ? (
                    <AllSupervisorsTable
                      targetSupervisors={targetSupervisors}
                      results={results}
                      grandTotals={grandTotals}
                      successCount={successResults.length}
                      anyLoading={anyLoading}
                      expandedId={expandedId}
                      setExpandedId={setExpandedId}
                    />
                  ) : (
                    targetSupervisors[0] && (
                      <SingleSupervisorDetail
                        state={results[targetSupervisors[0].id]}
                      />
                    )
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Vue "Tous les superviseurs" : tableau récapitulatif + ligne total
// ---------------------------------------------------------------------------

function AllSupervisorsTable({
  targetSupervisors,
  results,
  grandTotals,
  successCount,
  anyLoading,
  expandedId,
  setExpandedId,
}: {
  targetSupervisors: SupervisorOption[];
  results: Record<string, FetchState>;
  grandTotals: { debutTotal: number; grTotal: number; sortieTotal: number; daysFound: number };
  successCount: number;
  anyLoading: boolean;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
}) {
  return (
    <div>
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/60 text-muted-foreground">
                <th className="text-left font-semibold text-[11px] uppercase tracking-wider px-3 py-2.5 w-8" />
                <th className="text-left font-semibold text-[11px] uppercase tracking-wider px-3 py-2.5">
                  Superviseur
                </th>
                <th className="text-right font-semibold text-[11px] uppercase tracking-wider px-3 py-2.5">
                  Début
                </th>
                <th className="text-right font-semibold text-[11px] uppercase tracking-wider px-3 py-2.5">
                  GR total
                </th>
                <th className="text-right font-semibold text-[11px] uppercase tracking-wider px-3 py-2.5">
                  Fin
                </th>
                <th className="text-right font-semibold text-[11px] uppercase tracking-wider px-3 py-2.5">
                  Jours
                </th>
              </tr>
            </thead>
            <tbody>
              {targetSupervisors.map((s) => {
                const state = results[s.id];
                const isExpanded = expandedId === s.id;
                const canExpand = state?.status === "success";

                return (
                  <>
                    <tr
                      key={s.id}
                      onClick={() => canExpand && setExpandedId(isExpanded ? null : s.id)}
                      className={`border-t border-border ${
                        canExpand ? "cursor-pointer hover:bg-muted/40" : ""
                      }`}
                    >
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {canExpand ? (
                          isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-foreground">{s.name}</td>

                      {!state || state.status === "loading" ? (
                        <td colSpan={4} className="px-3 py-2.5 text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-1.5" />
                          Chargement…
                        </td>
                      ) : state.status === "error" ? (
                        <td colSpan={4} className="px-3 py-2.5 text-destructive text-xs">
                          {state.message}
                        </td>
                      ) : (
                        <>
                          <td className="px-3 py-2.5 text-right tabular-nums text-green-700 font-semibold">
                            {fmt(state.data.totaux.debutTotal)}
                          </td>
                          <td
                            className={`px-3 py-2.5 text-right tabular-nums font-bold ${
                              state.data.totaux.grTotal >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {fmtSigned(state.data.totaux.grTotal)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-blue-700 font-semibold">
                            {fmt(state.data.totaux.sortieTotal)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                            {state.data.daysFound}
                          </td>
                        </>
                      )}
                    </tr>

                    {isExpanded && state?.status === "success" && (
                      <tr key={`${s.id}-detail`} className="border-t border-border bg-muted/20">
                        <td colSpan={6} className="px-3 py-4">
                          <SupervisorDetailPanel data={state.data} />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/60 font-bold">
                <td className="px-3 py-2.5" />
                <td className="px-3 py-2.5 text-foreground">
                  Total {anyLoading ? "(partiel)" : `(${successCount}/${targetSupervisors.length})`}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-green-700">
                  {fmt(grandTotals.debutTotal)}
                </td>
                <td
                  className={`px-3 py-2.5 text-right tabular-nums ${
                    grandTotals.grTotal >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {fmtSigned(grandTotals.grTotal)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-blue-700">
                  {fmt(grandTotals.sortieTotal)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                  {grandTotals.daysFound}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground text-center mt-2">
        Cliquez sur une ligne pour voir le détail des comptes et partenaires.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vue "Un seul superviseur" : cartes résumé + détail
// ---------------------------------------------------------------------------

function SingleSupervisorDetail({ state }: { state?: FetchState }) {
  if (!state || state.status === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-10">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement…
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
        {state.message}
      </p>
    );
  }

  const { data } = state;

  return (
    <div className="space-y-4">
      {data.missingDays.length > 0 && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl text-xs bg-orange-50 text-orange-700 border border-orange-200">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <p>
            {data.missingDays.length} jour(s) sans donnée dans cette plage :{" "}
            {data.missingDays.join(", ")}
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl p-4 text-center" style={{ background: "rgba(34,197,94,0.08)" }}>
          <TrendingUp className="h-4 w-4 text-green-600 mx-auto mb-1" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-green-700 mb-0.5">Début</p>
          <p className="text-lg font-extrabold text-green-800 tabular-nums">{fmt(data.totaux.debutTotal)}</p>
        </div>
        <div className="rounded-xl p-4 text-center bg-green-500">
          <Minus className="h-4 w-4 text-white mx-auto mb-1" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-green-100 mb-0.5">GR Total</p>
          <p className="text-lg font-extrabold text-white tabular-nums">
            {fmtSigned(data.totaux.grTotal)}
          </p>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: "rgba(59,130,246,0.08)" }}>
          <TrendingDown className="h-4 w-4 text-blue-600 mx-auto mb-1" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-0.5">Fin</p>
          <p className="text-lg font-extrabold text-blue-800 tabular-nums">{fmt(data.totaux.sortieTotal)}</p>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground text-center">
        {data.daysFound} jour(s) trouvé(s) — du {data.startDate} au {data.endDate}
      </p>

      <SupervisorDetailPanel data={data} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Détail comptes / partenaires en vrai tableau (réutilisé par les 2 vues)
// ---------------------------------------------------------------------------

function SupervisorDetailPanel({ data }: { data: SupervisorRangeTotalsResult }) {
  const { comptes: comptesDebut, partenaires: partenairesDebut } = DateRangeService.splitComptesAndPartenaires(
    data.comptes.debut
  );
  const { comptes: comptesSortie, partenaires: partenairesSortie } = DateRangeService.splitComptesAndPartenaires(
    data.comptes.sortie
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <DetailTable
        title="Début"
        color="green"
        comptes={comptesDebut}
        partenaires={partenairesDebut}
      />
      <DetailTable
        title="Fin"
        color="blue"
        comptes={comptesSortie}
        partenaires={partenairesSortie}
      />
    </div>
  );
}

function DetailTable({
  title,
  color,
  comptes,
  partenaires,
}: {
  title: string;
  color: "green" | "blue";
  comptes: Record<string, number>;
  partenaires: Record<string, number>;
}) {
  const rows = [
    ...Object.entries(comptes).map(([k, v]) => ({ label: k, value: v, isPartner: false })),
    ...Object.entries(partenaires).map(([k, v]) => ({ label: k, value: v, isPartner: true })),
  ];

  const headerColor = color === "green" ? "text-green-700" : "text-blue-700";

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className={`px-3 py-2 text-xs font-bold uppercase tracking-wider bg-muted/50 ${headerColor}`}>
        ● {title}
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">—</p>
      ) : (
        <table className="w-full text-xs">
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-border">
                <td className="px-3 py-2 text-muted-foreground truncate">
                  {r.isPartner ? `👤 ${r.label}` : r.label}
                </td>
                <td className="px-3 py-2 text-right font-semibold text-foreground tabular-nums">
                  {fmt(r.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default RangeTotalsModal;