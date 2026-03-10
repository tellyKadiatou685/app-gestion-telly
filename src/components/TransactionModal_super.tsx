// src/components/TransactionModal_super.tsx
import { useEffect, useState } from "react";
import TransactionService from "@/services/TransactionService";
import api from "@/config";
import type { AccountTypeOption } from "@/types/accountType.types";
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

// ─── PARSER DÉFENSIF (identique admin modal) ─────────────────────────────────

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

    console.warn("[TransactionModal_super] Réponse /accountype inattendue:", raw);
    return [];
  } catch (e) {
    console.error("[TransactionModal_super] parseActiveOptions erreur:", e);
    return [];
  }
}

// ─── COMPOSANT ───────────────────────────────────────────────────────────────

export default function TransactionModal({ superviseurId, onClose, onSuccess }: TransactionModalProps) {
  const [mode,          setMode]          = useState<TxMode>("directe");
  const [typeCompte,    setTypeCompte]    = useState<string>("");
  const [operation,     setOperation]     = useState<OperationType>("depot");
  const [montant,       setMontant]       = useState("");
  const [partenaireId,  setPartenaireId]  = useState("");
  const [partenaireNom, setPartenaireNom] = useState("");
  const [telephone,     setTelephone]     = useState("");
  const [loading,       setLoading]       = useState(false);
  const [loadingData,   setLoadingData]   = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [partners,      setPartners]      = useState<{ id: string; nomComplet: string }[]>([]);
  const [accountTypes,  setAccountTypes]  = useState<AccountTypeOption[]>([]);

  // ── Chargement initial : account types + partenaires ─────────────────────
  useEffect(() => {
    const load = async () => {
      setLoadingData(true);
      try {
        const [acRes, partRes] = await Promise.allSettled([
          api.get("/accountype"),
          TransactionService.getActivePartners(),
        ]);

        if (acRes.status === "fulfilled") {
          const parsed = parseActiveOptions(acRes.value);
          setAccountTypes(parsed);
          if (parsed.length > 0) setTypeCompte(parsed[0].value);
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

  // ── Soumission ───────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!montant || parseFloat(montant) <= 0) {
      setError("Veuillez saisir un montant valide");
      return;
    }
    if (mode === "directe" && !typeCompte) {
      setError("Veuillez sélectionner un type de compte");
      return;
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
      {/* ── Fond avec dégradé vers le bas ── */}
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
          {/* ── Header teal ── */}
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

              {/* Type d'opération */}
              <FieldSection label="🎯 Type d'opération">
                {([
                  { key: "directe"    as TxMode, icon: "💸", label: "Transaction directe",   sub: "Début/Fin journée" },
                  { key: "enregistre" as TxMode, icon: "👥", label: "Partenaire enregistré", sub: "Du système"        },
                  { key: "libre"      as TxMode, icon: "✍️", label: "Partenaire libre",       sub: "Nom manuel"        },
                ] as const).map(opt => (
                  <ModeButton
                    key={opt.key}
                    icon={opt.icon} label={opt.label} sub={opt.sub}
                    active={mode === opt.key}
                    onClick={() => { setMode(opt.key); setError(null); }}
                  />
                ))}
              </FieldSection>

              {/* ── Type de compte (actifs depuis API) ── */}
              {mode === "directe" && (
                <FieldSection label="🏦 Type de compte *">
                  {accountTypes.length === 0 ? (
                    <div style={{
                      padding: "12px 14px", borderRadius: 12,
                      background: "#fff1f2", border: "1px solid #fca5a5",
                      fontSize: 12, color: "#9f1239",
                    }}>
                      ⚠️ Aucun type de compte actif. Contactez l'administrateur.
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                        {accountTypes.map(ac => (
                          <button
                            key={ac.value}
                            onClick={() => setTypeCompte(ac.value)}
                            style={{
                              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                              padding: "13px 8px", borderRadius: 12, cursor: "pointer",
                              border: `2px solid ${typeCompte === ac.value ? "#f59e0b" : "#e8edf2"}`,
                              background: typeCompte === ac.value ? "#fffbeb" : "#fff",
                              transition: "all .15s",
                            }}
                          >
                            <span style={{ fontSize: 22 }}>{ACCOUNT_ICONS[ac.value] ?? "💳"}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#475569", textAlign: "center", lineHeight: 1.3 }}>
                              {ac.label}
                            </span>
                          </button>
                        ))}
                      </div>
                      <p style={{ fontSize: 11, color: "#64748b", marginTop: 8, display: "flex", alignItems: "center", gap: 5 }}>
                        <span>ℹ️</span> {accountTypes.length} compte{accountTypes.length > 1 ? "s" : ""} actif{accountTypes.length > 1 ? "s" : ""}
                      </p>
                    </>
                  )}
                </FieldSection>
              )}

              {/* Partenaire enregistré */}
              {mode === "enregistre" && (
                <FieldSection label="👥 Partenaire *">
                  <select
                    value={partenaireId}
                    onChange={e => setPartenaireId(e.target.value)}
                    style={inputCss}
                  >
                    <option value="">— Sélectionner un partenaire —</option>
                    {partners.map(p => (
                      <option key={p.id} value={p.id}>{p.nomComplet}</option>
                    ))}
                  </select>
                  {partners.length === 0 && (
                    <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
                      Aucun partenaire disponible
                    </p>
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

              {/* Opération */}
              <FieldSection label="📊 Opération *">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {([
                    { val: "depot"   as OperationType, icon: "📈", label: "Début" },
                    { val: "retrait" as OperationType, icon: "🪚",  label: "Fin"  },
                  ] as const).map(op => (
                    <button
                      key={op.val}
                      onClick={() => setOperation(op.val)}
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

              {/* Montant */}
              <FieldSection label="💰 Montant *">
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    value={montant}
                    onChange={e => setMontant(e.target.value)}
                    placeholder="Entrer le montant"
                    style={{
                      ...inputCss,
                      paddingRight: 72,
                      fontFamily: "monospace",
                      fontSize: 15,
                      fontWeight: 700,
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
              </FieldSection>

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
      <p style={{
        fontSize: 13, fontWeight: 700, color: "#334155",
        marginBottom: 10,
        display: "flex", alignItems: "center", gap: 6,
      }}>
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

// ─── STYLE INPUT PARTAGÉ ─────────────────────────────────────────────────────

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