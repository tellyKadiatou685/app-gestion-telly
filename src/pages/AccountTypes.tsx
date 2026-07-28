import { useState, useEffect } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Search, RefreshCw, Edit2, Check, X, Loader2, Settings2, Plus, Trash2, ShieldOff, Shield, Star } from "lucide-react";
import { Menu } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import AccountTypeService, { type EntryAccess, ENTRY_ACCESS_LABELS } from "@/services/AccountTypeService";
import type { AccountTypeItem, AccountTypeValue, CustomSlot } from "@/types/accountType.types";

const ACCESS_STYLES: Record<EntryAccess, { bg: string; color: string; border: string; icon: string }> = {
  both:       { bg: "#f0fdf4", color: "#15803d", border: "#86efac", icon: "↕️" },
  debut_only: { bg: "#eff6ff", color: "#1d4ed8", border: "#93c5fd", icon: "🌅" },
  fin_only:   { bg: "#fff7ed", color: "#c2410c", border: "#fdba74", icon: "🌆" },
};

const AccessBadge = ({ access }: { access: EntryAccess }) => {
  const s = ACCESS_STYLES[access] ?? ACCESS_STYLES.both;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 9px", borderRadius: 20,
      fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
    }}>
      {s.icon} {ENTRY_ACCESS_LABELS[access]}
    </span>
  );
};

const ResetBadge = ({ excluded }: { excluded: boolean }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "3px 9px", borderRadius: 20,
    fontSize: 11, fontWeight: 700,
    background: excluded ? "#fef2f2" : "#f0fdf4",
    color: excluded ? "#b91c1c" : "#15803d",
    border: `1px solid ${excluded ? "#fca5a5" : "#86efac"}`,
  }}>
    {excluded ? "🔒 Conservé" : "🔄 Réinitialisé"}
  </span>
);

interface AccessSelectProps {
  value: EntryAccess;
  onChange: (v: EntryAccess) => void;
  disabled?: boolean;
}

const AccessSelect = ({ value, onChange, disabled }: AccessSelectProps) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value as EntryAccess)}
    disabled={disabled}
    style={{
      padding: "5px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600,
      border: "1.5px solid #e2e8f0", background: "#fff", color: "#334155",
      cursor: disabled ? "not-allowed" : "pointer", outline: "none",
      opacity: disabled ? 0.5 : 1,
    }}
  >
    <option value="both">↕️ Début + Fin</option>
    <option value="debut_only">🌅 Début uniquement</option>
    <option value="fin_only">🌆 Fin uniquement</option>
  </select>
);

const AccountTypes = () => {
  const { toast } = useToast();

  const [types, setTypes]             = useState<AccountTypeItem[]>([]);
  const [customSlots, setCustomSlots] = useState<CustomSlot[]>([]);
  const [loading, setLoading]         = useState(true);
  const [toggling, setToggling]       = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch]           = useState("");

  const [entryAccessMap, setEntryAccessMap] = useState<Record<string, EntryAccess>>({});
  const [savingAccess, setSavingAccess]     = useState<Set<string>>(new Set());

  const [resetExcludeMap, setResetExcludeMap]       = useState<Record<string, boolean>>({});
  const [savingResetExclude, setSavingResetExclude] = useState<Set<string>>(new Set());

  // ← NOUVEAU : type vedette
  const [featuredType, setFeaturedType]   = useState<string>("UV_MASTER");
  const [savingFeatured, setSavingFeatured] = useState(false);

  const [editingSlotId, setEditingSlotId]   = useState<string | null>(null);
  const [tempLabel, setTempLabel]           = useState("");
  const [savingSlot, setSavingSlot]         = useState(false);
  const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null);

  const loadConfig = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const config = await AccountTypeService.getConfig();
      setTypes(config.allTypes);
      setCustomSlots(config.customSlots);

      // featuredType
      if (config.featuredType) setFeaturedType(config.featuredType);

      const accessMap: Record<string, EntryAccess> = {};
      config.allTypes.forEach((t: any) => {
        if (t.entryAccess) accessMap[t.value] = t.entryAccess as EntryAccess;
      });
      if ((config as any).entryAccess) {
        Object.assign(accessMap, (config as any).entryAccess);
      }
      setEntryAccessMap(accessMap);

      const excludeMap: Record<string, boolean> = {};
      config.allTypes.forEach((t: any) => {
        excludeMap[t.value] = !!t.excludeFromReset;
      });
      if (Array.isArray((config as any).resetExcluded)) {
        ((config as any).resetExcluded as string[]).forEach(type => {
          excludeMap[type] = true;
        });
      }
      setResetExcludeMap(excludeMap);

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

  const handleToggle = async (value: AccountTypeValue, checked: boolean) => {
    const activeCount = types.filter(t => t.isActive).length;
    if (!checked && activeCount <= 1) {
      toast({ title: "Impossible", description: "Au moins un type de compte doit rester actif.", variant: "destructive" });
      return;
    }
    setTypes(prev => prev.map(t => t.value === value ? { ...t, isActive: checked } : t));
    setToggling(prev => new Set(prev).add(value));
    try {
      await AccountTypeService.toggle(value, checked);
      const label = types.find(t => t.value === value)?.label ?? value;
      toast({ title: checked ? "✅ Activé" : "⛔ Désactivé", description: `"${label}" a été ${checked ? "activé" : "désactivé"}.` });
    } catch (err: any) {
      setTypes(prev => prev.map(t => t.value === value ? { ...t, isActive: !checked } : t));
      toast({ title: "Erreur", description: err?.response?.data?.message || "Impossible de modifier ce type.", variant: "destructive" });
    } finally {
      setToggling(prev => { const s = new Set(prev); s.delete(value); return s; });
    }
  };

  const handleAccessChange = async (type: AccountTypeValue, access: EntryAccess) => {
    const previous = entryAccessMap[type] ?? "both";
    setEntryAccessMap(prev => ({ ...prev, [type]: access }));
    setSavingAccess(prev => new Set(prev).add(type));
    try {
      await AccountTypeService.setEntryAccess(type, access);
      const label = types.find(t => t.value === type)?.label ?? type;
      toast({ title: "✅ Accès mis à jour", description: `"${label}" → ${ENTRY_ACCESS_LABELS[access]}` });
    } catch (err: any) {
      setEntryAccessMap(prev => ({ ...prev, [type]: previous }));
      toast({ title: "Erreur", description: err?.response?.data?.message || "Impossible de modifier l'accès.", variant: "destructive" });
    } finally {
      setSavingAccess(prev => { const s = new Set(prev); s.delete(type); return s; });
    }
  };

  const handleResetExcludeChange = async (type: AccountTypeValue, exclude: boolean) => {
    const previous = resetExcludeMap[type] ?? false;
    setResetExcludeMap(prev => ({ ...prev, [type]: exclude }));
    setSavingResetExclude(prev => new Set(prev).add(type));
    try {
      await AccountTypeService.setResetExclusion(type, exclude);
      const label = types.find(t => t.value === type)?.label ?? type;
      toast({
        title: exclude ? "🔒 Exclu du reset" : "🔄 Inclus dans le reset",
        description: exclude
          ? `"${label}" sera conservé lors du reset quotidien.`
          : `"${label}" sera réinitialisé lors du reset quotidien.`,
      });
    } catch (err: any) {
      setResetExcludeMap(prev => ({ ...prev, [type]: previous }));
      toast({ title: "Erreur", description: err?.response?.data?.message || "Impossible de modifier l'exclusion reset.", variant: "destructive" });
    } finally {
      setSavingResetExclude(prev => { const s = new Set(prev); s.delete(type); return s; });
    }
  };

  // ── DÉFINIR LE TYPE VEDETTE ───────────────────────────────────────────────
  const handleSetFeatured = async (type: AccountTypeValue) => {
    if (type === featuredType) return;
    const previous = featuredType;
    setFeaturedType(type);
    setSavingFeatured(true);
    try {
      const result = await AccountTypeService.setFeaturedType(type);
      // Mettre à jour isFeatured dans la liste locale
      setTypes(prev => prev.map(t => ({ ...t, isFeatured: t.value === type })));
      toast({
        title: "⭐ Type vedette mis à jour",
        description: `"${result.label}" s'affiche maintenant en haut des statistiques.`,
      });
    } catch (err: any) {
      setFeaturedType(previous);
      toast({ title: "Erreur", description: err?.response?.data?.message || "Impossible de définir le type vedette.", variant: "destructive" });
    } finally {
      setSavingFeatured(false);
    }
  };

  const startAddSlot    = () => { setEditingSlotId("NEW"); setTempLabel(""); };
  const startRenameSlot = (slot: CustomSlot) => { setEditingSlotId(slot.id); setTempLabel(slot.label); };
  const cancelEdit      = () => { setEditingSlotId(null); setTempLabel(""); };

  const confirmAddSlot = async () => {
    if (tempLabel.trim().length < 2) {
      toast({ title: "Erreur", description: "Le nom doit contenir au moins 2 caractères.", variant: "destructive" });
      return;
    }
    setSavingSlot(true);
    try {
      const result = await AccountTypeService.addCustomSlot(tempLabel.trim());
      await loadConfig(true);
      setEditingSlotId(null); setTempLabel("");
      toast({ title: "✅ Ajouté", description: `Le type "${result.slot.label}" a été créé.` });
    } catch (err: any) {
      toast({ title: "Erreur", description: err?.response?.data?.message || "Impossible d'ajouter ce type.", variant: "destructive" });
    } finally { setSavingSlot(false); }
  };

  const confirmRenameSlot = async () => {
    if (!editingSlotId || editingSlotId === "NEW") return;
    if (tempLabel.trim().length < 2) {
      toast({ title: "Erreur", description: "Le nom doit contenir au moins 2 caractères.", variant: "destructive" });
      return;
    }
    setSavingSlot(true);
    try {
      await AccountTypeService.renameCustomSlot(editingSlotId, tempLabel.trim());
      const newLabel = tempLabel.trim();
      setCustomSlots(prev => prev.map(s => s.id === editingSlotId ? { ...s, label: newLabel } : s));
      setTypes(prev => prev.map(t => t.value === editingSlotId ? { ...t, label: newLabel } : t));
      setEditingSlotId(null); setTempLabel("");
      toast({ title: "✅ Renommé", description: `Le type a été renommé en "${newLabel}".` });
    } catch (err: any) {
      toast({ title: "Erreur", description: err?.response?.data?.message || "Impossible de renommer.", variant: "destructive" });
    } finally { setSavingSlot(false); }
  };

  const handleDeleteSlot = async (slotId: string, label: string) => {
    setDeletingSlotId(slotId);
    try {
      await AccountTypeService.removeCustomSlot(slotId);
      setTypes(prev => prev.filter(t => t.value !== slotId));
      setCustomSlots(prev => prev.filter(s => s.id !== slotId));
      setEntryAccessMap(prev => { const m = { ...prev }; delete m[slotId]; return m; });
      setResetExcludeMap(prev => { const m = { ...prev }; delete m[slotId]; return m; });
      // Si le type supprimé était vedette, revenir à UV_MASTER
      if (slotId === featuredType) setFeaturedType("UV_MASTER");
      toast({ title: "🗑️ Supprimé", description: `Le type "${label}" a été supprimé.` });
    } catch (err: any) {
      toast({ title: "Erreur", description: err?.response?.data?.message || "Impossible de supprimer.", variant: "destructive" });
    } finally { setDeletingSlotId(null); }
  };

  const activeTypes    = types.filter(t => t.isActive);
  const fixedTypes     = types.filter(t => !t.isCustomSlot);
  const customTypes    = types.filter(t => t.isCustomSlot);
  const filteredFixed  = fixedTypes.filter(t =>
    t.value.toLowerCase().includes(search.toLowerCase()) ||
    t.label.toLowerCase().includes(search.toLowerCase())
  );
  const filteredCustom = customTypes.filter(t =>
    t.value.toLowerCase().includes(search.toLowerCase()) ||
    t.label.toLowerCase().includes(search.toLowerCase())
  );

  const InlineEditor = ({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) => (
    <div className="flex items-center gap-2">
      <Input
        value={tempLabel}
        onChange={e => setTempLabel(e.target.value)}
        className="h-8 w-44 text-sm"
        placeholder="Nom du type…"
        maxLength={50}
        onKeyDown={e => { if (e.key === "Enter") onConfirm(); if (e.key === "Escape") onCancel(); }}
        autoFocus
        disabled={savingSlot}
      />
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onConfirm} disabled={savingSlot}>
        {savingSlot ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-green-600" />}
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onCancel} disabled={savingSlot}>
        <X className="h-3.5 w-3.5 text-destructive" />
      </Button>
    </div>
  );

  // ── Bouton étoile vedette ─────────────────────────────────────────────────
  const FeaturedBtn = ({ type, label }: { type: string; label: string }) => {
    const isCurrent = featuredType === type;
    return (
      <button
        onClick={() => handleSetFeatured(type as AccountTypeValue)}
        disabled={savingFeatured || isCurrent}
        title={isCurrent ? "Type vedette actuel" : `Définir "${label}" comme type vedette`}
        style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "4px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700,
          border: `1.5px solid ${isCurrent ? "#fbbf24" : "#e2e8f0"}`,
          background: isCurrent ? "#fefce8" : "transparent",
          color: isCurrent ? "#b45309" : "#94a3b8",
          cursor: isCurrent || savingFeatured ? "default" : "pointer",
          transition: "all .15s",
        }}
      >
        <Star
          style={{
            width: 12, height: 12,
            fill: isCurrent ? "#fbbf24" : "none",
            stroke: isCurrent ? "#f59e0b" : "#94a3b8",
            strokeWidth: 2,
          }}
        />
        {isCurrent ? "Vedette" : "Définir vedette"}
      </button>
    );
  };

  const DesktopRow = ({ t }: { t: AccountTypeItem }) => {
    const isEditing     = editingSlotId === t.value;
    const isDeleting    = deletingSlotId === t.value;
    const isTogglingT   = toggling.has(t.value);
    const isSavingAcc   = savingAccess.has(t.value);
    const isSavingReset = savingResetExclude.has(t.value);
    const slot          = customSlots.find(s => s.id === t.value);
    const access        = entryAccessMap[t.value] ?? "both";
    const excluded      = resetExcludeMap[t.value] ?? false;

    return (
      <tr className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
        <td className="py-4 font-medium text-foreground font-mono text-xs">{t.value}</td>

        <td className="py-4">
          {isEditing ? (
            <InlineEditor onConfirm={confirmRenameSlot} onCancel={cancelEdit} />
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{t.label}</span>
              {t.canCustomizeLabel && slot && (
                <button onClick={() => startRenameSlot(slot)} className="text-primary hover:opacity-80 transition-opacity">
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </td>

        {/* Vedette */}
        <td className="py-4">
          <FeaturedBtn type={t.value} label={t.label} />
        </td>

        <td className="py-4">
          {isSavingAcc ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <AccessSelect
              value={access}
              onChange={v => handleAccessChange(t.value as AccountTypeValue, v)}
              disabled={isSavingAcc || isTogglingT}
            />
          )}
        </td>

        <td className="py-4">
          <div className="flex items-center gap-2">
            {isSavingReset ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <button
                onClick={() => handleResetExcludeChange(t.value as AccountTypeValue, !excluded)}
                disabled={isSavingReset || isTogglingT}
                title={excluded ? "Cliquer pour inclure dans le reset" : "Cliquer pour exclure du reset"}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                  border: `1.5px solid ${excluded ? "#fca5a5" : "#d1fae5"}`,
                  background: excluded ? "#fef2f2" : "#f0fdf4",
                  color: excluded ? "#b91c1c" : "#15803d",
                  cursor: isSavingReset || isTogglingT ? "not-allowed" : "pointer",
                  opacity: isSavingReset || isTogglingT ? 0.5 : 1,
                  transition: "all .15s",
                }}
              >
                {excluded
                  ? <><ShieldOff className="h-3 w-3" /> Conservé</>
                  : <><Shield className="h-3 w-3" /> Réinitialisé</>
                }
              </button>
            )}
          </div>
        </td>

        <td className="py-4">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            t.isActive ? "bg-blue-50 text-blue-700" : "bg-muted text-muted-foreground"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${t.isActive ? "bg-blue-600" : "bg-muted-foreground"}`} />
            {isTogglingT ? "…" : t.isActive ? "Actif" : "Inactif"}
          </span>
        </td>

        <td className="py-4">
          <div className="flex items-center justify-end gap-2">
            {t.isCustomSlot && (
              <Button
                size="icon" variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleDeleteSlot(t.value, t.label)}
                disabled={isDeleting || isTogglingT}
              >
                {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </Button>
            )}
            {isTogglingT
              ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              : <Switch checked={t.isActive} onCheckedChange={checked => handleToggle(t.value as AccountTypeValue, checked)} />
            }
          </div>
        </td>
      </tr>
    );
  };

  const MobileCard = ({ t }: { t: AccountTypeItem }) => {
    const isEditing     = editingSlotId === t.value;
    const isDeleting    = deletingSlotId === t.value;
    const isTogglingT   = toggling.has(t.value);
    const isSavingAcc   = savingAccess.has(t.value);
    const isSavingReset = savingResetExclude.has(t.value);
    const slot          = customSlots.find(s => s.id === t.value);
    const access        = entryAccessMap[t.value] ?? "both";
    const excluded      = resetExcludeMap[t.value] ?? false;

    return (
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="font-bold text-xs text-muted-foreground font-mono mb-0.5">{t.value}</div>
            <div className="font-semibold text-sm text-foreground">{t.label}</div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
            t.isActive ? "bg-blue-50 text-blue-700" : "bg-muted text-muted-foreground"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${t.isActive ? "bg-blue-600" : "bg-muted-foreground"}`} />
            {isTogglingT ? "…" : t.isActive ? "Actif" : "Inactif"}
          </span>
        </div>

        {/* Vedette */}
        <div style={{ marginBottom: 10 }}>
          <FeaturedBtn type={t.value} label={t.label} />
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5 }}>
            Accès saisie superviseur
          </div>
          {isSavingAcc ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <AccessSelect
              value={access}
              onChange={v => handleAccessChange(t.value as AccountTypeValue, v)}
              disabled={isSavingAcc || isTogglingT}
            />
          )}
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5 }}>
            Reset quotidien
          </div>
          {isSavingReset ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <button
              onClick={() => handleResetExcludeChange(t.value as AccountTypeValue, !excluded)}
              disabled={isSavingReset || isTogglingT}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                border: `1.5px solid ${excluded ? "#fca5a5" : "#d1fae5"}`,
                background: excluded ? "#fef2f2" : "#f0fdf4",
                color: excluded ? "#b91c1c" : "#15803d",
                cursor: isSavingReset || isTogglingT ? "not-allowed" : "pointer",
                opacity: isSavingReset || isTogglingT ? 0.5 : 1,
              }}
            >
              {excluded
                ? <><ShieldOff className="h-3 w-3" /> Conservé au reset</>
                : <><Shield className="h-3 w-3" /> Réinitialisé au reset</>
              }
            </button>
          )}
        </div>

        {isEditing && (
          <div className="mb-3">
            <InlineEditor onConfirm={confirmRenameSlot} onCancel={cancelEdit} />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {t.canCustomizeLabel && slot && !isEditing && (
              <button onClick={() => startRenameSlot(slot)} className="flex items-center gap-1 text-xs text-primary hover:opacity-80">
                <Edit2 className="h-3 w-3" /> Renommer
              </button>
            )}
            {t.isCustomSlot && (
              <button
                onClick={() => handleDeleteSlot(t.value, t.label)}
                disabled={isDeleting}
                className="flex items-center gap-1 text-xs text-destructive hover:opacity-80 disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                Supprimer
              </button>
            )}
          </div>
          {isTogglingT
            ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            : <Switch checked={t.isActive} onCheckedChange={checked => handleToggle(t.value as AccountTypeValue, checked)} />
          }
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />

      <main className="flex-1 min-w-0 overflow-x-hidden">

        <div style={{
          background: "linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 50%,#2563eb 100%)",
          padding: "20px 16px 18px",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -60, right: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,.06)", pointerEvents: "none" }} />

          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 min-w-0">
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
                  Gérez les types disponibles, les droits de saisie et le type vedette
                </p>
              </div>
            </div>

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

          {/* Bandeau type vedette actuel */}
          {!loading && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(251,191,36,.15)", border: "1px solid rgba(251,191,36,.4)",
              borderRadius: 10, padding: "5px 12px", fontSize: 12, color: "#fef3c7", fontWeight: 600,
            }}>
              <Star style={{ width: 12, height: 12, fill: "#fbbf24", stroke: "#fbbf24" }} />
              Vedette : {types.find(t => t.value === featuredType)?.label ?? featuredType}
            </div>
          )}

          <div className="flex items-center gap-2 mt-3">
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

        {!loading && (
          <div style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9", padding: "10px 20px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".06em" }}>Accès saisie :</span>
            {(["both", "debut_only", "fin_only"] as EntryAccess[]).map(a => (
              <AccessBadge key={a} access={a} />
            ))}
            <span style={{ margin: "0 4px", color: "#cbd5e1" }}>|</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".06em" }}>Reset :</span>
            <ResetBadge excluded={false} />
            <ResetBadge excluded={true} />
            <span style={{ margin: "0 4px", color: "#cbd5e1" }}>|</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "#b45309" }}>
              <Star style={{ width: 11, height: 11, fill: "#fbbf24", stroke: "#f59e0b" }} /> Vedette = affiché en haut des stats
            </span>
          </div>
        )}

        <div className="p-4 sm:p-6">

          {loading && (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Chargement des types de compte…</p>
            </div>
          )}

          {!loading && (
            <>
              <div className="bg-card rounded-xl border border-border p-4 mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <Settings2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Comptes actifs</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeTypes.map(t => (
                    <span key={t.value} className="px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: t.value === featuredType ? "rgba(251,191,36,.15)" : "rgba(29,78,216,.1)",
                        color:      t.value === featuredType ? "#b45309" : "#1d4ed8",
                        border:     t.value === featuredType ? "1px solid #fbbf2440" : "none",
                      }}>
                      {t.value === featuredType && "⭐ "}{t.label}
                    </span>
                  ))}
                  {activeTypes.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">Aucun type actif</span>
                  )}
                </div>
              </div>

              {/* ══ MOBILE ══ */}
              <div className="flex flex-col gap-3 sm:hidden">
                {filteredFixed.map(t => <MobileCard key={t.value} t={t} />)}

                <div className="flex items-center gap-3 mt-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Types personnalisés</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {filteredCustom.map(t => <MobileCard key={t.value} t={t} />)}

                {editingSlotId === "NEW" && (
                  <div className="bg-card rounded-xl border border-primary/40 p-4">
                    <p className="text-xs font-semibold text-primary mb-2">Nouveau type personnalisé</p>
                    <InlineEditor onConfirm={confirmAddSlot} onCancel={cancelEdit} />
                  </div>
                )}

                {editingSlotId !== "NEW" && (
                  <button
                    onClick={startAddSlot}
                    className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <Plus className="h-4 w-4" /> Ajouter un type personnalisé
                  </button>
                )}

                {filteredFixed.length === 0 && filteredCustom.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground text-sm">Aucun résultat</div>
                )}
              </div>

              {/* ══ DESKTOP ══ */}
              <div className="hidden sm:flex flex-col gap-5">

                <div className="bg-card rounded-xl border border-border p-5">
                  <h2 className="text-base font-semibold text-foreground mb-1">Types standard</h2>
                  <p className="text-xs text-muted-foreground mb-4">
                    Configurez l'accès saisie, le reset et le type vedette affiché en haut des statistiques.
                  </p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b border-border">
                        <th className="pb-3 font-medium">Identifiant</th>
                        <th className="pb-3 font-medium">Label affiché</th>
                        <th className="pb-3 font-medium">⭐ Vedette</th>
                        <th className="pb-3 font-medium">Accès saisie</th>
                        <th className="pb-3 font-medium">Reset quotidien</th>
                        <th className="pb-3 font-medium">Statut</th>
                        <th className="pb-3 font-medium text-right">Activer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFixed.length === 0 && (
                        <tr><td colSpan={7} className="py-8 text-center text-muted-foreground text-sm">Aucun résultat</td></tr>
                      )}
                      {filteredFixed.map(t => <DesktopRow key={t.value} t={t} />)}
                    </tbody>
                  </table>
                </div>

                <div className="bg-card rounded-xl border border-border p-5">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <h2 className="text-base font-semibold text-foreground">Types personnalisés</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Ajoutez autant de types que nécessaire et configurez leurs droits et leur comportement au reset
                      </p>
                    </div>
                    {editingSlotId !== "NEW" && (
                      <Button size="sm" onClick={startAddSlot} className="gap-1.5">
                        <Plus className="h-3.5 w-3.5" /> Ajouter un type
                      </Button>
                    )}
                  </div>

                  <table className="w-full text-sm mt-4">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b border-border">
                        <th className="pb-3 font-medium">Identifiant</th>
                        <th className="pb-3 font-medium">Nom personnalisé</th>
                        <th className="pb-3 font-medium">⭐ Vedette</th>
                        <th className="pb-3 font-medium">Accès saisie</th>
                        <th className="pb-3 font-medium">Reset quotidien</th>
                        <th className="pb-3 font-medium">Statut</th>
                        <th className="pb-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustom.map(t => <DesktopRow key={t.value} t={t} />)}

                      {editingSlotId === "NEW" && (
                        <tr className="border-b border-border">
                          <td className="py-4 text-xs text-muted-foreground font-mono">AUTRES_*</td>
                          <td className="py-4" colSpan={6}>
                            <InlineEditor onConfirm={confirmAddSlot} onCancel={cancelEdit} />
                          </td>
                        </tr>
                      )}

                      {filteredCustom.length === 0 && editingSlotId !== "NEW" && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center">
                            <p className="text-sm text-muted-foreground">Aucun type personnalisé pour l'instant</p>
                            <button onClick={startAddSlot} className="mt-2 text-xs text-primary hover:underline flex items-center gap-1 mx-auto">
                              <Plus className="h-3 w-3" /> Créer le premier
                            </button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default AccountTypes;