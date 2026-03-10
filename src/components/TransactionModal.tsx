// src/components/TransactionModal.tsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  X, Banknote, ArrowUpCircle, ArrowDownCircle,
  Users, FileEdit, Wallet, Loader2, Phone
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
import api from "@/config";
import type { AccountTypeOption } from "@/types/accountType.types";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Supervisor { id: string; nomComplet: string; }
interface Partner    { id: string; nomComplet: string; }

interface TransactionModalProps {
  isOpen:    boolean;
  onClose:   () => void;
  onSuccess: () => void;
}

// ─── SCHEMA ───────────────────────────────────────────────────────────────────

const transactionSchema = z.object({
  operationType:  z.enum(["depot_retrait", "partner_registered", "partner_libre"]),
  superviseurId:  z.string().min(1, "Superviseur requis"),
  typeCompte:     z.string().optional(),
  partenaireId:   z.string().optional(),
  partenaireNom:  z.string().optional(),
  telephone:      z.string().optional(),
  typeOperation:  z.enum(["depot", "retrait"]),
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
  new Intl.NumberFormat("fr-FR").format(v) + " F CFA";

const ACCOUNT_ICONS: Record<string, string> = {
  LIQUIDE:       "💵",
  ORANGE_MONEY:  "📱",
  WAVE:          "🌊",
  UV_MASTER:     "⭐",
  FREE_MONEY:    "💸",
  WESTERN_UNION: "🏦",
  RIA:           "💱",
  MONEYGRAM:     "💰",
  AUTRES:        "🔖",
};

// ─── PARSER DÉFENSIF réponse /accountype ─────────────────────────────────────
function parseActiveOptions(raw: any): AccountTypeOption[] {
  try {
    const d     = raw?.data ?? raw;
    const inner = d?.data ?? d;

    if (Array.isArray(inner?.activeOptions)) return inner.activeOptions;

    if (Array.isArray(inner?.allTypes)) {
      return inner.allTypes
        .filter((t: any) => t.isActive)
        .map((t: any) => ({ value: t.value, label: t.label }));
    }

    if (Array.isArray(inner?.activeTypes)) {
      const LABELS: Record<string, string> = {
        LIQUIDE: "Liquide", ORANGE_MONEY: "Orange Money", WAVE: "Wave",
        UV_MASTER: "UV Master", FREE_MONEY: "Free Money",
        WESTERN_UNION: "Western Union", RIA: "Ria",
        MONEYGRAM: "MoneyGram", AUTRES: inner?.autresLabel ?? "Autres",
      };
      return inner.activeTypes.map((v: string) => ({ value: v, label: LABELS[v] ?? v }));
    }

    console.warn("[TransactionModal] Réponse /accountype inattendue:", raw);
    return [];
  } catch (e) {
    console.error("[TransactionModal] parseActiveOptions erreur:", e);
    return [];
  }
}

// ─── MODAL ────────────────────────────────────────────────────────────────────

export function TransactionModal({ isOpen, onClose, onSuccess }: TransactionModalProps) {
  const { toast } = useToast();

  const [supervisors,  setSupervisors]  = useState<Supervisor[]>([]);
  const [partners,     setPartners]     = useState<Partner[]>([]);
  const [accountTypes, setAccountTypes] = useState<AccountTypeOption[]>([]);
  const [loadingData,  setLoadingData]  = useState(true);
  const [submitting,   setSubmitting]   = useState(false);

  const operationTypes = useMemo(() => [
    { value: "depot_retrait",      label: "Début/Fin",  description: "Gérer les soldes",      icon: Wallet   },
    { value: "partner_registered", label: "Partenaire", description: "Partenaire enregistré", icon: Users    },
    { value: "partner_libre",      label: "Libre",      description: "Saisie manuelle",       icon: FileEdit },
  ], []);

  const {
    register, handleSubmit, watch, setValue, reset,
    formState: { errors }
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { typeOperation: "depot" },
  });

  const operationType       = watch("operationType");
  const selectedSupervisor  = watch("superviseurId");
  const selectedAccountType = watch("typeCompte");
  const selectedOperation   = watch("typeOperation");
  const selectedPartnerId   = watch("partenaireId");
  const partenaireNomValue  = watch("partenaireNom");
  const telephoneValue      = watch("telephone");
  const montant             = watch("montant");

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
        } else {
          console.error("[Modal] supervisors:", supervisorsRes.reason);
        }

        if (accountTypesRes.status === "fulfilled") {
          const parsed = parseActiveOptions(accountTypesRes.value);
          setAccountTypes(parsed);
        } else {
          console.error("[Modal] accountTypes:", accountTypesRes.reason);
        }

        if (partnersRes.status === "fulfilled") {
          setPartners(partnersRes.value ?? []);
        } else {
          console.error("[Modal] partners:", partnersRes.reason);
        }

      } finally {
        setLoadingData(false);
      }
    };

    load();
  }, [isOpen]);

  // ── Reset champs quand type d'opération change ────────────────────────────
  useEffect(() => {
    if (operationType === "depot_retrait") {
      setValue("partenaireId",  "");
      setValue("partenaireNom", "");
      setValue("telephone",     "");
    } else if (operationType === "partner_registered") {
      setValue("typeCompte",    "");
      setValue("partenaireNom", "");
      setValue("telephone",     "");
    } else if (operationType === "partner_libre") {
      setValue("typeCompte",   "");
      setValue("partenaireId", "");
    }
  }, [operationType, setValue]);

  const handleClose = useCallback(() => { reset(); onClose(); }, [reset, onClose]);

  // ── Soumission ────────────────────────────────────────────────────────────
  const onSubmit = useCallback(async (data: TransactionFormData) => {
    setSubmitting(true);
    try {
      const payload: any = {
        superviseurId: data.superviseurId,
        typeOperation: data.typeOperation,
        montant:       data.montant,
      };

      if (data.operationType === "depot_retrait") {
        payload.typeCompte = data.typeCompte;
      }
      if (data.operationType === "partner_registered") {
        payload.partenaireId = data.partenaireId;
      }
      if (data.operationType === "partner_libre") {
        payload.partenaireNom = data.partenaireNom;
        if (data.telephone?.trim()) payload.telephone = data.telephone.trim();
      }

      await TransactionService.createAdminTransaction(payload);

      toast({ title: "✅ Transaction créée", description: `Montant : ${fmtAmount(data.montant)}` });
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
  }, [onSuccess, toast, handleClose]);

  const isFormValid =
    operationType && selectedSupervisor && selectedOperation && montant > 0 &&
    (
      (operationType === "depot_retrait"      && !!selectedAccountType) ||
      (operationType === "partner_registered" && !!selectedPartnerId) ||
      (operationType === "partner_libre"      && (partenaireNomValue?.trim().length ?? 0) >= 2)
    );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative z-10 w-full sm:max-w-lg bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl border border-border max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300">

        {/* Header */}
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
          <button onClick={handleClose} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Loading */}
        {loadingData ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Chargement des données...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Type d'opération */}
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
                        onClick={() => setValue("operationType", op.value as any)}
                        className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/30 hover:bg-muted/50"
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={`text-xs font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>{op.label}</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">{op.description}</span>
                        {isSelected && <div className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {operationType && (
                <>
                  {/* Superviseur */}
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

                  {/* Début / Fin */}
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
                            onClick={() => setValue("typeOperation", opt.value as any)}
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
                          Aucun type de compte actif. Allez dans <strong>Paramètres → Types de compte</strong> pour en activer.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {accountTypes.map((acc) => {
                            const isSelected = selectedAccountType === acc.value;
                            return (
                              <button
                                key={acc.value}
                                type="button"
                                onClick={() => setValue("typeCompte", acc.value)}
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

                  {/* Partenaire enregistré */}
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

                  {/* Partenaire libre */}
                  {operationType === "partner_libre" && (
                    <div className="space-y-3">

                      {/* Nom */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Nom du partenaire
                        </Label>
                        <Input
                          {...register("partenaireNom")}
                          placeholder="Ex: Boutique Chez Ibra"
                          className="h-11"
                          maxLength={100}
                        />
                        <p className="text-[11px] text-muted-foreground">Min. 2 caractères</p>
                      </div>

                      {/* Téléphone — optionnel */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Téléphone{" "}
                          <span className="text-muted-foreground font-normal normal-case">(optionnel)</span>
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                          <Input
                            {...register("telephone")}
                            placeholder="Ex: 77 123 45 67"
                            className="pl-9 h-11"
                            maxLength={20}
                          />
                        </div>
                      </div>

                    </div>
                  )}

                  {/* Montant */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Montant</Label>
                      {montant > 0 && <span className="text-xs font-bold text-primary">{fmtAmount(montant)}</span>}
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

                  {/* Résumé */}
                  {isFormValid && (
                    <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-2">
                      <p className="text-xs font-bold text-accent uppercase tracking-wide">📋 Résumé</p>
                      <div className="grid grid-cols-2 gap-y-1.5 text-xs">
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
                              {ACCOUNT_ICONS[selectedAccountType]} {accountTypes.find(a => a.value === selectedAccountType)?.label}
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
                        <span className="text-muted-foreground">Montant</span>
                        <span className="font-bold text-primary text-right">{fmtAmount(montant)}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border flex gap-3">
              <Button type="button" variant="outline" className="flex-1 h-11" onClick={handleClose}>Annuler</Button>
              <Button type="submit" className="flex-1 h-11 font-semibold" disabled={!isFormValid || submitting}>
                {submitting
                  ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />En cours...</span>
                  : "✅ Valider"
                }
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}