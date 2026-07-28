// src/components/PartnerListCard.tsx
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Phone, MapPin, Calendar, KeyRound, RotateCcw,
  ToggleLeft, ToggleRight, Eye, EyeOff, Copy, Check,
  Loader2, AlertTriangle, BadgeCheck, ShieldOff,
  ArrowUpCircle, ArrowDownCircle, History,
  Pencil, Trash2, X, Save, ZoomIn,
  ArrowRightLeft, PlusCircle, MinusCircle, Upload,
  MessageSquare,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AuthService from "@/services/Authservice";
import PartnerBalanceService from "@/services/PartnerBalanceService";
import { PartnerTransactionHistory } from "@/components/PartnerTransactionHistory";
import type { User } from "@/Routes/Userroutes";
import type { PartnerBalance, BalanceEtat } from "@/Routes/PartnerBalanceRoutes";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => Math.abs(n).toLocaleString("fr-FR") + "\u202FF";

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-amber-100",   text: "text-amber-700"  },
  { bg: "bg-sky-100",     text: "text-sky-700"    },
  { bg: "bg-rose-100",    text: "text-rose-700"   },
  { bg: "bg-lime-100",    text: "text-lime-700"   },
];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ─── BADGE SOLDE ──────────────────────────────────────────────────────────────

const SoldeBadge = ({ etat, montantAbsolu }: { etat: BalanceEtat; montantAbsolu: number }) => {
  if (etat === "SOLDE") {
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
        <Check className="h-3 w-3" />Soldé
      </span>
    );
  }
  if (etat === "BOUTIQUE_DOIT") {
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
        <ArrowUpCircle className="h-3 w-3" />On doit {fmt(montantAbsolu)}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
      <ArrowDownCircle className="h-3 w-3" />Doit {fmt(montantAbsolu)}
    </span>
  );
};

// ─── BLOC SOLDE DÉTAILLÉ ──────────────────────────────────────────────────────

const SoldeBlock = ({ balance }: { balance: PartnerBalance }) => {
  const { solde, statistiques } = balance;
  const derniere = statistiques.derniereTransaction
    ? new Date(statistiques.derniereTransaction).toLocaleDateString("fr-FR", {
        day: "2-digit", month: "short", year: "numeric",
      })
    : null;

  const bgColor =
    solde.etat === "SOLDE"         ? "bg-emerald-50 border-emerald-200" :
    solde.etat === "BOUTIQUE_DOIT" ? "bg-blue-50 border-blue-200"       :
                                     "bg-rose-50 border-rose-200";
  const textColor =
    solde.etat === "SOLDE"         ? "text-emerald-700" :
    solde.etat === "BOUTIQUE_DOIT" ? "text-blue-700"    :
                                     "text-rose-700";
  const icon =
    solde.etat === "SOLDE"         ? <Check           className={`h-5 w-5 ${textColor}`} /> :
    solde.etat === "BOUTIQUE_DOIT" ? <ArrowUpCircle   className={`h-5 w-5 ${textColor}`} /> :
                                     <ArrowDownCircle className={`h-5 w-5 ${textColor}`} />;

  return (
    <div className={`rounded-xl border p-3 mb-3 ${bgColor}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <p className={`text-xs font-bold ${textColor}`}>
              {solde.etat === "SOLDE"         ? "Compte soldé"  :
               solde.etat === "BOUTIQUE_DOIT" ? "Boutique doit" :
                                                "Partenaire doit"}
            </p>
            {solde.etat !== "SOLDE" && (
              <p className={`text-lg font-extrabold tabular-nums ${textColor}`}>
                {fmt(solde.montantAbsolu)}
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground">
            {statistiques.nombreTransactions} opération{statistiques.nombreTransactions > 1 ? "s" : ""}
          </p>
          {derniere && <p className="text-[10px] text-muted-foreground">{derniere}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/60 rounded-lg px-2.5 py-1.5">
          <div className="flex items-center gap-1 mb-0.5">
            <ArrowUpCircle className="h-3 w-3 text-green-600" />
            <p className="text-[10px] font-bold text-green-700 uppercase tracking-wide">Dépôts</p>
          </div>
          <p className="text-sm font-extrabold text-green-800 tabular-nums">{fmt(statistiques.totalDepots)}</p>
        </div>
        <div className="bg-white/60 rounded-lg px-2.5 py-1.5">
          <div className="flex items-center gap-1 mb-0.5">
            <ArrowDownCircle className="h-3 w-3 text-orange-600" />
            <p className="text-[10px] font-bold text-orange-700 uppercase tracking-wide">Retraits</p>
          </div>
          <p className="text-sm font-extrabold text-orange-800 tabular-nums">{fmt(statistiques.totalRetraits)}</p>
        </div>
      </div>
    </div>
  );
};

// ─── MODAL TRANSACTION DIRECTE ADMIN ─────────────────────────────────────────
// ✅ Avec commentaire optionnel

const AdminTransactionModal = ({
  partner, onClose, onSuccess,
}: {
  partner:   User;
  onClose:   () => void;
  onSuccess: (balance: PartnerBalance) => void;
}) => {
  const { toast }                       = useToast();
  const [type, setType]                 = useState<"depot" | "retrait">("depot");
  const [montant, setMontant]           = useState("");
  const [commentaire, setCommentaire]   = useState("");   // ← NOUVEAU
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const color                           = avatarColor(partner.nomComplet);
  const montantFloat                    = parseFloat(montant);
  const isValid                         = !isNaN(montantFloat) && montantFloat > 0;

  const handleSubmit = async () => {
    if (!isValid) { setError("Montant invalide"); return; }
    setLoading(true);
    setError(null);
    try {
      await PartnerBalanceService.createAdminDirectTransaction(
        partner.id,
        type,
        montantFloat,
        commentaire.trim() || null   // ← commentaire optionnel
      );
      const updated = await PartnerBalanceService.getPartnerBalance(partner.id);
      toast({
        title: type === "depot" ? "✅ Dépôt effectué" : "✅ Retrait effectué",
        description: `${montantFloat.toLocaleString("fr-FR")} F — ${partner.nomComplet}`,
      });
      onSuccess(updated);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden border border-border">
        <div className="w-12 h-1 bg-muted rounded-full mx-auto mt-3 mb-1 sm:hidden" />
        <div className="px-5 sm:px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`h-10 w-10 rounded-xl ${color.bg} ${color.text} font-bold text-sm flex items-center justify-center flex-shrink-0`}>
                {getInitials(partner.nomComplet)}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-foreground text-sm">Transaction directe</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{partner.nomComplet}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0 ml-2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          {/* Type dépôt / retrait */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setType("depot")}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                type === "depot"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-border bg-muted/30 text-muted-foreground hover:border-blue-300 hover:text-blue-600"
              }`}
            >
              <PlusCircle className="h-4 w-4" />Dépôt
            </button>
            <button
              onClick={() => setType("retrait")}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                type === "retrait"
                  ? "border-orange-500 bg-orange-50 text-orange-700"
                  : "border-border bg-muted/30 text-muted-foreground hover:border-orange-300 hover:text-orange-600"
              }`}
            >
              <MinusCircle className="h-4 w-4" />Retrait
            </button>
          </div>

          {/* Montant */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
              Montant <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                type="number" min="1" step="any"
                value={montant}
                onChange={e => { setMontant(e.target.value); setError(null); }}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="Ex: 5000"
                autoFocus
                className="w-full px-4 py-3 pr-10 rounded-xl border border-border bg-background text-sm font-mono font-bold text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">F</span>
            </div>
            {isValid && (
              <p className="text-[11px] text-muted-foreground pl-1">{montantFloat.toLocaleString("fr-FR")} F</p>
            )}
          </div>

          {/* ── Commentaire optionnel ── */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <MessageSquare className="h-3 w-3" />
              Commentaire
              <span className="font-normal normal-case text-muted-foreground/60">(optionnel)</span>
            </label>
            <textarea
              value={commentaire}
              onChange={e => setCommentaire(e.target.value)}
              placeholder="Ex : règlement du 15 jan, remboursement avance..."
              maxLength={200}
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 resize-none"
            />
            {commentaire.length > 0 && (
              <p className="text-[10px] text-muted-foreground text-right">{commentaire.length}/200</p>
            )}
          </div>

          {/* Info */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-800">
            <ArrowRightLeft className="h-4 w-4 mt-0.5 flex-shrink-0 text-sky-500" />
            <p className="text-xs leading-relaxed">
              Cette transaction est <strong>directe admin → partenaire</strong>. Elle n'apparaît dans aucune card superviseur.
            </p>
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-border text-muted-foreground hover:bg-muted transition-colors">
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !isValid}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60 ${
                type === "depot"
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-orange-500 hover:bg-orange-600 text-white"
              }`}
            >
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" />Traitement...</>
                : type === "depot"
                  ? <><PlusCircle className="h-4 w-4" />Déposer</>
                  : <><MinusCircle className="h-4 w-4" />Retirer</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── CARD PRINCIPALE ──────────────────────────────────────────────────────────

const PartnerListCard = ({
  partner, onStatusChange, onUpdate, onDelete,
}: {
  partner:        User;
  onStatusChange: (userId: string, newStatus: "ACTIVE" | "SUSPENDED") => void;
  onUpdate?:      (userId: string, updated: Partial<User>) => void;
  onDelete?:      (userId: string) => void;
}) => {
  const { toast } = useToast();
  const color     = avatarColor(partner.nomComplet);
  const isActive  = partner.status === "ACTIVE";
  const joinDate  = new Date(partner.createdAt ?? "").toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });

  // ── Solde ──
  const [balance,    setBalance]    = useState<PartnerBalance | null>(null);
  const [loadingBal, setLoadingBal] = useState(true);
  const [errorBal,   setErrorBal]   = useState(false);

  // ── Code ──
  const [code,        setCode]        = useState<string | null>(null);
  const [codeVisible, setCodeVisible] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);
  const [codeCopied,  setCodeCopied]  = useState(false);

  // ── Statut ──
  const [toggling, setToggling] = useState(false);

  // ── Regénération ──
  const [regenModal,   setRegenModal]   = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [regenCode,    setRegenCode]    = useState<string | null>(null);
  const [regenVisible, setRegenVisible] = useState(true);
  const [regenCopied,  setRegenCopied]  = useState(false);

  // ── Historique ──
  const [showHistory, setShowHistory] = useState(false);

  // ── Photo zoom ──
  const [photoZoom, setPhotoZoom] = useState(false);

  // ── Modal modifier ──
  const [editModal,   setEditModal]   = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    nomComplet: partner.nomComplet,
    telephone:  partner.telephone,
    adresse:    partner.adresse ?? "",
    photo:      partner.photo   ?? "",
    code:       "",
  });
  const photoInputRef = useRef<HTMLInputElement>(null);

  // ── Modal supprimer ──
  const [deleteModal,   setDeleteModal]   = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteReason,  setDeleteReason]  = useState("");

  // ── Modal transaction ──
  const [txModal, setTxModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoadingBal(true);
      setErrorBal(false);
      try {
        const data = await PartnerBalanceService.getPartnerBalance(partner.id);
        setBalance(data);
      } catch {
        setErrorBal(true);
      } finally {
        setLoadingBal(false);
      }
    };
    load();
  }, [partner.id]);

  const fetchCode = async () => {
    if (code !== null) { setCodeVisible(v => !v); return; }
    setLoadingCode(true);
    try {
      const result = await AuthService.getUserCode(partner.id);
      setCode(result.codeClair ?? "—");
      setCodeVisible(true);
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.response?.data?.message || "Impossible de récupérer le code", variant: "destructive" });
    } finally {
      setLoadingCode(false);
    }
  };

  const copyCode = (c: string) => {
    navigator.clipboard.writeText(c);
    setCodeCopied(true);
    toast({ title: "✅ Code copié !" });
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleToggleStatus = async () => {
    setToggling(true);
    try {
      if (isActive) {
        await AuthService.suspendUser(partner.id);
        onStatusChange(partner.id, "SUSPENDED");
        toast({ title: "⏸ Partenaire suspendu", description: partner.nomComplet });
      } else {
        await AuthService.activateUser(partner.id);
        onStatusChange(partner.id, "ACTIVE");
        toast({ title: "✅ Partenaire activé", description: partner.nomComplet });
      }
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.response?.data?.message || "Impossible de modifier le statut", variant: "destructive" });
    } finally {
      setToggling(false);
    }
  };

  const handleRegen = async () => {
    setRegenLoading(true);
    try {
      const result = await AuthService.regenerateUserCode(partner.id);
      setRegenCode(result.codeAcces);
      setCode(result.codeAcces);
      setRegenVisible(true);
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.response?.data?.message || "Impossible de regénérer", variant: "destructive" });
    } finally {
      setRegenLoading(false);
    }
  };

  const copyRegen = () => {
    if (!regenCode) return;
    navigator.clipboard.writeText(regenCode);
    setRegenCopied(true);
    toast({ title: "✅ Nouveau code copié !" });
    setTimeout(() => setRegenCopied(false), 2000);
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setEditForm(f => ({ ...f, photo: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleEdit = async () => {
    setEditLoading(true);
    try {
      const payload: any = {};
      if (editForm.nomComplet.trim() !== partner.nomComplet)                 payload.nomComplet = editForm.nomComplet.trim();
      if (editForm.telephone.trim()  !== partner.telephone)                  payload.telephone  = editForm.telephone.trim();
      if ((editForm.adresse.trim()   || null) !== (partner.adresse ?? null)) payload.adresse    = editForm.adresse.trim() || null;
      if ((editForm.photo.trim()     || null) !== (partner.photo   ?? null)) payload.photo      = editForm.photo.trim()   || null;
      if (editForm.code.trim().length >= 4)                                  payload.code       = editForm.code.trim();

      if (Object.keys(payload).length === 0) {
        toast({ title: "Aucun changement détecté" });
        setEditModal(false);
        return;
      }
      const result = await AuthService.updateUser(partner.id, payload);
      toast({ title: "✅ Partenaire modifié", description: result.changements.join(", ") });
      onUpdate?.(partner.id, result.user);
      setEditModal(false);
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.response?.data?.message || "Impossible de modifier", variant: "destructive" });
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await AuthService.deleteUser(partner.id, deleteReason || undefined);
      toast({ title: "🗑 Partenaire supprimé", description: partner.nomComplet });
      onDelete?.(partner.id);
      setDeleteModal(false);
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.response?.data?.message || "Impossible de supprimer", variant: "destructive" });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      {/* ══════ MODAL PHOTO ZOOM ══════ */}
      {photoZoom && partner.photo && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setPhotoZoom(false)}>
          <div className="relative max-w-xs w-full mx-4" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPhotoZoom(false)} className="absolute -top-3 -right-3 z-10 h-8 w-8 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:bg-white transition-colors">
              <X className="h-4 w-4 text-gray-700" />
            </button>
            <img src={partner.photo} alt={partner.nomComplet} className="w-full rounded-2xl shadow-2xl object-cover" />
            <p className="text-center text-white/80 text-sm mt-3 font-medium">{partner.nomComplet}</p>
          </div>
        </div>,
        document.body
      )}

      {/* ══════ MODAL MODIFIER ══════ */}
      {editModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => !editLoading && setEditModal(false)} />
          <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-sm border border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-violet-100 flex items-center justify-center">
                  <Pencil className="h-4 w-4 text-violet-600" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm">Modifier le partenaire</p>
                  <p className="text-[11px] text-muted-foreground">{partner.nomComplet}</p>
                </div>
              </div>
              <button onClick={() => !editLoading && setEditModal(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
              {[
                { label: "Nom complet", key: "nomComplet", placeholder: "" },
                { label: "Téléphone",   key: "telephone",  placeholder: "" },
                { label: "Adresse",     key: "adresse",    placeholder: "Optionnel" },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">{label}</label>
                  <input
                    type="text"
                    value={editForm[key as keyof typeof editForm]}
                    onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-400/40"
                  />
                </div>
              ))}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Photo</label>
                {editForm.photo && (
                  <div className="relative mb-2 w-16 h-16 rounded-xl overflow-hidden border border-border">
                    <img src={editForm.photo} alt="Aperçu" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => { setEditForm(f => ({ ...f, photo: "" })); if (photoInputRef.current) photoInputRef.current.value = ""; }}
                      className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors">
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                )}
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoFileChange} />
                <button type="button" onClick={() => photoInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border bg-muted/30 hover:bg-muted hover:border-violet-400 text-muted-foreground hover:text-violet-600 text-xs font-semibold transition-all w-full justify-center">
                  <Upload className="h-3.5 w-3.5" />
                  {editForm.photo ? "Changer la photo" : "Sélectionner une photo"}
                </button>
                <div className="mt-2">
                  <p className="text-[10px] text-muted-foreground mb-1 text-center">ou coller une URL</p>
                  <input type="text" value={editForm.photo.startsWith("data:") ? "" : editForm.photo}
                    onChange={e => setEditForm(f => ({ ...f, photo: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-violet-400/40"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                  Nouveau code <span className="text-muted-foreground/50 normal-case font-normal">(laisser vide pour ne pas changer)</span>
                </label>
                <input type="text" value={editForm.code} onChange={e => setEditForm(f => ({ ...f, code: e.target.value }))}
                  placeholder="Min. 4 caractères"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-400/40"
                />
              </div>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-border">
              <button onClick={() => !editLoading && setEditModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-border text-muted-foreground hover:bg-muted transition-colors">Annuler</button>
              <button onClick={handleEdit} disabled={editLoading} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
                {editLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Enregistrer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ══════ MODAL SUPPRIMER ══════ */}
      {deleteModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => !deleteLoading && setDeleteModal(false)} />
          <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-sm border border-rose-300/50 overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <p className="font-bold text-foreground">Supprimer ce partenaire ?</p>
                <p className="text-xs text-muted-foreground">{partner.nomComplet}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="text-xs leading-relaxed">Cette action est <strong>irréversible</strong>. Le solde doit être à zéro pour procéder.</p>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                Raison <span className="font-normal normal-case">(optionnel)</span>
              </label>
              <input type="text" value={deleteReason} onChange={e => setDeleteReason(e.target.value)}
                placeholder="Ex : compte inactif, doublon..."
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-rose-400/40"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => !deleteLoading && setDeleteModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-border text-muted-foreground hover:bg-muted transition-colors">Annuler</button>
              <button onClick={handleDelete} disabled={deleteLoading} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
                {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Supprimer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ══════ MODAL REGEN CONFIRMATION ══════ */}
      {regenModal && !regenCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setRegenModal(false)} />
          <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-amber-300/50 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <RotateCcw className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-foreground">Regénérer le code ?</p>
                <p className="text-xs text-muted-foreground">L'ancien code sera <strong>invalidé</strong>.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="text-xs leading-relaxed">
                <strong>{partner.nomComplet}</strong> ne pourra plus se connecter avec l'ancien code. Le nouveau sera affiché <strong>une seule fois</strong>.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setRegenModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-border text-muted-foreground hover:bg-muted transition-colors">Annuler</button>
              <button onClick={handleRegen} disabled={regenLoading} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center gap-2 disabled:opacity-60">
                {regenLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════ MODAL NOUVEAU CODE REGEN ══════ */}
      {regenCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px]" />
          <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-amber-300/50 p-6 space-y-4">
            <div className="text-center">
              <div className="h-12 w-12 rounded-2xl bg-amber-500 flex items-center justify-center mx-auto mb-3">
                <KeyRound className="h-6 w-6 text-white" />
              </div>
              <p className="font-bold text-foreground">Nouveau code généré</p>
              <p className="text-xs text-muted-foreground mt-0.5">{partner.nomComplet}</p>
            </div>
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-muted border border-border">
              <code className="flex-1 text-lg font-mono font-bold text-foreground tracking-[0.3em]">
                {regenVisible ? regenCode : "••••••"}
              </code>
              <button onClick={() => setRegenVisible(v => !v)} className="p-1.5 rounded-lg hover:bg-background text-muted-foreground">
                {regenVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button onClick={copyRegen} className="p-1.5 rounded-lg hover:bg-background text-muted-foreground">
                {regenCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="text-xs font-medium">Ce code ne sera <strong>jamais affiché à nouveau</strong>.</p>
            </div>
            <button onClick={() => { setRegenCode(null); setRegenModal(false); }}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground">
              J'ai noté le code — Fermer
            </button>
          </div>
        </div>
      )}

      {/* ══════ MODAL TRANSACTION DIRECTE ADMIN ══════ */}
      {txModal && createPortal(
        <AdminTransactionModal
          partner={partner}
          onClose={() => setTxModal(false)}
          onSuccess={(updatedBalance) => { setBalance(updatedBalance); setTxModal(false); }}
        />,
        document.body
      )}

      {/* ══════ DRAWER HISTORIQUE ══════ */}
      {showHistory && createPortal(
        <PartnerTransactionHistory
          partnerId={partner.id}
          partnerName={partner.nomComplet}
          onClose={() => setShowHistory(false)}
          fetchHistory={(id, filters) => PartnerBalanceService.getPartnerHistory(id, filters)}
          onTransactionDeleted={() => PartnerBalanceService.getPartnerBalance(partner.id).then(setBalance)}
          onTransactionUpdated={() => PartnerBalanceService.getPartnerBalance(partner.id).then(setBalance)}
        />,
        document.body
      )}

      {/* ══════════════════════════════════════════
          CARD PRINCIPALE
      ══════════════════════════════════════════ */}
      <div className="bg-card rounded-2xl border border-border hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
        <div className={`h-0.5 w-full ${isActive
          ? "bg-gradient-to-r from-emerald-400 to-teal-400"
          : "bg-gradient-to-r from-rose-400 to-red-400"}`}
        />
        <div className="p-5">
          {/* ── Header ── */}
          <div className="flex items-start gap-3 mb-3">
            <div className="relative flex-shrink-0">
              {partner.photo ? (
                <button onClick={() => setPhotoZoom(true)} className="group relative h-12 w-12 rounded-xl overflow-hidden border border-border focus:outline-none">
                  <img src={partner.photo} alt={partner.nomComplet} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ) : (
                <div className={`h-12 w-12 rounded-xl ${color.bg} ${color.text} font-bold text-sm flex items-center justify-center`}>
                  {getInitials(partner.nomComplet)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="font-bold text-foreground text-sm truncate">{partner.nomComplet}</p>
                <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                }`}>
                  {isActive ? <><BadgeCheck className="h-3 w-3" />Actif</> : <><ShieldOff className="h-3 w-3" />Suspendu</>}
                </span>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3 flex-shrink-0" />{partner.telephone}
              </p>
              {!loadingBal && !errorBal && balance && (
                <div className="mt-1">
                  <SoldeBadge etat={balance.solde.etat} montantAbsolu={balance.solde.montantAbsolu} />
                </div>
              )}
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button onClick={() => { setEditForm({ nomComplet: partner.nomComplet, telephone: partner.telephone, adresse: partner.adresse ?? "", photo: partner.photo ?? "", code: "" }); setEditModal(true); }}
                className="p-1.5 rounded-lg hover:bg-violet-50 text-muted-foreground hover:text-violet-600 transition-colors" title="Modifier">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => { setDeleteReason(""); setDeleteModal(true); }}
                className="p-1.5 rounded-lg hover:bg-rose-50 text-muted-foreground hover:text-rose-600 transition-colors" title="Supprimer">
                <Trash2 className="h-4 w-4" />
              </button>
              <button onClick={handleToggleStatus} disabled={toggling}
                title={isActive ? "Suspendre le compte" : "Activer le compte"}
                className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                  isActive ? "hover:bg-rose-50 text-muted-foreground hover:text-rose-500" : "hover:bg-emerald-50 text-muted-foreground hover:text-emerald-600"
                }`}>
                {toggling ? <Loader2 className="h-4 w-4 animate-spin" /> : isActive ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Infos */}
          <div className="space-y-1 mb-3">
            {partner.adresse && (
              <div className="flex items-start gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">{partner.adresse}</p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <p className="text-xs text-muted-foreground">Depuis le <span className="font-semibold text-foreground">{joinDate}</span></p>
            </div>
          </div>

          {/* Bloc solde */}
          {loadingBal ? (
            <div className="rounded-xl border border-border bg-muted/20 p-3 mb-3 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Chargement solde...</span>
            </div>
          ) : errorBal ? (
            <div className="rounded-xl border border-border bg-muted/20 p-3 mb-3 text-center">
              <p className="text-xs text-muted-foreground">Solde indisponible</p>
            </div>
          ) : balance ? (
            <SoldeBlock balance={balance} />
          ) : null}

          {/* Zone code */}
          <div className="mb-3 rounded-xl border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Code d'accès</span>
              </div>
              <button onClick={() => setRegenModal(true)} className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-amber-600 transition-colors">
                <RotateCcw className="h-3 w-3" />Regénérer
              </button>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono font-bold text-foreground tracking-[0.25em]">
                {codeVisible && code !== null ? code : "••••••"}
              </code>
              <button onClick={fetchCode} disabled={loadingCode} className="p-1.5 rounded-lg hover:bg-background text-muted-foreground disabled:opacity-50">
                {loadingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : codeVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              {codeVisible && code !== null && (
                <button onClick={() => copyCode(code)} className="p-1.5 rounded-lg hover:bg-background text-muted-foreground">
                  {codeCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </button>
              )}
            </div>
          </div>

          {/* Bouton Transaction directe admin */}
          <button onClick={() => setTxModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 mb-2 rounded-xl text-sm font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/20 transition-all">
            <ArrowRightLeft className="h-4 w-4" />Dépôt / Retrait direct
          </button>

          {/* Bouton Historique */}
          <button onClick={() => setShowHistory(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-muted/60 text-foreground hover:bg-muted border border-border transition-all">
            <History className="h-4 w-4 text-primary" />Historique des transactions
          </button>
        </div>
      </div>
    </>
  );
};

export default PartnerListCard;