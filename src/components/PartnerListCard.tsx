// src/components/PartnerListCard.tsx

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Phone, MapPin, Calendar, KeyRound, RotateCcw,
  ToggleLeft, ToggleRight, Eye, EyeOff, Copy, Check,
  Loader2, AlertTriangle, BadgeCheck, ShieldOff,
  ArrowUpCircle, ArrowDownCircle, History,
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
    ? new Date(statistiques.derniereTransaction).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
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

// ─── CARD PRINCIPALE ──────────────────────────────────────────────────────────

const PartnerListCard = ({
  partner,
  onStatusChange,
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

  return (
    <>
      {/* ── Modal confirmation regénération ── */}
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
                <strong>{partner.nomComplet}</strong> ne pourra plus se connecter avec l'ancien code.
                Le nouveau sera affiché <strong>une seule fois</strong>.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setRegenModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-border text-muted-foreground hover:bg-muted transition-colors">
                Annuler
              </button>
              <button
                onClick={handleRegen}
                disabled={regenLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center gap-2 disabled:opacity-60">
                {regenLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal nouveau code ── */}
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
            <button
              onClick={() => { setRegenCode(null); setRegenModal(false); }}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground">
              J'ai noté le code — Fermer
            </button>
          </div>
        </div>
      )}

      {/* ── Drawer historique — rendu via portal au niveau du body ── */}
      {showHistory && createPortal(
        <PartnerTransactionHistory
          partnerId={partner.id}
          partnerName={partner.nomComplet}
          onClose={() => setShowHistory(false)}
          fetchHistory={PartnerBalanceService.getPartnerHistory}
        />,
        document.body
      )}

      {/* ── Card principale ── */}
      <div className="bg-card rounded-2xl border border-border hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
        {/* Bande statut */}
        <div className={`h-0.5 w-full ${isActive
          ? "bg-gradient-to-r from-emerald-400 to-teal-400"
          : "bg-gradient-to-r from-rose-400 to-red-400"}`}
        />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            {partner.photo ? (
              <img src={partner.photo} alt={partner.nomComplet}
                className="h-12 w-12 rounded-xl object-cover flex-shrink-0 border border-border" />
            ) : (
              <div className={`h-12 w-12 rounded-xl ${color.bg} ${color.text} font-bold text-sm flex items-center justify-center flex-shrink-0`}>
                {getInitials(partner.nomComplet)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="font-bold text-foreground text-sm truncate">{partner.nomComplet}</p>
                <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                }`}>
                  {isActive
                    ? <><BadgeCheck className="h-3 w-3" />Actif</>
                    : <><ShieldOff  className="h-3 w-3" />Suspendu</>}
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
              <p className="text-xs text-muted-foreground">
                Depuis le <span className="font-semibold text-foreground">{joinDate}</span>
              </p>
            </div>
          </div>

          {/* Bloc solde détaillé */}
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
              <button
                onClick={() => setRegenModal(true)}
                className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-amber-600 transition-colors">
                <RotateCcw className="h-3 w-3" />Regénérer
              </button>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono font-bold text-foreground tracking-[0.25em]">
                {codeVisible && code !== null ? code : "••••••"}
              </code>
              <button
                onClick={fetchCode}
                disabled={loadingCode}
                className="p-1.5 rounded-lg hover:bg-background text-muted-foreground disabled:opacity-50">
                {loadingCode
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : codeVisible
                    ? <EyeOff className="h-4 w-4" />
                    : <Eye    className="h-4 w-4" />}
              </button>
              {codeVisible && code !== null && (
                <button onClick={() => copyCode(code)} className="p-1.5 rounded-lg hover:bg-background text-muted-foreground">
                  {codeCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </button>
              )}
            </div>
          </div>

          {/* ── Bouton Historique ── */}
          <button
            onClick={() => setShowHistory(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 mb-2 rounded-xl text-sm font-semibold bg-muted/60 text-foreground hover:bg-muted border border-border transition-all"
          >
            <History className="h-4 w-4 text-primary" />
            Historique des transactions
          </button>

          {/* Bouton activer / suspendre */}
          <button
            onClick={handleToggleStatus}
            disabled={toggling}
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

export default PartnerListCard;