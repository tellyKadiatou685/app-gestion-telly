// src/components/TransactionModal.tsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  X, Banknote, ArrowUpCircle, ArrowDownCircle,
  Users, FileEdit, Wallet, Loader2, Phone, Calculator,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import TransactionService from "@/services/TransactionService";
import PastTransactionService from "@/services/PastTransactionService";
import api from "@/config";
import type { AccountTypeOption } from "@/types/accountType.types";
import type { AccountType } from "@/types/transaction.types";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Supervisor { id: string; nomComplet: string; }
interface Partner    { id: string; nomComplet: string; }

interface TransactionModalProps {
  isOpen:    boolean;
  onClose:   () => void;
  onSuccess: () => void;
  /**
   * Date actuellement filtrée sur le dashboard, format 'YYYY-MM-DD'.
   * - undefined / aujourd'hui → comportement inchangé (écrit dans Account)
   * - date passée             → écrit dans DailySnapshot via PastTransactionService
   */
  targetDate?: string;
}

// ─── SCHEMA ───────────────────────────────────────────────────────────────────

const transactionSchema = z.object({
  operationType: z.enum(["depot_retrait", "partner_registered", "partner_libre"]),
  superviseurId: z.string().min(1, "Superviseur requis"),
  typeCompte:    z.string().optional(),
  partenaireId:  z.string().optional(),
  partenaireNom: z.string().optional(),
  telephone:     z.string().optional(),
  typeOperation: z.enum(["depot", "retrait"]),
  montant: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        const parsed = parseInt(val.replace(/\s/g, ""), 10);
        return isNaN(parsed) ? undefined : parsed;
      }
      return val;
    },
    z.number().min(1, "Montant requis")
  ),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const fmtAmount = (v: number) =>
  new Intl.NumberFormat("fr-FR").format(Math.abs(v)) + " F CFA";

const fmtSigned = (v: number) =>
  (v >= 0 ? "+" : "−") + new Intl.NumberFormat("fr-FR").format(Math.abs(v)) + " F CFA";

const fmtDateLong = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("fr-FR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

const ACCOUNT_ICONS: Record<string, string> = {
  LIQUIDE:        "💵",
  ORANGE_MONEY:   "📱",
  WAVE:           "🌊",
  UV_MASTER:      "⭐",
  FREE_MONEY:     "💸",
  WESTERN_UNION:  "🏦",
  RIA:            "💱",
  MONEYGRAM:      "💰",
  SEDDO:          "🪙",
  VERSEMENT_BANK: "🏧",
  AUTRES:         "🔖",
};

// ─── PARSER DÉFENSIF réponse /accountype ─────────────────────────────────────
function parseActiveOptions(raw: any): AccountTypeOption[] {
  try {
    const d     = raw?.data ?? raw;
    const inner = d?.data ?? d;

    if (Array.isArray(inner?.activeOptions)) {
      return inner.activeOptions;
    }

    if (Array.isArray(inner?.allTypes)) {
      return inner.allTypes
        .filter((t: any) => t.isActive)
        .map((t: any) => ({ value: t.value, label: t.label }));
    }

    if (Array.isArray(inner?.activeTypes)) {
      const LABELS: Record<string, string> = {
        LIQUIDE:        "Liquide",
        ORANGE_MONEY:   "Orange Money",
        WAVE:           "Wave",
        UV_MASTER:      "UV Master",
        FREE_MONEY:     "Free Money",
        WESTERN_UNION:  "Western Union",
        RIA:            "Ria",
        MONEYGRAM:      "MoneyGram",
        SEDDO:          "Seddo",
        VERSEMENT_BANK: "Versement Bank",
        AUTRES:         inner?.autresLabel ?? "Autres",
      };
      return inner.activeTypes.map((v: string) => ({ value: v, label: LABELS[v] ?? v }));
    }

    return [];
  } catch (e) {
    console.error("❌ [parseActiveOptions] Erreur:", e);
    return [];
  }
}

// ─── COMPOSANT FinSecondaire ──────────────────────────────────────────────────

const FinSecondaire = ({
  f1, f2, onF2Change,
}: {
  f1: number; f2: number | null; onF2Change: (val: number | null) => void;
}) => {
  const [raw, setRaw] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRaw(val);
    const parsed = parseInt(val.replace(/\s/g, ""), 10);
    onF2Change(isNaN(parsed) || parsed <= 0 ? null : parsed);
  };

  const diff      = f2 !== null ? f2 - f1 : null;
  const diffColor = diff === null ? "" : diff >= 0 ? "text-green-600" : "text-red-500";

  return (
    <div className="rounded-xl border border-dashed border-blue-300 bg-blue-50/50 p-3.5 space-y-3">
      <div className="flex items-center gap-2">
        <Calculator className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
        <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">
          Fin secondaire F2 (optionnel)
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">F1 · Fin réelle</Label>
          <div className="flex items-center h-10 px-3 rounded-lg border border-border bg-muted/40 text-sm font-bold text-foreground tabular-nums select-none">
            {f1 > 0 ? fmtAmount(f1) : <span className="text-muted-foreground font-normal">—</span>}
          </div>
          <p className="text-[9px] text-muted-foreground">Montant principal envoyé</p>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">F2 · Fin prévue</Label>
          <Input
            type="text" inputMode="numeric" placeholder="0" value={raw} onChange={handleChange}
            className="h-10 text-sm font-bold border-blue-300 focus:ring-blue-400"
          />
          <p className="text-[9px] text-muted-foreground">Persistée en base ✓</p>
        </div>
      </div>
      <div className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${
        diff === null ? "border-border bg-muted/20" : diff >= 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
      }`}>
        <span className="text-xs font-semibold text-muted-foreground">Différence (F2 − F1)</span>
        <span className={`text-sm font-extrabold tabular-nums ${diffColor}`}>
          {diff !== null ? fmtSigned(diff) : <span className="text-muted-foreground font-normal text-xs">Saisir F2</span>}
        </span>
      </div>
    </div>
  );
};

// ─── MODAL ────────────────────────────────────────────────────────────────────

export function TransactionModal({ isOpen, onClose, onSuccess, targetDate }: TransactionModalProps) {
  const { toast } = useToast();

  const [supervisors,  setSupervisors]  = useState<Supervisor[]>([]);
  const [partners,     setPartners]     = useState<Partner[]>([]);
  const [accountTypes, setAccountTypes] = useState<AccountTypeOption[]>([]);
  const [loadingData,  setLoadingData]  = useState(true);
  const [submitting,   setSubmitting]   = useState(false);
  const [f2Value,      setF2Value]      = useState<number | null>(null);
  const [selectedTypeCompteLocal, setSelectedTypeCompteLocal] = useState<string>("");

  // ── Date passée ? Détermine la route appelée à la soumission ──────────────
  const isPastTransaction = useMemo(
    () => PastTransactionService.isPastDate(targetDate),
    [targetDate]
  );

  const operationTypes = useMemo(() => [
    { value: "depot_retrait",      label: "Début/Fin",  description: "Gérer les soldes",      icon: Wallet   },
    { value: "partner_registered", label: "Partenaire", description: "Partenaire enregistré", icon: Users    },
    { value: "partner_libre",      label: "Libre",      description: "Saisie manuelle",       icon: FileEdit },
  ], []);

  const {
    register, handleSubmit, watch, setValue, reset,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { typeOperation: "depot", typeCompte: "" },
  });

  const operationType      = watch("operationType");
  const selectedSupervisor = watch("superviseurId");
  const selectedOperation  = watch("typeOperation");
  const selectedPartnerId  = watch("partenaireId");
  const partenaireNomValue = watch("partenaireNom");
  const telephoneValue     = watch("telephone");
  const montant            = watch("montant");

  const selectedAccountTypeFromForm = watch("typeCompte");
  const selectedAccountType = (selectedAccountTypeFromForm && selectedAccountTypeFromForm.trim() !== "")
    ? selectedAccountTypeFromForm
    : selectedTypeCompteLocal;

  const showF2Block = operationType === "depot_retrait" && selectedOperation === "retrait";

  // ── Chargement données API ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      setLoadingData(true);
      try {
        const [supervisorsRes, accountTypesRes, partnersRes] = await Promise.allSettled([
          TransactionService.getAvailableSupervisors(),
          api.get("/accountype"),
          TransactionService.getActivePartners(),
        ]);

        if (supervisorsRes.status === "fulfilled") {
          setSupervisors(supervisorsRes.value ?? []);
        }

        if (accountTypesRes.status === "fulfilled") {
          setAccountTypes(parseActiveOptions(accountTypesRes.value));
        }

        if (partnersRes.status === "fulfilled") {
          setPartners(partnersRes.value ?? []);
        }
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, [isOpen]);

  // ── Reset champs quand type d'opération change ────────────────────────────
  useEffect(() => {
    setF2Value(null);
    setSelectedTypeCompteLocal("");
    if (operationType === "depot_retrait") {
      setValue("partenaireId",  "");
      setValue("partenaireNom", "");
      setValue("telephone",     "");
    } else if (operationType === "partner_registered") {
      setValue("typeCompte",    "", { shouldValidate: true });
      setValue("partenaireNom", "");
      setValue("telephone",     "");
    } else if (operationType === "partner_libre") {
      setValue("typeCompte",   "", { shouldValidate: true });
      setValue("partenaireId", "");
    }
  }, [operationType, setValue]);

  useEffect(() => {
    if (selectedOperation !== "retrait") setF2Value(null);
  }, [selectedOperation]);

  // ── Partenaire libre non permis sur date passée avec F2 ───────────────────
  // (F2 n'a de sens que pour un compte fixe, déjà géré par showF2Block)

  const handleClose = useCallback(() => {
    reset();
    setF2Value(null);
    setSelectedTypeCompteLocal("");
    onClose();
  }, [reset, onClose]);

  // ── Soumission ─────────────────────────────────────────────────────────────
  const onSubmit = useCallback(async (data: TransactionFormData) => {
    const typeCompteResolu: string =
      (data.typeCompte && data.typeCompte.trim() !== "")
        ? data.typeCompte
        : selectedTypeCompteLocal;

    if (data.operationType === "depot_retrait" && !typeCompteResolu) {
      toast({
        title: "❌ Erreur",
        description: "Veuillez sélectionner un type de compte.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // ── Payload commun aux deux routes ───────────────────────────────────
      const basePayload: Record<string, unknown> = {
        superviseurId: data.superviseurId,
        typeOperation: data.typeOperation,
        montant:       data.montant,
      };

      if (data.operationType === "depot_retrait") {
        basePayload.typeCompte    = typeCompteResolu as AccountType;
        basePayload.finSecondaire = data.typeOperation === "retrait" ? f2Value : null;
      }

      if (data.operationType === "partner_registered") {
        basePayload.partenaireId = data.partenaireId;
      }

      if (data.operationType === "partner_libre") {
        basePayload.partenaireNom = data.partenaireNom;
        if (data.telephone?.trim()) basePayload.telephoneLibre = data.telephone.trim();
      }

      let description = `Montant : ${fmtAmount(data.montant)}`;

      if (isPastTransaction && targetDate) {
        // ── Route DATE PASSÉE : écrit dans DailySnapshot ────────────────────
        const response = await PastTransactionService.createPastTransaction({
          ...(basePayload as any),
          targetDate,
        });

        const f2Confirme = response.finSecondaire;
        if (f2Confirme != null && f2Confirme > 0) {
          description += ` · F2 : ${fmtAmount(f2Confirme)}`;
        }
        description += ` · 📅 ${fmtDateLong(targetDate)}`;

      } else {
        // ── Route AUJOURD'HUI : comportement inchangé ───────────────────────
        const response = await TransactionService.createAdminTransaction(basePayload as any);

        const f2Confirme   = response.finSecondaire;
        const diffConfirme = response.diffF2F1;
        if (f2Confirme != null && f2Confirme > 0) {
          description += ` · F2 : ${fmtAmount(f2Confirme)}`;
          if (diffConfirme != null) description += ` (diff : ${fmtSigned(diffConfirme)})`;
        }
      }

      toast({ title: "✅ Transaction créée", description });
      onSuccess();
      handleClose();
    } catch (err: any) {
      toast({
        title: "❌ Erreur",
        description: err?.response?.data?.message || "Impossible de créer la transaction.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }, [onSuccess, toast, handleClose, f2Value, selectedTypeCompteLocal, isPastTransaction, targetDate]);

  const isFormValid =
    !!operationType && !!selectedSupervisor && !!selectedOperation && (montant ?? 0) > 0 &&
    (
      (operationType === "depot_retrait"      && !!selectedAccountType) ||
      (operationType === "partner_registered" && !!selectedPartnerId)   ||
      (operationType === "partner_libre"      && (partenaireNomValue?.trim().length ?? 0) >= 2)
    );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative z-10 w-full sm:max-w-lg bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl border border-border max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Banknote className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Nouvelle Transaction</h2>
              <p className="text-xs text-muted-foreground">Remplissez les champs ci-dessous</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* ── Bandeau date passée ── */}
        {isPastTransaction && targetDate && (
          <div className="mx-6 mt-4 flex items-start gap-2.5 p-3 rounded-xl text-xs bg-orange-50 text-orange-700 border border-orange-200">
            <CalendarClock className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <p>
              Transaction pour une <strong>date passée</strong> — {fmtDateLong(targetDate)}.
              Elle sera enregistrée dans l'historique de ce jour-là, sans affecter les soldes d'aujourd'hui.
            </p>
          </div>
        )}

        {/* ── Loading ── */}
        {loadingData ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Chargement des données...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* ── Type d'opération ── */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Type d'opération
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {operationTypes.map((op) => {
                    const Icon = op.icon;
                    const isSelected = operationType === op.value;
                    return (
                      <button
                        key={op.value}
                        type="button"
                        onClick={() => setValue("operationType", op.value as TransactionFormData["operationType"])}
                        className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/30 hover:bg-muted/50"
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={`text-xs font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>
                          {op.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground leading-tight">{op.description}</span>
                        {isSelected && <div className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {operationType && (
                <>
                  {/* ── Superviseur ── */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Superviseur</Label>
                    <Select onValueChange={(v) => setValue("superviseurId", v)} value={selectedSupervisor || ""}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Choisir un superviseur..." />
                      </SelectTrigger>
                      <SelectContent>
                        {supervisors.length === 0
                          ? <SelectItem value="__none__" disabled>Aucun superviseur disponible</SelectItem>
                          : supervisors.map(s => <SelectItem key={s.id} value={s.id}>{s.nomComplet}</SelectItem>)
                        }
                      </SelectContent>
                    </Select>
                  </div>

                  {/* ── Début / Fin ── */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Opération</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "depot",   label: "Début", icon: ArrowUpCircle   },
                        { value: "retrait", label: "Fin",   icon: ArrowDownCircle },
                      ].map((opt) => {
                        const Icon = opt.icon;
                        const isSelected = selectedOperation === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setValue("typeOperation", opt.value as "depot" | "retrait")}
                            className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all font-semibold text-sm ${
                              isSelected
                                ? opt.value === "depot"
                                  ? "border-accent bg-accent/5 text-accent"
                                  : "border-destructive bg-destructive/5 text-destructive"
                                : "border-border text-muted-foreground hover:border-primary/30"
                            }`}
                          >
                            <Icon className="h-4 w-4" />{opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Types de comptes ACTIFS ── */}
                  {operationType === "depot_retrait" && (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Type de compte
                        <span className="ml-2 text-muted-foreground font-normal normal-case">
                          ({accountTypes.length} actif{accountTypes.length > 1 ? "s" : ""})
                        </span>
                      </Label>
                      {accountTypes.length === 0 ? (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                          Aucun type de compte actif. Allez dans{" "}
                          <strong>Paramètres → Types de compte</strong> pour en activer.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {accountTypes.map((acc) => {
                            const isSelected = selectedAccountType === acc.value;
                            return (
                              <button
                                key={acc.value}
                                type="button"
                                onClick={() => {
                                  setSelectedTypeCompteLocal(acc.value);
                                  setValue("typeCompte", acc.value, {
                                    shouldValidate: true,
                                    shouldDirty:    true,
                                  });
                                }}
                                className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all ${
                                  isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                                }`}
                              >
                                <span className="text-lg">{ACCOUNT_ICONS[acc.value] ?? "💳"}</span>
                                <span className={`text-sm font-medium truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                                  {acc.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Partenaire enregistré ── */}
                  {operationType === "partner_registered" && (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Partenaire enregistré</Label>
                      <Select onValueChange={(v) => setValue("partenaireId", v)} value={selectedPartnerId || ""}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Sélectionner un partenaire..." />
                        </SelectTrigger>
                        <SelectContent>
                          {partners.length === 0
                            ? <SelectItem value="__none__" disabled>Aucun partenaire disponible</SelectItem>
                            : partners.map(p => <SelectItem key={p.id} value={p.id}>{p.nomComplet}</SelectItem>)
                          }
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* ── Partenaire libre ── */}
                  {operationType === "partner_libre" && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nom du partenaire</Label>
                        <Input {...register("partenaireNom")} placeholder="Ex: Boutique Chez Ibra" className="h-11" maxLength={100} />
                        <p className="text-[11px] text-muted-foreground">Min. 2 caractères</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Téléphone{" "}
                          <span className="text-muted-foreground font-normal normal-case">(optionnel)</span>
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                          <Input {...register("telephone")} placeholder="Ex: 77 123 45 67" className="pl-9 h-11" maxLength={20} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Montant (F1) ── */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {showF2Block ? "Montant · F1 (Fin réelle)" : "Montant"}
                      </Label>
                      {(montant ?? 0) > 0 && (
                        <span className="text-xs font-bold text-primary">{fmtAmount(montant)}</span>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        className="h-12 text-lg font-bold pr-16"
                        onChange={(e) => {
                          const parsed = parseInt(e.target.value.replace(/\s/g, ""), 10);
                          setValue("montant", isNaN(parsed) ? 0 : parsed);
                        }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded">
                        F CFA
                      </span>
                    </div>
                  </div>

                  {/* ── BLOC F2 ── */}
                  {showF2Block && (
                    <FinSecondaire f1={montant ?? 0} f2={f2Value} onF2Change={setF2Value} />
                  )}

                  {/* ── Résumé ── */}
                  {isFormValid && (
                    <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-2">
                      <p className="text-xs font-bold text-accent uppercase tracking-wide">📋 Résumé</p>
                      <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                        {isPastTransaction && targetDate && (
                          <>
                            <span className="text-muted-foreground">📅 Date</span>
                            <span className="font-medium text-orange-600 text-right">{fmtDateLong(targetDate)}</span>
                          </>
                        )}
                        <span className="text-muted-foreground">Superviseur</span>
                        <span className="font-medium text-foreground text-right">
                          {supervisors.find(s => s.id === selectedSupervisor)?.nomComplet}
                        </span>
                        <span className="text-muted-foreground">Opération</span>
                        <span className="font-medium text-foreground text-right">
                          {selectedOperation === "depot" ? "📈 Début" : "📉 Fin"}
                        </span>
                        {operationType === "depot_retrait" && selectedAccountType && (
                          <>
                            <span className="text-muted-foreground">Compte</span>
                            <span className="font-medium text-foreground text-right">
                              {ACCOUNT_ICONS[selectedAccountType]}{" "}
                              {accountTypes.find(a => a.value === selectedAccountType)?.label}
                            </span>
                          </>
                        )}
                        {operationType === "partner_registered" && selectedPartnerId && (
                          <>
                            <span className="text-muted-foreground">Partenaire</span>
                            <span className="font-medium text-foreground text-right">
                              {partners.find(p => p.id === selectedPartnerId)?.nomComplet}
                            </span>
                          </>
                        )}
                        {operationType === "partner_libre" && partenaireNomValue && (
                          <>
                            <span className="text-muted-foreground">Partenaire</span>
                            <span className="font-medium text-foreground text-right">{partenaireNomValue}</span>
                          </>
                        )}
                        {operationType === "partner_libre" && telephoneValue?.trim() && (
                          <>
                            <span className="text-muted-foreground">Téléphone</span>
                            <span className="font-medium text-foreground text-right">{telephoneValue.trim()}</span>
                          </>
                        )}
                        <span className="text-muted-foreground">
                          {showF2Block ? "F1 · Fin réelle" : "Montant"}
                        </span>
                        <span className="font-bold text-primary text-right">{fmtAmount(montant)}</span>
                        {showF2Block && f2Value !== null && (
                          <>
                            <span className="text-muted-foreground">F2 · Fin prévue</span>
                            <span className="font-bold text-blue-600 text-right">{fmtAmount(f2Value)}</span>
                            <span className="text-muted-foreground">Différence (F2 − F1)</span>
                            <span className={`font-extrabold text-right ${(f2Value - montant) >= 0 ? "text-green-600" : "text-red-500"}`}>
                              {fmtSigned(f2Value - montant)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="px-6 py-4 border-t border-border flex gap-3">
              <Button type="button" variant="outline" className="flex-1 h-11" onClick={handleClose}>
                Annuler
              </Button>
              <Button
                type="submit"
                className="flex-1 h-11 font-semibold"
                disabled={!isFormValid || submitting}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    En cours...
                  </span>
                ) : isPastTransaction ? (
                  "📅 Valider (date passée)"
                ) : (
                  "✅ Valider"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}