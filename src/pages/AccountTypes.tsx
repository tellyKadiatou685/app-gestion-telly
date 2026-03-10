import { useState, useEffect } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Search, RefreshCw, Edit2, Check, X, Loader2, Settings2 } from "lucide-react";
import { Menu } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import AccountTypeService from "@/services/AccountTypeService";
import type { AccountTypeItem, AccountTypeValue } from "@/types/accountType.types";

const AccountTypes = () => {
  const { toast } = useToast();

  const [types, setTypes]               = useState<AccountTypeItem[]>([]);
  const [autresLabel, setAutresLabel]   = useState("Autres");
  const [editingAutres, setEditingAutres] = useState(false);
  const [tempLabel, setTempLabel]       = useState("");
  const [loading, setLoading]           = useState(true);
  const [savingLabel, setSavingLabel]   = useState(false);
  const [toggling, setToggling]         = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [search, setSearch]             = useState("");

  // ── CHARGEMENT ────────────────────────────────────────────────────────────

  const loadConfig = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const config = await AccountTypeService.getConfig();
      setTypes(config.allTypes);
      setAutresLabel(config.autresLabel);
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err?.response?.data?.message || "Impossible de charger les types de compte.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadConfig(); }, []);

  // ── TOGGLE ────────────────────────────────────────────────────────────────

  const handleToggle = async (value: AccountTypeValue, checked: boolean) => {
    const activeCount = types.filter(t => t.isActive).length;
    if (!checked && activeCount <= 1) {
      toast({ title: "Impossible", description: "Au moins un type de compte doit rester actif.", variant: "destructive" });
      return;
    }
    if (value === "AUTRES" && checked) {
      setTempLabel(autresLabel === "Autres" ? "" : autresLabel);
      setEditingAutres(true);
      return;
    }
    setTypes(prev => prev.map(t => t.value === value ? { ...t, isActive: checked } : t));
    setToggling(prev => new Set(prev).add(value));
    try {
      await AccountTypeService.toggle(value, checked);
      toast({ title: checked ? "✅ Activé" : "⛔ Désactivé", description: `${types.find(t => t.value === value)?.label} a été ${checked ? "activé" : "désactivé"}.` });
    } catch (err: any) {
      setTypes(prev => prev.map(t => t.value === value ? { ...t, isActive: !checked } : t));
      toast({ title: "Erreur", description: err?.response?.data?.message || "Impossible de modifier ce type.", variant: "destructive" });
    } finally {
      setToggling(prev => { const s = new Set(prev); s.delete(value); return s; });
    }
  };

  // ── SAVE LABEL AUTRES ─────────────────────────────────────────────────────

  const saveAutresLabel = async () => {
    if (tempLabel.trim().length < 2) {
      toast({ title: "Erreur", description: "Le nom doit contenir au moins 2 caractères.", variant: "destructive" });
      return;
    }
    setSavingLabel(true);
    const finalLabel = tempLabel.trim();
    try {
      await AccountTypeService.updateAutresLabel(finalLabel);
      const autresType = types.find(t => t.value === "AUTRES");
      if (!autresType?.isActive) await AccountTypeService.toggle("AUTRES", true);
      setAutresLabel(finalLabel);
      setTypes(prev => prev.map(t => t.value === "AUTRES" ? { ...t, label: finalLabel, isActive: true } : t));
      setEditingAutres(false);
      toast({ title: "✅ Enregistré", description: `Le type "Autres" est maintenant nommé "${finalLabel}".` });
    } catch (err: any) {
      toast({ title: "Erreur", description: err?.response?.data?.message || "Impossible de sauvegarder.", variant: "destructive" });
    } finally {
      setSavingLabel(false);
    }
  };

  const cancelAutres = () => { setEditingAutres(false); setTempLabel(""); };

  // ── DÉRIVÉS ───────────────────────────────────────────────────────────────

  const activeTypes  = types.filter(t => t.isActive);
  const filteredTypes = types.filter(t =>
    t.value.toLowerCase().includes(search.toLowerCase()) ||
    t.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />

      <main className="flex-1 min-w-0 overflow-x-hidden">

        {/* ── HERO / HEADER ── */}
        <div style={{
          background: "linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 50%,#2563eb 100%)",
          padding: "20px 16px 18px",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -60, right: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,.06)", pointerEvents: "none" }} />

          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 min-w-0">
              {/* Hamburger Tailwind pur */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden flex items-center justify-center rounded-xl flex-shrink-0 cursor-pointer"
                style={{ width: 36, height: 36, background: "rgba(255,255,255,.18)", border: "1px solid rgba(255,255,255,.3)" }}
                aria-label="Ouvrir le menu"
              >
                <Menu className="h-4 w-4 text-white" />
              </button>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.55)", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 2 }}>
                  Configuration
                </p>
                <h1 style={{ fontSize: "clamp(17px,4vw,22px)", fontWeight: 800, color: "white", letterSpacing: "-.02em", lineHeight: 1.1, marginBottom: 2 }}>
                  Types de Compte
                </h1>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>
                  Activez ou désactivez les comptes disponibles
                </p>
              </div>
            </div>

            {/* Stats pills */}
            <div className="flex gap-2 flex-shrink-0">
              <div style={{ background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.2)", borderRadius: 11, padding: "6px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "white", lineHeight: 1 }}>{activeTypes.length}</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,.6)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", marginTop: 2 }}>Actifs</div>
              </div>
              <div style={{ background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.2)", borderRadius: 11, padding: "6px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "white", lineHeight: 1 }}>{types.length}</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,.6)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", marginTop: 2 }}>Total</div>
              </div>
            </div>
          </div>

          {/* Barre de recherche dans le hero */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 flex-1 max-w-sm rounded-xl px-3"
              style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.25)" }}>
              <Search className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "rgba(255,255,255,.7)" }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un type…"
                className="bg-transparent border-none outline-none flex-1 min-w-0 py-2"
                style={{ fontSize: 12, color: "white", fontFamily: "inherit" }}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.7)", fontSize: 14, lineHeight: 1 }}>×</button>
              )}
            </div>
            <button
              onClick={() => loadConfig(true)}
              className="flex items-center justify-center rounded-xl cursor-pointer transition-opacity hover:opacity-80"
              style={{ width: 36, height: 36, background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.25)", flexShrink: 0 }}
            >
              <RefreshCw className={`h-4 w-4 text-white ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* ── CONTENU ── */}
        <div className="p-4 sm:p-6">

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Chargement des types de compte…</p>
            </div>
          )}

          {!loading && (
            <>
              {/* Résumé comptes actifs */}
              <div className="bg-card rounded-xl border border-border p-4 mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <Settings2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Comptes actifs</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeTypes.map(t => (
                    <span key={t.value} className="px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ background: "rgba(29,78,216,.1)", color: "#1d4ed8" }}>
                      {t.label}
                    </span>
                  ))}
                  {activeTypes.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">Aucun type actif</span>
                  )}
                </div>
              </div>

              {/* ── MOBILE : cartes ── */}
              <div className="flex flex-col gap-3 sm:hidden">
                {filteredTypes.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground text-sm">Aucun résultat</div>
                )}
                {filteredTypes.map(t => (
                  <div key={t.value} className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="font-bold text-sm text-foreground">{t.value}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{t.label}</div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                        t.isActive ? "bg-blue-50 text-blue-700" : "bg-muted text-muted-foreground"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${t.isActive ? "bg-blue-600" : "bg-muted-foreground"}`} />
                        {toggling.has(t.value) ? "…" : t.isActive ? "Actif" : "Inactif"}
                      </span>
                    </div>

                    {/* Édition label AUTRES */}
                    {t.value === "AUTRES" && editingAutres && (
                      <div className="flex items-center gap-2 mb-3">
                        <Input
                          value={tempLabel}
                          onChange={e => setTempLabel(e.target.value)}
                          className="h-8 flex-1 text-sm"
                          placeholder="Nom personnalisé…"
                          maxLength={50}
                          onKeyDown={e => { if (e.key === "Enter") saveAutresLabel(); if (e.key === "Escape") cancelAutres(); }}
                          autoFocus
                          disabled={savingLabel}
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveAutresLabel} disabled={savingLabel}>
                          {savingLabel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-green-600" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelAutres} disabled={savingLabel}>
                          <X className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      {t.canCustomizeLabel && !editingAutres && (
                        <button
                          onClick={() => { setTempLabel(autresLabel); setEditingAutres(true); }}
                          className="flex items-center gap-1 text-xs text-primary hover:opacity-80"
                        >
                          <Edit2 className="h-3 w-3" /> Personnaliser
                        </button>
                      )}
                      {!t.canCustomizeLabel && <span />}
                      {toggling.has(t.value) ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <Switch checked={t.isActive} onCheckedChange={checked => handleToggle(t.value as AccountTypeValue, checked)} />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── DESKTOP : tableau ── */}
              <div className="hidden sm:block bg-card rounded-xl border border-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-foreground">Tous les types de compte</h2>
                  <span className="text-xs text-muted-foreground hidden md:block">
                    Activez ou désactivez les types disponibles pour les transactions
                  </span>
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="pb-3 font-medium">Type</th>
                      <th className="pb-3 font-medium">Label affiché</th>
                      <th className="pb-3 font-medium">Statut</th>
                      <th className="pb-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTypes.length === 0 && (
                      <tr><td colSpan={4} className="py-8 text-center text-muted-foreground text-sm">Aucun résultat</td></tr>
                    )}
                    {filteredTypes.map(t => (
                      <tr key={t.value} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">

                        {/* Type */}
                        <td className="py-4 font-medium text-foreground">{t.value}</td>

                        {/* Label */}
                        <td className="py-4">
                          {t.value === "AUTRES" && editingAutres ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={tempLabel}
                                onChange={e => setTempLabel(e.target.value)}
                                className="h-8 w-44 text-sm"
                                placeholder="Nom personnalisé..."
                                maxLength={50}
                                onKeyDown={e => { if (e.key === "Enter") saveAutresLabel(); if (e.key === "Escape") cancelAutres(); }}
                                autoFocus
                                disabled={savingLabel}
                              />
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveAutresLabel} disabled={savingLabel}>
                                {savingLabel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-green-600" />}
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelAutres} disabled={savingLabel}>
                                <X className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">{t.label}</span>
                              {t.canCustomizeLabel && (
                                <button onClick={() => { setTempLabel(autresLabel); setEditingAutres(true); }} className="text-primary hover:opacity-80 transition-opacity">
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Statut */}
                        <td className="py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            t.isActive ? "bg-blue-50 text-blue-700" : "bg-muted text-muted-foreground"
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${t.isActive ? "bg-blue-600" : "bg-muted-foreground"}`} />
                            {toggling.has(t.value) ? "..." : t.isActive ? "Actif" : "Inactif"}
                          </span>
                        </td>

                        {/* Switch */}
                        <td className="py-4 text-right">
                          {toggling.has(t.value) ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />
                          ) : (
                            <Switch checked={t.isActive} onCheckedChange={checked => handleToggle(t.value as AccountTypeValue, checked)} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default AccountTypes;