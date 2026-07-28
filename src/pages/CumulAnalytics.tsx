// src/pages/CumulAnalytics.tsx
// Version COMPLÈTEMENT FONCTIONNELLE

import { useState, useEffect } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import api from "@/config";
import { Menu, Loader2, TrendingUp, Award, Calendar, Users, Filter } from "lucide-react";

// ============================================================
// FORMATAGE DES NOMBRES
// ============================================================
const formatNombre = (n: number | undefined | null): string => {
  if (n === undefined || n === null || isNaN(n)) return "0 F";
  return n.toLocaleString("fr-FR") + " F";
};

const formatNombreSimple = (n: number | undefined | null): string => {
  if (n === undefined || n === null || isNaN(n)) return "0 F";
  return Math.abs(n).toLocaleString("fr-FR") + " F";
};

const formatSigne = (n: number | undefined | null): string => {
  if (n === undefined || n === null || isNaN(n)) return "0 F";
  if (n === 0) return "0 F";
  return (n >= 0 ? "+" : "") + formatNombre(Math.abs(n));
};

const AUJOURD_HUI = new Date().toISOString().split("T")[0];
const AN_PASSE = new Date();
AN_PASSE.setFullYear(AN_PASSE.getFullYear() - 1);
const DATE_AN_PASSE = AN_PASSE.toISOString().split("T")[0];

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
const CumulAnalytics = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dateSelection, setDateSelection] = useState(AUJOURD_HUI);
  const [superviseurFiltre, setSuperviseurFiltre] = useState<string>("tous");
  const [totalGeneral, setTotalGeneral] = useState(0);
  const [cumulJusquaDate, setCumulJusquaDate] = useState(0);
  const [dataJour, setDataJour] = useState<any>(null);
  const [dataCumul, setDataCumul] = useState<any>(null);
  const [loadingTotal, setLoadingTotal] = useState(false);
  const [loadingDate, setLoadingDate] = useState(false);
  const [loadingJour, setLoadingJour] = useState(false);
  const [error, setError] = useState("");

  const operateurs = [
    { nom: "Western Union", couleur: "#c0392b", fond: "#fff0f0", cle: "WESTERN_UNION" },
    { nom: "Ria", couleur: "#1a6e32", fond: "#f0faf3", cle: "RIA" },
    { nom: "MoneyGram", couleur: "#1a5fa8", fond: "#f0f6ff", cle: "MONEYGRAM" }
  ];

  // Chargement au démarrage
  useEffect(() => {
    chargerTotalGeneral();
    chargerDonneesJour(AUJOURD_HUI);
  }, []);

  // Quand la date change, recalculer le cumul
  useEffect(() => {
    if (dateSelection) {
      chargerCumulJusquaDate(dateSelection);
    }
  }, [dateSelection]);

  const chargerTotalGeneral = async () => {
    setLoadingTotal(true);
    try {
      // Essayer d'abord la route total-general
      let response;
      try {
        response = await api.get("/cumul/total-general");
      } catch (err) {
        // Fallback: calculer manuellement
        response = await api.get("/cumul/international", {
          params: { start: DATE_AN_PASSE, end: AUJOURD_HUI }
        });
      }
      
      const total = response.data.totalGlobal?.diff ?? 
                    response.data.totalGlobal?.cumulativeTotal ?? 0;
      setTotalGeneral(total);
      setDataCumul(response.data);
      
    } catch (err: any) {
      console.error("Erreur chargement total:", err);
      setError("Impossible de charger le total général");
    } finally {
      setLoadingTotal(false);
    }
  };

  const chargerDonneesJour = async (date: string) => {
    setLoadingJour(true);
    try {
      const response = await api.get("/cumul/international", {
        params: { start: date }
      });
      setDataJour(response.data);
    } catch (err: any) {
      console.error("Erreur chargement jour:", err);
    } finally {
      setLoadingJour(false);
    }
  };

  const chargerCumulJusquaDate = async (fin: string) => {
    setLoadingDate(true);
    try {
      const response = await api.get("/cumul/international", {
        params: { start: DATE_AN_PASSE, end: fin }
      });
      
      const cumul = response.data.totalGlobal?.diff ?? 
                    response.data.totalGlobal?.cumulativeTotal ?? 0;
      setCumulJusquaDate(cumul);
      
    } catch (err: any) {
      console.error("Erreur chargement cumul:", err);
    } finally {
      setLoadingDate(false);
    }
  };

  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setDateSelection(newDate);
    await chargerDonneesJour(newDate);
  };

  // Données pour l'affichage
  const totauxParOperateur = dataCumul?.totauxParOperateur || {};
  const superviseurs = dataJour?.parSuperviseur || [];
  
  // Filtrer les superviseurs
  const superviseursFiltres = superviseurFiltre === "tous" 
    ? superviseurs 
    : superviseurs.filter((s: any) => s.id === superviseurFiltre);

  const dateDisplay = new Date(dateSelection).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  return (
    <div className="flex min-h-screen bg-gray-100">
      <DashboardSidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />

      <main className="flex-1 p-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden bg-white p-2 rounded-xl mb-4 shadow"
        >
          <Menu className="h-5 w-5" />
        </button>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">📊 Analyse Cumulative</h1>
        <p className="text-gray-500 text-sm mb-6">F1 = Solde de fin · F2 = Solde initial · Différence = F2 - F1</p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* CARTE TOTAL GÉNÉRAL */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 mb-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold opacity-90 flex items-center gap-2">
                <Award className="h-5 w-5" />
                CUMUL TOTAL (Différences cumulées)
              </div>
              <div className="text-5xl font-black mt-2">
                {loadingTotal ? <Loader2 className="h-8 w-8 animate-spin" /> : formatNombreSimple(totalGeneral)}
              </div>
              <div className="text-xs opacity-75 mt-2">
                Somme de toutes les différences (F2 - F1) de l'année
              </div>
            </div>
            <div className="text-7xl opacity-30">📊</div>
          </div>
        </div>

        {/* SÉLECTION DE DATE */}
        <div className="bg-white rounded-2xl shadow-md p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-indigo-600" />
            <span className="font-bold text-gray-700">Voir le détail par date :</span>
          </div>
          
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">📅 Choisir une date</label>
              <input
                type="date"
                value={dateSelection}
                onChange={handleDateChange}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white w-48"
              />
            </div>
          </div>
        </div>

        {/* CUMUL JUSQU'À LA DATE */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 mb-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold opacity-90 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                CUMUL DEPUIS LE DÉBUT
              </div>
              <div className="text-2xl font-black mt-2">
                {loadingDate ? <Loader2 className="h-6 w-6 animate-spin" /> : formatNombreSimple(cumulJusquaDate)}
              </div>
              <div className="text-xs opacity-75 mt-2">
                Somme des différences jusqu'au {dateDisplay}
              </div>
            </div>
            <div className="text-5xl opacity-30">📅</div>
          </div>
        </div>

        {/* 3 CARTES OPÉRATEURS - CUMUL TOTAL */}
        <div className="bg-white rounded-2xl shadow-md p-5 mb-6">
          <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            Cumul par opérateur (total depuis le début)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {operateurs.map(op => {
              const stats = totauxParOperateur[op.cle] || { f1: 0, f2: 0, diff: 0 };
              return (
                <div key={op.cle} className="rounded-xl p-5 text-center" style={{ background: op.fond, border: `2px solid ${op.couleur}30` }}>
                  <h3 className="font-bold text-lg mb-3" style={{ color: op.couleur }}>{op.nom}</h3>
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">F1 (Fin)</div>
                      <div className="text-2xl font-black text-blue-600">{formatNombre(stats.f1)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">F2 (Initial)</div>
                      <div className="text-2xl font-black text-purple-600">{formatNombre(stats.f2)}</div>
                    </div>
                    <div className={`pt-2 border-t ${stats.diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <div className="text-xs uppercase tracking-wide">Différence (F2 - F1)</div>
                      <div className="text-xl font-bold">{formatSigne(stats.diff)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* TABLEAU DES SUPERVISEURS POUR LA DATE SÉLECTIONNÉE */}
        <div className="bg-white rounded-2xl shadow-md p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold text-gray-700 flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              Superviseurs - {dateDisplay}
            </h2>
            
            {/* Filtre par superviseur */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={superviseurFiltre}
                onChange={(e) => setSuperviseurFiltre(e.target.value)}
                className="text-sm border rounded-lg px-3 py-1.5 bg-white"
              >
                <option value="tous">Tous les superviseurs</option>
                {superviseurs.map((sup: any) => (
                  <option key={sup.id} value={sup.id}>{sup.nom}</option>
                ))}
              </select>
            </div>
          </div>

          {loadingJour ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
              <p className="text-gray-400 mt-2">Chargement...</p>
            </div>
          ) : superviseursFiltres.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Aucune donnée pour cette date</p>
              <p className="text-xs mt-1">Les superviseurs doivent saisir leurs soldes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {superviseursFiltres.map((sup: any) => {
                // Calculer les totaux pour ce superviseur
                let supF1 = 0, supF2 = 0, supDiff = 0;
                operateurs.forEach(op => {
                  const opData = sup.ops?.[op.cle] || { f1: 0, f2: 0, diff: 0 };
                  supF1 += opData.f1;
                  supF2 += opData.f2;
                  supDiff += opData.diff;
                });
                
                return (
                  <div key={sup.id} className="border rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                        {sup.nom?.charAt(0) || "?"}
                      </div>
                      <div>
                        <span className="font-bold text-gray-800 text-lg">{sup.nom}</span>
                        <div className="text-xs text-gray-400">Superviseur</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 text-center">
                      {operateurs.map(op => {
                        const opData = sup.ops?.[op.cle] || { f1: 0, f2: 0, diff: 0 };
                        if (opData.f1 === 0 && opData.f2 === 0) return null;
                        return (
                          <div key={op.cle} className="rounded-lg p-2" style={{ background: op.fond }}>
                            <div className="text-xs font-bold mb-1" style={{ color: op.couleur }}>{op.nom}</div>
                            <div className="text-[11px]">F1: {formatNombre(opData.f1)}</div>
                            <div className="text-[11px]">F2: {formatNombre(opData.f2)}</div>
                            <div className={`text-[11px] font-bold ${opData.diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              Diff: {formatSigne(opData.diff)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Total superviseur */}
                    <div className="mt-3 pt-2 border-t flex justify-end gap-4 text-sm">
                      <span className="font-medium">Total F1: <span className="text-blue-600">{formatNombre(supF1)}</span></span>
                      <span className="font-medium">Total F2: <span className="text-purple-600">{formatNombre(supF2)}</span></span>
                      <span className={`font-medium ${supDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Différence: {formatSigne(supDiff)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CumulAnalytics;