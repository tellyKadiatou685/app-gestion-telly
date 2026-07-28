// src/components/TransactionModal_super.tsx
import { useEffect, useState } from "react";
import TransactionService from "@/services/TransactionService";
import api from "@/config";
import type { AccountTypeOption } from "@/types/accountType.types";
import type { EntryAccess } from "@/services/AccountTypeService";
import type { OperationType } from "@/types/transaction.types";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type TxMode = "directe" | "enregistre" | "libre";

export interface TransactionModalProps {
  superviseurId: string;
  onClose:   () => void;
  onSuccess: () => void;
}

// ─── ICONS ───────────────────────────────────────────────────────────────────

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

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function canDo(access: EntryAccess, op: OperationType): boolean {
  if (access === "both")       return true;
  if (access === "debut_only") return op === "depot";
  if (access === "fin_only")   return op === "retrait";
  return true;
}

function filterOptions(
  options: AccountTypeOption[],
  entryAccess: Record<string, EntryAccess>,
  op: OperationType
): AccountTypeOption[] {
  return options.filter(ac => {
    const access: EntryAccess = entryAccess[ac.value] ?? "both";
    return canDo(access, op);
  });
}

function allowedOps(
  typeCompte: string,
  entryAccess: Record<string, EntryAccess>
): OperationType[] {
  const access: EntryAccess = entryAccess[typeCompte] ?? "both";
  if (access === "debut_only") return ["depot"];
  if (access === "fin_only")   return ["retrait"];
  return ["depot", "retrait"];
}

// ─── PARSER DÉFENSIF ──────────────────────────────────────────────────────────

function parseConfigResponse(raw: any): {
  activeOptions: AccountTypeOption[];
  entryAccess: Record<string, EntryAccess>;
} {
  try {
    const d     = raw?.data ?? raw;
    const inner = d?.data ?? d;
    const entryAccess: Record<string, EntryAccess> = inner?.entryAccess ?? {};

    if (Array.isArray(inner?.activeOptions)) {
      return { activeOptions: inner.activeOptions, entryAccess };
    }
    if (Array.isArray(inner?.allTypes)) {
      return {
        activeOptions: inner.allTypes
          .filter((t: any) => t.isActive)
          .map((t: any) => ({ value: t.value, label: t.label })),
        entryAccess,
      };
    }
    if (Array.isArray(inner?.activeTypes)) {
      const LABELS: Record<string, string> = {
        LIQUIDE: "Liquide", ORANGE_MONEY: "Orange Money", WAVE: "Wave",
        UV_MASTER: "UV Master", FREE_MONEY: "Free Money",
        WESTERN_UNION: "Western Union", RIA: "Ria",
        MONEYGRAM: "MoneyGram", AUTRES: inner?.autresLabel ?? "Autres",
      };
      return {
        activeOptions: inner.activeTypes.map((v: string) => ({ value: v, label: LABELS[v] ?? v })),
        entryAccess,
      };
    }

    console.warn("[TransactionModal_super] Réponse /accountype inattendue:", raw);
    return { activeOptions: [], entryAccess: {} };
  } catch (e) {
    console.error("[TransactionModal_super] parseConfigResponse erreur:", e);
    return { activeOptions: [], entryAccess: {} };
  }
}

// ─── COMPOSANT ───────────────────────────────────────────────────────────────

export default function TransactionModal({ superviseurId, onClose, onSuccess }: TransactionModalProps) {
  const [mode,            setMode]            = useState<TxMode>("directe");
  const [typeCompte,      setTypeCompte]      = useState<string>("");
  const [operation,       setOperation]       = useState<OperationType>("depot");
  const [montant,         setMontant]         = useState("");
  // F2 — uniquement pour mode=directe + operation=retrait
  const [finSecondaire,   setFinSecondaire]   = useState("");
  const [partenaireId,    setPartenaireId]    = useState("");
  const [partenaireNom,   setPartenaireNom]   = useState("");
  const [telephone,       setTelephone]       = useState("");
  const [loading,         setLoading]         = useState(false);
  const [loadingData,     setLoadingData]     = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const [partners,        setPartners]        = useState<{ id: string; nomComplet: string }[]>([]);

  const [allActiveOptions, setAllActiveOptions] = useState<AccountTypeOption[]>([]);
  const [entryAccess,      setEntryAccess]      = useState<Record<string, EntryAccess>>({});

  // ── Chargement initial ─────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoadingData(true);
      try {
        const [acRes, partRes] = await Promise.allSettled([
          api.get("/accountype"),
          TransactionService.getActivePartners(),
        ]);

        if (acRes.status === "fulfilled") {
          const { activeOptions, entryAccess: ea } = parseConfigResponse(acRes.value);
          setAllActiveOptions(activeOptions);
          setEntryAccess(ea);

          const firstAllowed = filterOptions(activeOptions, ea, "depot");
          if (firstAllowed.length > 0) {
            setTypeCompte(firstAllowed[0].value);
            setOperation("depot");
          } else {
            const firstFin = filterOptions(activeOptions, ea, "retrait");
            if (firstFin.length > 0) {
              setTypeCompte(firstFin[0].value);
              setOperation("retrait");
            }
          }
        } else {
          console.error("[Modal_super] accountTypes:", acRes.reason);
        }

        if (partRes.status === "fulfilled") {
          setPartners(partRes.value ?? []);
        } else {
          console.error("[Modal_super] partners:", partRes.reason);
        }
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, []);

  // Afficher le champ F2 uniquement pour transaction directe de fin journée
  const showF2 = mode === "directe" && operation === "retrait";

  // Différence F1 - F2 calculée à la volée pour aperçu
  const f1 = parseFloat(montant) || 0;
  const f2 = parseFloat(finSecondaire) || 0;
  const diffPreview = f1 > 0 && f2 > 0 ? f2 - f1 : null;

  const availableTypes = filterOptions(allActiveOptions, entryAccess, operation);

  const handleOperationChange = (op: OperationType) => {
    setOperation(op);
    const allowed = filterOptions(allActiveOptions, entryAccess, op);
    if (allowed.length > 0 && !allowed.find(a => a.value === typeCompte)) {
      setTypeCompte(allowed[0].value);
    }
    // Réinitialiser F2 si on passe en depot
    if (op === "depot") setFinSecondaire("");
    setError(null);
  };

  const handleTypeChange = (type: string) => {
    setTypeCompte(type);
    const ops = allowedOps(type, entryAccess);
    if (!ops.includes(operation)) {
      setOperation(ops[0]);
      if (ops[0] === "depot") setFinSecondaire("");
    }
    setError(null);
  };

  const opsForCurrentType = typeCompte ? allowedOps(typeCompte, entryAccess) : ["depot", "retrait"] as OperationType[];

  // ── Soumission ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!montant || parseFloat(montant) <= 0) {
      setError("Veuillez saisir un montant valide");
      return;
    }
    if (mode === "directe" && !typeCompte) {
      setError("Veuillez sélectionner un type de compte");
      return;
    }
    if (mode === "directe" && typeCompte) {
      const access: EntryAccess = entryAccess[typeCompte] ?? "both";
      if (!canDo(access, operation)) {
        setError("Cette opération n'est pas autorisée pour ce type de compte.");
        return;
      }
    }

    // Validation F2 optionnelle : si saisi, doit être un nombre positif
    let f2Value: number | undefined = undefined;
    if (showF2 && finSecondaire.trim() !== "") {
      const parsed = parseFloat(finSecondaire);
      if (isNaN(parsed) || parsed <= 0) {
        setError("La valeur F2 doit être un nombre positif.");
        return;
      }
      f2Value = parsed;
    }

    setLoading(true);
    setError(null);
    try {
      await TransactionService.createTransaction({
        superviseurId,
        typeOperation: operation,
        montant: parseFloat(montant),
        ...(mode === "directe"    ? { typeCompte } : {}),
        ...(mode === "enregistre" && partenaireId  ? { partenaireId } : {}),
        ...(mode === "libre"      && partenaireNom
          ? { partenaireNom, ...(telephone ? { telephoneLibre: telephone } : {}) }
          : {}),
        // F2 envoyé au backend uniquement pour fin journée
        ...(showF2 && f2Value !== undefined ? { finSecondaire: f2Value } : {}),
      });
      onSuccess();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── Fond ── */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 40,
          background: "linear-gradient(to bottom, rgba(15,23,42,.4) 50%, rgba(15,23,42,.72) 100%)",
          backdropFilter: "blur(3px)",
        }}
      />

      {/* ── Conteneur centré ── */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, pointerEvents: "none",
      }}>
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: "100%", maxWidth: 520,
            background: "#fff",
            borderRadius: 18,
            overflow: "hidden",
            boxShadow: "0 32px 80px rgba(15,23,42,.22), 0 8px 24px rgba(15,23,42,.1)",
            pointerEvents: "auto",
            fontFamily: "'DM Sans','Outfit',sans-serif",
          }}
        >
          {/* ── Header ── */}
          <div style={{
            background: "#2abfbf",
            padding: "16px 20px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: "rgba(255,255,255,.2)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19,
              }}>
                💼
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>
                  Nouvelle Transaction
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.7)", marginTop: 2 }}>
                  Remplissez les champs
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: "50%", border: "none",
                background: "rgba(255,255,255,.2)", color: "#fff",
                fontSize: 20, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              ×
            </button>
          </div>

          {/* ── Corps ── */}
          {loadingData ? (
            <div style={{ padding: "48px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <span style={{
                width: 32, height: 32,
                border: "3px solid #e8edf2", borderTopColor: "#2abfbf",
                borderRadius: "50%", display: "inline-block",
                animation: "txspin .8s linear infinite",
              }} />
              <span style={{ fontSize: 13, color: "#94a3b8" }}>Chargement des données…</span>
            </div>
          ) : (
            <div style={{
              padding: "20px 20px 0",
              overflowY: "auto",
              maxHeight: "calc(90vh - 180px)",
            }}>

              {/* Mode */}
              <FieldSection label="🎯 Type d'opération">
                {([
                  { key: "directe"    as TxMode, icon: "💸", label: "Transaction directe",   sub: "Début / Fin journée" },
                  { key: "enregistre" as TxMode, icon: "👥", label: "Partenaire enregistré", sub: "Du système"          },
                  { key: "libre"      as TxMode, icon: "✍️", label: "Partenaire libre",       sub: "Nom manuel"          },
                ] as const).map(opt => (
                  <ModeButton
                    key={opt.key}
                    icon={opt.icon} label={opt.label} sub={opt.sub}
                    active={mode === opt.key}
                    onClick={() => { setMode(opt.key); setFinSecondaire(""); setError(null); }}
                  />
                ))}
              </FieldSection>

              {/* ── Opération (mode directe) ── */}
              {mode === "directe" && (
                <FieldSection label="📊 Opération *">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {([
                      { val: "depot"   as OperationType, icon: "📈", label: "Début journée" },
                      { val: "retrait" as OperationType, icon: "🌇",  label: "Fin journée"  },
                    ] as const).map(op => {
                      const hasTypes     = filterOptions(allActiveOptions, entryAccess, op.val).length > 0;
                      const allowedByType = !typeCompte || opsForCurrentType.includes(op.val);
                      const disabled     = !hasTypes || !allowedByType;
                      return (
                        <button
                          key={op.val}
                          onClick={() => !disabled && handleOperationChange(op.val)}
                          title={disabled ? "Non autorisé pour ce type de compte" : undefined}
                          style={{
                            padding: "13px", borderRadius: 12,
                            cursor: disabled ? "not-allowed" : "pointer",
                            border: `2px solid ${operation === op.val ? "#2abfbf" : "#e8edf2"}`,
                            background: disabled ? "#f8fafc" : operation === op.val ? "#f0fffe" : "#fff",
                            color: disabled ? "#cbd5e1" : operation === op.val ? "#0f766e" : "#64748b",
                            fontSize: 13, fontWeight: 700,
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                            transition: "all .15s",
                            opacity: disabled ? 0.5 : 1,
                          }}
                        >
                          {op.icon} {op.label}
                          {disabled && <span style={{ fontSize: 10 }}>🔒</span>}
                        </button>
                      );
                    })}
                  </div>
                </FieldSection>
              )}

              {/* ── Types de compte ── */}
              {mode === "directe" && (
                <FieldSection label="🏦 Type de compte *">
                  {availableTypes.length === 0 ? (
                    <div style={{
                      padding: "12px 14px", borderRadius: 12,
                      background: "#fff1f2", border: "1px solid #fca5a5",
                      fontSize: 12, color: "#9f1239",
                    }}>
                      ⚠️ Aucun type de compte autorisé pour cette opération.
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                        {availableTypes.map(ac => {
                          const access: EntryAccess = entryAccess[ac.value] ?? "both";
                          const badge =
                            access === "debut_only" ? { label: "Début", color: "#0f766e", bg: "#f0fdfa" } :
                            access === "fin_only"   ? { label: "Fin",   color: "#1d4ed8", bg: "#eff6ff" } :
                            null;
                          return (
                            <button
                              key={ac.value}
                              onClick={() => handleTypeChange(ac.value)}
                              style={{
                                display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                                padding: "13px 8px", borderRadius: 12, cursor: "pointer",
                                border: `2px solid ${typeCompte === ac.value ? "#f59e0b" : "#e8edf2"}`,
                                background: typeCompte === ac.value ? "#fffbeb" : "#fff",
                                transition: "all .15s",
                                position: "relative",
                              }}
                            >
                              <span style={{ fontSize: 22 }}>{ACCOUNT_ICONS[ac.value] ?? "💳"}</span>
                              <span style={{ fontSize: 11, fontWeight: 600, color: "#475569", textAlign: "center", lineHeight: 1.3 }}>
                                {ac.label}
                              </span>
                              {badge && (
                                <span style={{
                                  fontSize: 9, padding: "1px 5px", borderRadius: 4,
                                  background: badge.bg, color: badge.color,
                                  fontWeight: 700, border: `1px solid ${badge.color}30`,
                                }}>
                                  {badge.label} seul.
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <p style={{ fontSize: 11, color: "#64748b", marginTop: 8, display: "flex", alignItems: "center", gap: 5 }}>
                        <span>ℹ️</span> {availableTypes.length} compte{availableTypes.length > 1 ? "s" : ""} disponible{availableTypes.length > 1 ? "s" : ""}
                      </p>
                    </>
                  )}
                </FieldSection>
              )}

              {/* ── Opération partenaire ── */}
              {mode !== "directe" && (
                <FieldSection label="📊 Opération *">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {([
                      { val: "depot"   as OperationType, icon: "📈", label: "Dépôt"   },
                      { val: "retrait" as OperationType, icon: "🪚",  label: "Retrait" },
                    ] as const).map(op => (
                      <button
                        key={op.val}
                        onClick={() => { setOperation(op.val); setError(null); }}
                        style={{
                          padding: "13px", borderRadius: 12, cursor: "pointer",
                          border: `2px solid ${operation === op.val ? "#2abfbf" : "#e8edf2"}`,
                          background: operation === op.val ? "#f0fffe" : "#fff",
                          color: operation === op.val ? "#0f766e" : "#64748b",
                          fontSize: 14, fontWeight: 700,
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                          transition: "all .15s",
                        }}
                      >
                        {op.icon} {op.label}
                      </button>
                    ))}
                  </div>
                </FieldSection>
              )}

              {/* Partenaire enregistré */}
              {mode === "enregistre" && (
                <FieldSection label="👥 Partenaire *">
                  <select value={partenaireId} onChange={e => setPartenaireId(e.target.value)} style={inputCss}>
                    <option value="">— Sélectionner un partenaire —</option>
                    {partners.map(p => (
                      <option key={p.id} value={p.id}>{p.nomComplet}</option>
                    ))}
                  </select>
                  {partners.length === 0 && (
                    <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>Aucun partenaire disponible</p>
                  )}
                </FieldSection>
              )}

              {/* Partenaire libre */}
              {mode === "libre" && (
                <FieldSection label="✍️ Partenaire libre">
                  <input
                    value={partenaireNom}
                    onChange={e => setPartenaireNom(e.target.value)}
                    placeholder="Nom complet (min. 2 caractères)"
                    style={{ ...inputCss, marginBottom: 8 }}
                  />
                  <input
                    value={telephone}
                    onChange={e => setTelephone(e.target.value)}
                    placeholder="Téléphone (optionnel)"
                    style={inputCss}
                  />
                </FieldSection>
              )}

              {/* ── Montant F1 ── */}
              <FieldSection label={showF2 ? "🌇 Solde de fin (F1) *" : "💰 Montant *"}>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    value={montant}
                    onChange={e => setMontant(e.target.value)}
                    placeholder="Entrer le montant"
                    style={{ ...inputCss, paddingRight: 72, fontFamily: "monospace", fontSize: 15, fontWeight: 700 }}
                  />
                  <span style={{
                    position: "absolute", right: 14, top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 12, color: "#94a3b8", fontWeight: 600, pointerEvents: "none",
                  }}>
                    F CFA
                  </span>
                </div>
              </FieldSection>

              {/* ── Champ F2 — visible uniquement pour fin journée ── */}
              {showF2 && (
                <FieldSection label="🧮 Solde fin prévu (F2) — optionnel">
                  <div style={{ position: "relative" }}>
                    <input
                      type="number"
                      value={finSecondaire}
                      onChange={e => setFinSecondaire(e.target.value)}
                      placeholder="Laisser vide si non applicable"
                      style={{
                        ...inputCss,
                        paddingRight: 72,
                        fontFamily: "monospace", fontSize: 15, fontWeight: 700,
                        border: `2px solid ${finSecondaire ? "#3b82f6" : "#e8edf2"}`,
                        background: finSecondaire ? "#eff6ff" : "#fafbfc",
                      }}
                    />
                    <span style={{
                      position: "absolute", right: 14, top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 12, color: "#94a3b8", fontWeight: 600, pointerEvents: "none",
                    }}>
                      F CFA
                    </span>
                  </div>

                  {/* Aperçu diff en temps réel */}
                  {diffPreview !== null && (
                    <div style={{
                      marginTop: 8,
                      padding: "10px 14px", borderRadius: 10,
                      background: diffPreview >= 0 ? "#f0fdf4" : "#fff1f2",
                      border: `1px solid ${diffPreview >= 0 ? "#86efac" : "#fca5a5"}`,
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}>
                      <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                        Écart F2 − F1
                      </span>
                      <span style={{
                        fontSize: 14, fontWeight: 900,
                        color: diffPreview >= 0 ? "#16a34a" : "#e11d48",
                      }}>
                        {diffPreview >= 0 ? "+" : "−"}
                        {Math.abs(diffPreview).toLocaleString("fr-FR")} F
                      </span>
                    </div>
                  )}

                  <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
                    F2 sera enregistré en base et visible dans le tableau de bord.
                  </p>
                </FieldSection>
              )}

              {/* Erreur */}
              {error && (
                <div style={{
                  margin: "0 0 16px",
                  padding: "10px 14px", borderRadius: 10,
                  background: "#fee2e2", border: "1px solid #fca5a5",
                  color: "#9f1239", fontSize: 13,
                }}>
                  ⚠️ {error}
                </div>
              )}
            </div>
          )}

          {/* ── Footer ── */}
          <div style={{
            padding: "16px 20px",
            display: "flex", gap: 12,
            borderTop: "1px solid #f1f5f9",
            marginTop: 16,
          }}>
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: "13px", borderRadius: 12,
                border: "1.5px solid #e2e8f0", background: "#fff",
                fontSize: 14, fontWeight: 700, color: "#64748b", cursor: "pointer",
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || loadingData}
              style={{
                flex: 2, padding: "13px", borderRadius: 12, border: "none",
                background: loading || loadingData ? "#94d9d9" : "#2abfbf",
                color: "#fff", fontSize: 14, fontWeight: 800,
                cursor: loading || loadingData ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "background .2s",
              }}
            >
              {loading ? (
                <span style={{
                  width: 18, height: 18,
                  border: "2.5px solid rgba(255,255,255,.35)",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  display: "inline-block",
                  animation: "txspin .8s linear infinite",
                }} />
              ) : <>✅ Valider</>}
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes txspin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

// ─── SOUS-COMPOSANTS ─────────────────────────────────────────────────────────

function FieldSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function ModeButton({ icon, label, sub, active, onClick }: {
  icon: string; label: string; sub: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex", alignItems: "center", gap: 12,
        padding: "13px 14px", borderRadius: 12, marginBottom: 8,
        border: `2px solid ${active ? "#2abfbf" : "#e8edf2"}`,
        background: active ? "#f0fffe" : "#fff",
        cursor: "pointer", textAlign: "left",
        transition: "all .15s",
      }}
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{label}</div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{sub}</div>
      </div>
      {active && (
        <div style={{
          width: 22, height: 22, borderRadius: "50%",
          background: "#2abfbf", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
            <path d="M1 4.5L4 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
    </button>
  );
}

// ─── STYLE INPUT ─────────────────────────────────────────────────────────────

const inputCss: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  border: "2px solid #e8edf2",
  borderRadius: 12,
  fontSize: 13,
  color: "#334155",
  outline: "none",
  boxSizing: "border-box",
  background: "#fafbfc",
  fontFamily: "inherit",
};