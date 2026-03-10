// src/pages/FrequentPartnersPage.tsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import DashboardSidebar from "@/components/DashboardSidebar";
import {
  Users, RefreshCw, Loader2, UserPlus, TrendingUp,
  Phone, X, AlertTriangle, Check, Copy, Eye, EyeOff,
  ChevronRight, Sparkles, ArrowRight, Search, Plus,
  ChevronLeft, Filter, Star, Repeat,
  ArrowUpCircle, ArrowDownCircle, BadgeCheck, ShieldOff,
  MapPin, Calendar, List, KeyRound, RotateCcw,
  ToggleLeft, ToggleRight, Wand2, History, Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import TransactionService from "@/services/TransactionService";
import AuthService from "@/services/Authservice";
import PartnerBalanceService from "@/services/PartnerBalanceService";
import { PartnerTransactionHistory } from "@/components/PartnerTransactionHistory";
import userRoutes from "@/Routes/Userroutes";
import type {
  FrequentFreePartner,
  ConvertFreePartnerPayload,
  ConvertFreePartnerResponse,
} from "@/types/transaction.types";
import type { User } from "@/Routes/Userroutes";
import type { PartnerBalance, BalanceEtat } from "@/Routes/PartnerBalanceRoutes";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => Math.abs(n).toLocaleString("fr-FR") + "\u202FF";
const PAGE_SIZE = 6;

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

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Tab     = "frequent" | "list" | "create";
type SortKey = "transactions" | "volume" | "recent";

interface NewPartnerForm {
  nomComplet: string;
  telephone:  string;
  code:       string;
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
                                     <ArrowDownCircle  className={`h-5 w-5 ${textColor}`} />;

  return (
    <div className={`rounded-xl border p-3 mb-3 ${bgColor}`}>
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <div className="min-w-0">
            <p className={`text-xs font-bold ${textColor}`}>
              {solde.etat === "SOLDE"         ? "Compte soldé"  :
               solde.etat === "BOUTIQUE_DOIT" ? "Boutique doit" :
                                                "Partenaire doit"}
            </p>
            {solde.etat !== "SOLDE" && (
              <p className={`text-sm sm:text-lg font-extrabold tabular-nums ${textColor} break-all`}>
                {fmt(solde.montantAbsolu)}
              </p>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] text-muted-foreground">
            {statistiques.nombreTransactions} op.
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
          <p className="text-xs sm:text-sm font-extrabold text-green-800 tabular-nums break-all">{fmt(statistiques.totalDepots)}</p>
        </div>
        <div className="bg-white/60 rounded-lg px-2.5 py-1.5">
          <div className="flex items-center gap-1 mb-0.5">
            <ArrowDownCircle className="h-3 w-3 text-orange-600" />
            <p className="text-[10px] font-bold text-orange-700 uppercase tracking-wide">Retraits</p>
          </div>
          <p className="text-xs sm:text-sm font-extrabold text-orange-800 tabular-nums break-all">{fmt(statistiques.totalRetraits)}</p>
        </div>
      </div>
    </div>
  );
};

// ─── MODAL CONVERSION ─────────────────────────────────────────────────────────

const ConvertModal = ({
  partner, onClose, onSuccess,
}: {
  partner:   FrequentFreePartner;
  onClose:   () => void;
  onSuccess: (result: ConvertFreePartnerResponse) => void;
}) => {
  const [phone, setPhone]     = useState(partner.telephoneLibre ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const color = avatarColor(partner.partenaireNom);

  const handleConvert = async () => {
    if (!phone.trim()) { setError("Numéro de téléphone requis"); return; }
    setLoading(true); setError(null);
    try {
      const result = await TransactionService.convertFreePartner({
        partenaireNom:  partner.partenaireNom,
        telephoneLibre: phone.trim(),
      } as ConvertFreePartnerPayload);
      onSuccess(result);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Une erreur est survenue");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden border border-primary/20">
        <div className="w-12 h-1 bg-muted rounded-full mx-auto mt-3 mb-1 sm:hidden" />
        <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-border bg-primary/5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl ${color.bg} ${color.text} font-bold text-sm flex items-center justify-center flex-shrink-0`}>
                {getInitials(partner.partenaireNom)}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-foreground text-sm sm:text-base">Convertir en partenaire</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  <span className="font-semibold text-foreground">{partner.partenaireNom}</span>
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0 ml-2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
        <div className="p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/40 rounded-xl p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Transactions</p>
              <p className="text-xl font-extrabold text-foreground tabular-nums mt-0.5">{partner.nombreTransactions}</p>
            </div>
            <div className="bg-muted/40 rounded-xl p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dépôts</p>
              <p className="text-sm font-extrabold text-foreground tabular-nums mt-0.5 break-all">{fmt(partner.totalDepots)}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Téléphone <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="Ex: 77 123 45 67" className="pl-9 h-11" autoFocus maxLength={20} />
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p className="text-xs leading-relaxed">
              Le <strong>code d'accès</strong> sera affiché <strong>une seule fois</strong>. Notez-le immédiatement.
            </p>
          </div>
          {error && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-border text-muted-foreground hover:bg-muted transition-colors">
              Annuler
            </button>
            <button onClick={handleConvert} disabled={loading || !phone.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-2 transition-all disabled:opacity-60">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Conversion...</> : <><UserPlus className="h-4 w-4" />Convertir</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── MODAL CODE ACCÈS ─────────────────────────────────────────────────────────

const AccessCodeModal = ({
  codeAcces, partnerName, onClose,
}: { codeAcces: string; partnerName: string; onClose: () => void }) => {
  const { toast } = useToast();
  const [visible, setVisible] = useState(true);
  const [copied,  setCopied]  = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(codeAcces);
    setCopied(true);
    toast({ title: "✅ Copié !" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px]" />
      <div className="relative bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm overflow-hidden border border-green-400/40">
        <div className="w-12 h-1 bg-muted rounded-full mx-auto mt-3 mb-1 sm:hidden" />
        <div className="px-6 py-5 sm:py-6 text-center bg-green-500/10">
          <div className="h-14 w-14 rounded-2xl bg-green-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-green-500/25">
            <Check className="h-7 w-7 text-white" />
          </div>
          <p className="font-bold text-foreground text-base">Compte créé !</p>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="font-semibold text-foreground">{partnerName}</span> est maintenant partenaire.
          </p>
        </div>
        <div className="p-5 sm:p-6 space-y-4">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
              Code d'accès — une seule fois
            </p>
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-muted border border-border">
              <code className="flex-1 text-lg font-mono font-bold text-foreground tracking-[0.3em]">
                {visible ? codeAcces : "••••••"}
              </code>
              <button onClick={() => setVisible(v => !v)} className="p-1.5 rounded-lg hover:bg-background transition-colors text-muted-foreground">
                {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button onClick={copy} className="p-1.5 rounded-lg hover:bg-background transition-colors text-muted-foreground">
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p className="text-xs leading-relaxed font-medium">
              Ce code ne sera <strong>jamais affiché à nouveau</strong>. Transmettez-le maintenant.
            </p>
          </div>
          <button onClick={onClose} className="w-full py-3 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all">
            J'ai noté le code — Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── CARD PARTENAIRE FRÉQUENT ─────────────────────────────────────────────────

const FrequentCard = ({
  partner, index, onConvert,
}: { partner: FrequentFreePartner; index: number; onConvert: (p: FrequentFreePartner) => void }) => {
  const color  = avatarColor(partner.partenaireNom);
  const isTop3 = index < 3;

  return (
    <div className={`bg-card rounded-2xl border overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group ${
      isTop3 ? "border-amber-200/70" : "border-border hover:border-primary/20"
    }`}>
      {isTop3 && <div className="h-0.5 w-full bg-gradient-to-r from-amber-400 to-orange-400" />}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`relative h-10 w-10 sm:h-11 sm:w-11 rounded-xl ${color.bg} ${color.text} font-bold text-sm flex items-center justify-center flex-shrink-0`}>
              {getInitials(partner.partenaireNom)}
              {isTop3 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-amber-400 rounded-full flex items-center justify-center">
                  <Star className="h-2.5 w-2.5 text-white fill-white" />
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-foreground text-sm truncate">{partner.partenaireNom}</p>
              {partner.telephoneLibre
                ? <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Phone className="h-3 w-3 flex-shrink-0" />{partner.telephoneLibre}</p>
                : <p className="text-xs text-muted-foreground/50 mt-0.5 italic">Sans téléphone</p>
              }
            </div>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-primary/10 text-primary flex-shrink-0">
            <Repeat className="h-2.5 w-2.5" />{partner.nombreTransactions}x
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-green-50 rounded-xl px-2.5 sm:px-3 py-2.5">
            <div className="flex items-center gap-1 mb-0.5">
              <ArrowUpCircle className="h-3 w-3 text-green-600" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-green-700">Dépôts</p>
            </div>
            <p className="text-xs sm:text-sm font-extrabold text-green-800 tabular-nums break-all">{fmt(partner.totalDepots)}</p>
          </div>
          <div className="bg-blue-50 rounded-xl px-2.5 sm:px-3 py-2.5">
            <div className="flex items-center gap-1 mb-0.5">
              <ArrowDownCircle className="h-3 w-3 text-blue-600" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Retraits</p>
            </div>
            <p className="text-xs sm:text-sm font-extrabold text-blue-800 tabular-nums break-all">{fmt(partner.totalRetraits)}</p>
          </div>
        </div>
        {partner.derniereTransaction && (
          <p className="text-[11px] text-muted-foreground mb-4">
            Dernière activité :{" "}
            <span className="font-semibold text-foreground">
              {new Date(partner.derniereTransaction).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          </p>
        )}
        <button
          onClick={() => onConvert(partner)}
          disabled={!partner.peutConvertir}
          title={!partner.peutConvertir ? "Téléphone requis pour convertir" : undefined}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          <UserPlus className="h-4 w-4" />Convertir<ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

// ─── CARD PARTENAIRE ENREGISTRÉ ───────────────────────────────────────────────

const PartnerListCard = ({
  partner, onStatusChange,
}: {
  partner:        User;
  onStatusChange: (userId: string, newStatus: "ACTIVE" | "SUSPENDED") => void;
}) => {
  const { toast } = useToast();
  const color    = avatarColor(partner.nomComplet);
  const isActive = partner.status === "ACTIVE";
  const joinDate = new Date(partner.createdAt ?? "").toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });

  const [balance,     setBalance]     = useState<PartnerBalance | null>(null);
  const [loadingBal,  setLoadingBal]  = useState(true);
  const [errorBal,    setErrorBal]    = useState(false);
  const [code,        setCode]        = useState<string | null>(null);
  const [codeVisible, setCodeVisible] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);
  const [codeCopied,  setCodeCopied]  = useState(false);
  const [toggling,    setToggling]    = useState(false);
  const [regenModal,   setRegenModal]   = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [regenCode,    setRegenCode]    = useState<string | null>(null);
  const [regenVisible, setRegenVisible] = useState(true);
  const [regenCopied,  setRegenCopied]  = useState(false);
  const [showHistory,  setShowHistory]  = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoadingBal(true); setErrorBal(false);
      try {
        const data = await PartnerBalanceService.getPartnerBalance(partner.id);
        setBalance(data);
      } catch { setErrorBal(true); }
      finally { setLoadingBal(false); }
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
    } finally { setLoadingCode(false); }
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
    } finally { setToggling(false); }
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
    } finally { setRegenLoading(false); }
  };

  const copyRegen = () => {
    if (!regenCode) return;
    navigator.clipboard.writeText(regenCode);
    setRegenCopied(true);
    toast({ title: "✅ Nouveau code copié !" });
    setTimeout(() => setRegenCopied(false), 2000);
  };

  return (
    <>
      {/* ── Modal confirmation regénération ── */}
      {regenModal && !regenCode && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setRegenModal(false)} />
          <div className="relative bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm overflow-hidden border border-amber-300/50 p-5 sm:p-6 space-y-4">
            <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-2 sm:hidden" />
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
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
                <strong>{partner.nomComplet}</strong> ne pourra plus se connecter avec l'ancien code.
                Le nouveau sera affiché <strong>une seule fois</strong>.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setRegenModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-border text-muted-foreground hover:bg-muted transition-colors">
                Annuler
              </button>
              <button onClick={handleRegen} disabled={regenLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60">
                {regenLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal nouveau code ── */}
      {regenCode && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px]" />
          <div className="relative bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm overflow-hidden border border-amber-300/50 p-5 sm:p-6 space-y-4">
            <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-2 sm:hidden" />
            <div className="text-center mb-1">
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
              <button onClick={() => setRegenVisible(v => !v)} className="p-1.5 rounded-lg hover:bg-background transition-colors text-muted-foreground">
                {regenVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button onClick={copyRegen} className="p-1.5 rounded-lg hover:bg-background transition-colors text-muted-foreground">
                {regenCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="text-xs font-medium leading-relaxed">Ce code ne sera <strong>jamais affiché à nouveau</strong>.</p>
            </div>
            <button onClick={() => { setRegenCode(null); setRegenModal(false); }}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all">
              J'ai noté le code — Fermer
            </button>
          </div>
        </div>
      )}

      {/* ── Historique via portal ── */}
      {showHistory && createPortal(
        <PartnerTransactionHistory
          partnerId={partner.id}
          partnerName={partner.nomComplet}
          onClose={() => setShowHistory(false)}
          fetchHistory={PartnerBalanceService.getPartnerHistory}
        />,
        document.body
      )}

      {/* ── Card ── */}
      <div className="bg-card rounded-2xl border border-border hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
        <div className={`h-0.5 w-full ${isActive
          ? "bg-gradient-to-r from-emerald-400 to-teal-400"
          : "bg-gradient-to-r from-rose-400 to-red-400"}`}
        />
        <div className="p-4 sm:p-5">

          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            {partner.photo ? (
              <img src={partner.photo} alt={partner.nomComplet}
                className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl object-cover flex-shrink-0 border border-border" />
            ) : (
              <div className={`h-11 w-11 sm:h-12 sm:w-12 rounded-xl ${color.bg} ${color.text} font-bold text-sm flex items-center justify-center flex-shrink-0`}>
                {getInitials(partner.nomComplet)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-foreground text-sm truncate">{partner.nomComplet}</p>
                <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                  isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                }`}>
                  {isActive ? <><BadgeCheck className="h-3 w-3" />Actif</> : <><ShieldOff className="h-3 w-3" />Suspendu</>}
                </span>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Phone className="h-3 w-3 flex-shrink-0" />{partner.telephone}
              </p>
              {!loadingBal && !errorBal && balance && (
                <div className="mt-1.5">
                  <SoldeBadge etat={balance.solde.etat} montantAbsolu={balance.solde.montantAbsolu} />
                </div>
              )}
              {loadingBal && (
                <div className="mt-1.5 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Solde...</span>
                </div>
              )}
            </div>
          </div>

          {/* Infos */}
          <div className="space-y-1.5 mb-4">
            {partner.adresse && (
              <div className="flex items-start gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">{partner.adresse}</p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Depuis le <span className="font-semibold text-foreground">{joinDate}</span>
              </p>
            </div>
          </div>

          {/* Solde */}
          {loadingBal ? (
            <div className="rounded-xl border border-border bg-muted/20 p-3 mb-3 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Calcul du solde...</span>
            </div>
          ) : errorBal ? (
            <div className="rounded-xl border border-border bg-muted/20 p-3 mb-3 text-center">
              <p className="text-xs text-muted-foreground">Solde indisponible</p>
            </div>
          ) : balance ? (
            <SoldeBlock balance={balance} />
          ) : null}

          {/* Code */}
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
              <button onClick={fetchCode} disabled={loadingCode}
                className="p-1.5 rounded-lg hover:bg-background transition-colors text-muted-foreground disabled:opacity-50"
                title={codeVisible ? "Masquer" : "Voir le code"}>
                {loadingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : codeVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              {codeVisible && code !== null && (
                <button onClick={() => copyCode(code)} className="p-1.5 rounded-lg hover:bg-background transition-colors text-muted-foreground" title="Copier le code">
                  {codeCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </button>
              )}
            </div>
          </div>

          {/* Bouton historique */}
          <button onClick={() => setShowHistory(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 mb-2 rounded-xl text-sm font-semibold bg-muted/60 text-foreground hover:bg-muted border border-border transition-all">
            <History className="h-4 w-4 text-primary" />
            Historique des transactions
          </button>

          {/* Activer / suspendre */}
          <button onClick={handleToggleStatus} disabled={toggling}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 ${
              isActive
                ? "bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
            }`}>
            {toggling
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : isActive
                ? <><ToggleLeft  className="h-4 w-4" />Suspendre le compte</>
                : <><ToggleRight className="h-4 w-4" />Activer le compte</>}
          </button>
        </div>
      </div>
    </>
  );
};

// ─── FORMULAIRE CRÉATION ──────────────────────────────────────────────────────

const CreatePartnerForm = ({ onSuccess }: { onSuccess: (name: string, code: string) => void }) => {
  const { toast } = useToast();
  const [form, setForm]         = useState<NewPartnerForm>({ nomComplet: "", telephone: "", code: "" });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);

  const set = (k: keyof NewPartnerForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const isValid      = form.nomComplet.trim().length >= 2 && form.telephone.trim().length >= 6;
  const codeIsCustom = form.code.trim().length >= 4;

  const handleCreate = async () => {
    if (!isValid) return;
    setLoading(true); setError(null);
    try {
      const { data } = await userRoutes.createUser({
        nomComplet: form.nomComplet.trim(),
        telephone:  form.telephone.trim(),
        code:       codeIsCustom ? form.code.trim() : null,
        role:       "PARTENAIRE",
      });
      const codeAcces = data?.data?.codeAcces ?? form.code.trim();
      const name      = data?.data?.user?.nomComplet ?? form.nomComplet.trim();
      toast({ title: "✅ Partenaire créé", description: name });
      onSuccess(name, codeAcces);
      setForm({ nomComplet: "", telephone: "", code: "" });
    } catch (e: any) {
      setError(e?.response?.data?.message || "Erreur lors de la création");
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground">Nouveau partenaire</p>
              <p className="text-xs text-muted-foreground">Création directe d'un compte partenaire</p>
            </div>
          </div>
        </div>
        <div className="p-5 sm:p-6 space-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Nom complet <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={form.nomComplet} onChange={set("nomComplet")} placeholder="Ex: Mamadou Diallo" className="pl-9 h-11" maxLength={100} />
            </div>
            {form.nomComplet.length > 0 && form.nomComplet.trim().length < 2 && (
              <p className="text-[11px] text-destructive">Minimum 2 caractères</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Téléphone <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={form.telephone} onChange={set("telephone")} placeholder="Ex: 77 123 45 67" className="pl-9 h-11" maxLength={20} />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Code d'accès
                <span className="ml-1.5 text-[10px] font-medium text-muted-foreground/60 normal-case tracking-normal">(optionnel)</span>
              </Label>
              {form.code.trim().length === 0 ? (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-sky-600 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
                  <Wand2 className="h-3 w-3" />Auto-généré
                </span>
              ) : codeIsCustom ? (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <Check className="h-3 w-3" />Code personnalisé
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-amber-600">Minimum 4 caractères</span>
              )}
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showCode ? "text" : "password"}
                value={form.code}
                onChange={set("code")}
                placeholder="Laisser vide = auto-généré"
                className="pl-9 pr-10 h-11 font-mono tracking-widest"
                maxLength={10}
              />
              <button type="button" onClick={() => setShowCode(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p className="text-xs leading-relaxed">
              {codeIsCustom
                ? <>Le code <strong>{showCode ? form.code : "••••••"}</strong> sera utilisé. Transmettez-le au partenaire en personne.</>
                : <>Un code à 6 chiffres sera <strong>généré automatiquement</strong> et affiché une seule fois.</>}
            </p>
          </div>
          {error && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
          <button onClick={handleCreate} disabled={!isValid || loading}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Création...</> : <><Plus className="h-4 w-4" />Créer le partenaire</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── PAGE PRINCIPALE ──────────────────────────────────────────────────────────

const FrequentPartnersPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tab, setTab]                 = useState<Tab>("list");
  const [partners, setPartners]       = useState<FrequentFreePartner[]>([]);
  const [regPartners, setRegPartners] = useState<User[]>([]);
  const [loading, setLoading]         = useState(true);
  const [loadingReg, setLoadingReg]   = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [errorReg, setErrorReg]       = useState<string | null>(null);
  const [toConvert, setToConvert]     = useState<FrequentFreePartner | null>(null);
  const [accessCode, setAccessCode]   = useState<{ name: string; code: string } | null>(null);

  const [search, setSearch] = useState("");
  const [sort, setSort]     = useState<SortKey>("transactions");
  const [page, setPage]     = useState(1);

  const [searchReg, setSearchReg]       = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "SUSPENDED">("ALL");
  const [pageReg, setPageReg]           = useState(1);

  const fetchFrequent = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError(null);
    try {
      const data = await TransactionService.getFrequentFreePartners();
      setPartners(data); setPage(1);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Erreur lors du chargement");
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  const fetchRegistered = useCallback(async () => {
    setLoadingReg(true); setErrorReg(null);
    try {
      const { data } = await userRoutes.getPartners({ limit: 100 });
      setRegPartners(data?.data?.partners ?? []);
      setPageReg(1);
    } catch (e: any) {
      setErrorReg(e?.response?.data?.message || "Erreur lors du chargement");
    } finally { setLoadingReg(false); }
  }, []);

  useEffect(() => { fetchFrequent(); fetchRegistered(); }, [fetchFrequent, fetchRegistered]);

  const handleStatusChange = (userId: string, newStatus: "ACTIVE" | "SUSPENDED") => {
    setRegPartners(prev => prev.map(p => p.id === userId ? { ...p, status: newStatus } : p));
  };

  const filteredReg = useMemo(() => {
    let list = [...regPartners];
    if (filterStatus !== "ALL") list = list.filter(p => p.status === filterStatus);
    if (searchReg.trim()) {
      const q = searchReg.toLowerCase();
      list = list.filter(p =>
        p.nomComplet.toLowerCase().includes(q) ||
        p.telephone.includes(q) ||
        p.adresse?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [regPartners, filterStatus, searchReg]);

  const totalPagesReg = Math.max(1, Math.ceil(filteredReg.length / PAGE_SIZE));
  const paginatedReg  = filteredReg.slice((pageReg - 1) * PAGE_SIZE, pageReg * PAGE_SIZE);

  const filtered = useMemo(() => {
    let list = [...partners];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.partenaireNom.toLowerCase().includes(q) || p.telephoneLibre?.includes(q));
    }
    list.sort((a, b) => {
      if (sort === "transactions") return b.nombreTransactions - a.nombreTransactions;
      if (sort === "volume")       return (b.totalDepots + b.totalRetraits) - (a.totalDepots + a.totalRetraits);
      if (sort === "recent")       return new Date(b.derniereTransaction).getTime() - new Date(a.derniereTransaction).getTime();
      return 0;
    });
    return list;
  }, [partners, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleConvertSuccess = (result: ConvertFreePartnerResponse) => {
    const name = toConvert?.partenaireNom ?? "";
    setToConvert(null);
    setAccessCode({ name, code: result.codeAcces });
    setPartners(prev => prev.filter(p => p.partenaireNom !== name));
    fetchRegistered();
  };

  const handleCreateSuccess = (name: string, code: string) => {
    setAccessCode({ name, code });
    fetchRegistered();
  };

  const SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: "transactions", label: "Fréquence" },
    { value: "volume",       label: "Volume"    },
    { value: "recent",       label: "Récents"   },
  ];

  const activeCount    = regPartners.filter(p => p.status === "ACTIVE").length;
  const suspendedCount = regPartners.filter(p => p.status === "SUSPENDED").length;

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />

      {toConvert && (
        <ConvertModal partner={toConvert} onClose={() => setToConvert(null)} onSuccess={handleConvertSuccess} />
      )}
      {accessCode && (
        <AccessCodeModal codeAcces={accessCode.code} partnerName={accessCode.name} onClose={() => setAccessCode(null)} />
      )}

      <main className="flex-1 min-w-0 p-3 sm:p-6 overflow-auto">

        {/* ── HEADER ── */}
        <div className="flex items-start justify-between mb-4 sm:mb-6 gap-2">
          <div className="flex items-start gap-2 sm:gap-3 min-w-0">
            {/* Hamburger mobile */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-card border border-input hover:bg-muted transition-colors flex-shrink-0 mt-0.5"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5 sm:mb-1">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <h1 className="text-lg sm:text-2xl font-bold text-foreground leading-tight">Partenaires</h1>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                Gérez vos partenaires enregistrés, les fréquents et créez de nouveaux comptes.
              </p>
            </div>
          </div>
          <button onClick={() => { fetchFrequent(true); fetchRegistered(); }} disabled={refreshing}
            className="p-2 rounded-lg bg-card border border-input hover:bg-muted transition-colors disabled:opacity-50 flex-shrink-0">
            <RefreshCw className={`h-4 w-4 text-muted-foreground ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* ── STATS ── */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="bg-card rounded-xl border border-border p-3 sm:p-4 text-center">
            <p className="text-xl sm:text-2xl font-extrabold text-foreground tabular-nums">{regPartners.length}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium mt-0.5">Total</p>
          </div>
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-3 sm:p-4 text-center">
            <p className="text-xl sm:text-2xl font-extrabold text-emerald-700 tabular-nums">{activeCount}</p>
            <p className="text-[10px] sm:text-xs text-emerald-600 font-medium mt-0.5">Actifs</p>
          </div>
          <div className="bg-rose-50 rounded-xl border border-rose-200 p-3 sm:p-4 text-center">
            <p className="text-xl sm:text-2xl font-extrabold text-rose-700 tabular-nums">{suspendedCount}</p>
            <p className="text-[10px] sm:text-xs text-rose-600 font-medium mt-0.5">Suspendus</p>
          </div>
        </div>

        {/* ── ONGLETS ── */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-xl mb-4 sm:mb-6 overflow-x-auto">
          {([
            { key: "list",     icon: List,    label: "Enregistrés", count: regPartners.length, color: "bg-primary"   },
            { key: "frequent", icon: Sparkles, label: "Fréquents",  count: partners.length,    color: "bg-amber-500" },
            { key: "create",   icon: Plus,     label: "Créer",      count: null,               color: ""            },
          ] as const).map(({ key, icon: Icon, label, count, color }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                tab === key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}>
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />{label}
              {count != null && count > 0 && (
                <span className={`h-4 sm:h-5 min-w-4 sm:min-w-5 px-1 sm:px-1.5 rounded-full ${color} text-white text-[9px] sm:text-[10px] font-bold flex items-center justify-center`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── TAB LISTE ── */}
        {tab === "list" && (
          <>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
              <div className="relative flex-1 min-w-0" style={{ minWidth: "160px" }}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={searchReg} onChange={e => { setSearchReg(e.target.value); setPageReg(1); }}
                  placeholder="Nom, téléphone..." className="pl-8 h-9 text-sm" />
                {searchReg && (
                  <button onClick={() => setSearchReg("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 flex-shrink-0">
                {(["ALL", "ACTIVE", "SUSPENDED"] as const).map(s => (
                  <button key={s} onClick={() => { setFilterStatus(s); setPageReg(1); }}
                    className={`px-2 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                      filterStatus === s ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}>
                    {s === "ALL" ? "Tous" : s === "ACTIVE" ? "Actifs" : "Suspendus"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground flex-shrink-0">{filteredReg.length} résultat{filteredReg.length > 1 ? "s" : ""}</p>
            </div>

            {loadingReg && (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Chargement...</p>
              </div>
            )}
            {errorReg && !loadingReg && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
                <p className="text-destructive font-medium mb-3">{errorReg}</p>
                <Button variant="outline" onClick={fetchRegistered}>Réessayer</Button>
              </div>
            )}
            {!loadingReg && !errorReg && (
              paginatedReg.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <Users className="h-7 w-7 text-muted-foreground/40" />
                  </div>
                  <p className="font-semibold text-foreground mb-1">
                    {searchReg || filterStatus !== "ALL" ? "Aucun résultat" : "Aucun partenaire enregistré"}
                  </p>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    {searchReg || filterStatus !== "ALL" ? "Essayez d'autres filtres." : "Créez votre premier partenaire via l'onglet Créer."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-5 sm:mb-6">
                    {paginatedReg.map(p => (
                      <PartnerListCard key={p.id} partner={p} onStatusChange={handleStatusChange} />
                    ))}
                  </div>
                  {totalPagesReg > 1 && (
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => setPageReg(p => Math.max(1, p - 1))} disabled={pageReg === 1}
                        className="p-2 rounded-lg border border-input bg-card hover:bg-muted disabled:opacity-30 transition-colors">
                        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                      </button>
                      {Array.from({ length: totalPagesReg }, (_, i) => i + 1).map(n => (
                        <button key={n} onClick={() => setPageReg(n)}
                          className={`h-8 w-8 rounded-lg text-sm font-semibold transition-all ${
                            n === pageReg ? "bg-primary text-primary-foreground shadow-sm" : "border border-input bg-card hover:bg-muted text-muted-foreground"
                          }`}>{n}</button>
                      ))}
                      <button onClick={() => setPageReg(p => Math.min(totalPagesReg, p + 1))} disabled={pageReg === totalPagesReg}
                        className="p-2 rounded-lg border border-input bg-card hover:bg-muted disabled:opacity-30 transition-colors">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  )}
                </>
              )
            )}
          </>
        )}

        {/* ── TAB FRÉQUENTS ── */}
        {tab === "frequent" && (
          <>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 sm:p-4 mb-4 sm:mb-5 flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-4 w-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800">Partenaires libres fréquents</p>
                <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                  Ces personnes reviennent régulièrement sans compte (≥ 3 transactions / 3 jours).
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            </div>

            {!loading && !error && partners.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
                <div className="relative flex-1" style={{ minWidth: "160px" }}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Rechercher..." className="pl-8 h-9 text-sm" />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 flex-shrink-0">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground ml-1.5 mr-0.5" />
                  {SORT_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => { setSort(opt.value); setPage(1); }}
                      className={`px-2 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                        sort === opt.value ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground flex-shrink-0">{filtered.length} résultat{filtered.length > 1 ? "s" : ""}</p>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Chargement...</p>
              </div>
            )}
            {error && !loading && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
                <p className="text-destructive font-medium mb-3">{error}</p>
                <Button variant="outline" onClick={() => fetchFrequent()}>Réessayer</Button>
              </div>
            )}
            {!loading && !error && (
              paginated.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <Sparkles className="h-7 w-7 text-muted-foreground/40" />
                  </div>
                  <p className="font-semibold text-foreground mb-1">
                    {search ? "Aucun résultat" : "Aucun partenaire libre fréquent"}
                  </p>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    {search ? "Essayez un autre terme." : "Les partenaires libres ≥ 3× apparaîtront ici."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-5 sm:mb-6">
                    {paginated.map((p, i) => (
                      <FrequentCard key={`${p.partenaireNom}-${i}`} partner={p}
                        index={(page - 1) * PAGE_SIZE + i} onConvert={setToConvert} />
                    ))}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                        className="p-2 rounded-lg border border-input bg-card hover:bg-muted disabled:opacity-30 transition-colors">
                        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                        <button key={n} onClick={() => setPage(n)}
                          className={`h-8 w-8 rounded-lg text-sm font-semibold transition-all ${
                            n === page ? "bg-primary text-primary-foreground shadow-sm" : "border border-input bg-card hover:bg-muted text-muted-foreground"
                          }`}>{n}</button>
                      ))}
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                        className="p-2 rounded-lg border border-input bg-card hover:bg-muted disabled:opacity-30 transition-colors">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  )}
                </>
              )
            )}
          </>
        )}

        {/* ── TAB CRÉATION ── */}
        {tab === "create" && <CreatePartnerForm onSuccess={handleCreateSuccess} />}

      </main>
    </div>
  );
};

export default FrequentPartnersPage;