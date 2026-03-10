// src/pages/Superviseur.tsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import TransactionService from "@/services/TransactionService";
import AuthService from "@/services/Authservice";
import AccountLineService from "@/services/accountLines.service";
import TransactionModal from "@/components/TransactionModal_super";
import type { SupervisorDashboard, Period } from "@/types/transaction.types";
import type { LineType } from "@/types/accountLines.types";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt = (n: number) => Math.abs(n).toLocaleString("fr-FR") + " F";
const fmtSigned = (n: number) =>
  (n >= 0 ? "+" : "−") + Math.abs(n).toLocaleString("fr-FR") + " F";

const ACCOUNT_LABELS: Record<string, string> = {
  LIQUIDE: "Liquide", ORANGE_MONEY: "Orange Money", WAVE: "Wave",
  UV_MASTER: "UV Master", FREE_MONEY: "Free Money",
  WESTERN_UNION: "Western Union", RIA: "Ria", MONEYGRAM: "MoneyGram", AUTRES: "Autres",
};
const ACCOUNT_ICONS: Record<string, string> = {
  LIQUIDE: "💵", ORANGE_MONEY: "📱", WAVE: "🌊", UV_MASTER: "⭐",
  FREE_MONEY: "💸", WESTERN_UNION: "🏦", RIA: "💱", MONEYGRAM: "💰", AUTRES: "📦",
};
const TX_LABEL: Record<string, string> = {
  DEPOT: "Dépôt", RETRAIT: "Retrait",
  DEBUT_JOURNEE: "Début journée", FIN_JOURNEE: "Fin journée",
  TRANSFERT_ENVOYE: "Transfert envoyé", TRANSFERT_RECU: "Transfert reçu",
  ALLOCATION_UV_MASTER: "Allocation UV",
};
const PERIODS: { value: Period; label: string }[] = [
  { value: "today",     label: "Aujourd'hui" },
  { value: "yesterday", label: "Hier"        },
  { value: "week",      label: "Semaine"     },
  { value: "month",     label: "Mois"        },
];

type Tab = "dashboard" | "transactions";

// ─── BOUTON ACTION ────────────────────────────────────────────────────────────
const ActionBtn = ({ icon, title, color, onClick }: {
  icon: string; title: string; color: string; onClick: () => void;
}) => (
  <button
    onClick={e => { e.stopPropagation(); onClick(); }}
    title={title}
    style={{
      width: 22, height: 22, borderRadius: 6, border: "none",
      background: "transparent", cursor: "pointer", fontSize: 12,
      display: "flex", alignItems: "center", justifyContent: "center", color,
    }}
  >{icon}</button>
);

const btnActionStyle = (color: string, bg: string, border: string): React.CSSProperties => ({
  padding: "11px 14px", borderRadius: 10,
  border: `1.5px solid ${border}`, background: bg,
  fontSize: 13, fontWeight: 700, color, cursor: "pointer",
  textAlign: "left", display: "flex", alignItems: "center", gap: 8, width: "100%",
});

// ─── MODAL ACTIONS LIGNE ─────────────────────────────────────────────────────
interface ActionModalProps {
  supervisorId: string;
  lineType: LineType;
  accountKey: string;
  currentValue: number;
  label: string;
  targetDate?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ActionModal = ({
  supervisorId, lineType, accountKey, currentValue, label, targetDate, onClose, onSuccess
}: ActionModalProps) => {
  const [action, setAction]     = useState<"modifier" | "reinit" | "supprimer" | null>(null);
  const [newValue, setNewValue] = useState(String(currentValue));
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [isAdminError, setIsAdminError] = useState(false);

  // Label d'affichage : pour les partenaires (clé "part-NOM") on affiche juste le nom
  const displayLabel = accountKey.startsWith("part-")
    ? accountKey.replace("part-", "")
    : label;
  const displayIcon  = accountKey.startsWith("part-") ? "🤝" : (ACCOUNT_ICONS[accountKey] ?? "📦");

  const handleConfirm = async () => {
    setLoading(true); setError(null); setIsAdminError(false);
    try {
      if (action === "modifier") {
        await AccountLineService.updateAccountLine(supervisorId, lineType, accountKey, parseFloat(newValue), targetDate);
      } else if (action === "reinit") {
        await AccountLineService.resetAccountLine(supervisorId, lineType, accountKey, 0);
      } else if (action === "supprimer") {
        await AccountLineService.deleteAccountLine(supervisorId, lineType, accountKey, targetDate);
      }
      onSuccess(); onClose();
    } catch (e: unknown) {
      let msg = "Erreur inconnue"; let code = "";
      if (e && typeof e === "object") {
        const err = e as { message?: string; response?: { data?: { message?: string; code?: string } }; code?: string };
        msg  = err.response?.data?.message || err.message || "Erreur inconnue";
        code = err.response?.data?.code    || err.code    || "";
      }
      const isAdmin = code === "CREATED_BY_ADMIN" || msg.toLowerCase().includes("administrateur");
      setIsAdminError(isAdmin);
      setError(msg);
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      background: "rgba(15,23,42,.55)", backdropFilter: "blur(6px)",
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: 24,
        maxWidth: 340, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,.18)",
      }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>
          {displayIcon} {displayLabel}
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16 }}>
          Valeur actuelle : <b style={{ color: "#334155" }}>{fmt(currentValue)}</b>
          {" · "}<span style={{ textTransform: "capitalize" }}>{lineType}</span>
        </div>

        {!action && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={() => setAction("modifier")}  style={btnActionStyle("#0f766e", "#f0fdfa", "#14b8a6")}>✏️ Modifier la valeur</button>
            <button onClick={() => setAction("reinit")}    style={btnActionStyle("#d97706", "#fffbeb", "#f59e0b")}>🔄 Réinitialiser à 0</button>
            <button onClick={() => setAction("supprimer")} style={btnActionStyle("#e11d48", "#fff1f2", "#fca5a5")}>🗑️ Supprimer la ligne</button>
          </div>
        )}

        {action === "modifier" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>Nouvelle valeur (F)</label>
            <input type="number" value={newValue} onChange={e => setNewValue(e.target.value)} autoFocus
              style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, fontWeight: 700, outline: "none", width: "100%" }} />
          </div>
        )}

        {(action === "reinit" || action === "supprimer") && (
          <div style={{
            padding: "12px 14px", borderRadius: 10,
            background: action === "supprimer" ? "#fff1f2" : "#fffbeb",
            border: `1px solid ${action === "supprimer" ? "#fca5a5" : "#fde68a"}`,
            fontSize: 13, color: "#334155",
          }}>
            {action === "reinit" ? `Réinitialiser "${displayLabel}" à 0 ?` : `Supprimer définitivement "${displayLabel}" ?`}
          </div>
        )}

        {error && (
          <div style={{
            marginTop: 10, padding: "12px 14px", borderRadius: 10,
            background: isAdminError ? "#fef3c7" : "#fee2e2",
            border: `1px solid ${isAdminError ? "#fde68a" : "#fca5a5"}`,
            color: isAdminError ? "#92400e" : "#9f1239", fontSize: 12,
          }}>
            {isAdminError ? "🔒" : "⚠️"} {error}
            {isAdminError && <div style={{ marginTop: 6, fontSize: 11, opacity: 0.8 }}>Contactez un administrateur pour effectuer cette modification.</div>}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={() => action ? setAction(null) : onClose()}
            style={{ flex: 1, padding: "10px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 700, color: "#64748b", cursor: "pointer" }}>
            {action ? "← Retour" : "Annuler"}
          </button>
          {action && (
            <button onClick={handleConfirm} disabled={loading} style={{
              flex: 1, padding: "10px", borderRadius: 10, border: "none",
              background: action === "supprimer" ? "#f43f5e" : action === "reinit" ? "#d97706" : "#0f766e",
              color: "#fff", fontSize: 13, fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
            }}>
              {loading ? "⏳" : action === "modifier" ? "Enregistrer" : action === "reinit" ? "Réinitialiser" : "Supprimer"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── LIGNE PARTENAIRE RÉUTILISABLE ────────────────────────────────────────────
// Utilisée dans les deux colonnes (Début et Fin) avec boutons d'action

interface PartnerRowProps {
  name:        string;
  montant:     number;
  lineType:    LineType;
  supId:       string | undefined;
  color:       string;
  onAction:    (lineType: LineType, accountKey: string, val: number, label: string) => void;
}

const PartnerRow = ({ name, montant, lineType, supId, color, onAction }: PartnerRowProps) => {
  const accountKey = `part-${name}`;
  return (
    <div className="sup-row" style={{
      display: "grid", gridTemplateColumns: "1fr auto",
      padding: "9px 16px", alignItems: "center",
      borderBottom: "1px solid #f8fafc", background: "#fafffe",
    }}>
      <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{
          width: 20, height: 20, borderRadius: "50%",
          background: "linear-gradient(135deg,#ccfbf1,#a7f3d0)",
          color: "#0f766e", display: "inline-flex", alignItems: "center",
          justifyContent: "center", fontSize: 9, fontWeight: 800, flexShrink: 0,
        }}>{name[0]?.toUpperCase()}</span>
        <span style={{ fontSize: 13, color: "#334155", fontWeight: 600 }}>{name}</span>
        <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#f0fdfa", color: "#0f766e", fontWeight: 700, border: "1px solid #14b8a620" }}>
          partenaire
        </span>
      </span>

      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 13, color, fontWeight: 700 }}>{fmt(montant)}</span>

        {/* ── BOUTONS D'ACTION (toujours visibles sur partenaire) ── */}
        {supId && (
          <span className="sup-row-actions-partner">
            <ActionBtn
              icon="✏️" title="Modifier" color="#0f766e"
              onClick={() => onAction(lineType, accountKey, montant, name)}
            />
            <ActionBtn
              icon="🔄" title="Réinit à 0" color="#d97706"
              onClick={() => onAction(lineType, accountKey, montant, name)}
            />
            <ActionBtn
              icon="🗑️" title="Supprimer" color="#e11d48"
              onClick={() => onAction(lineType, accountKey, montant, name)}
            />
          </span>
        )}
      </span>
    </div>
  );
};

// ─── PAGE ────────────────────────────────────────────────────────────────────
const Superviseur = () => {
  const navigate = useNavigate();
  const user     = AuthService.getStoredUser();

  const [tab,         setTab]         = useState<Tab>("dashboard");
  const [period,      setPeriod]      = useState<Period>("today");
  const [dashboard,   setDashboard]   = useState<SupervisorDashboard | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [showModal,   setShowModal]   = useState(false);
  const [showLogout,  setShowLogout]  = useState(false);
  const [actionModal, setActionModal] = useState<{
    lineType: LineType; accountKey: string; currentValue: number; label: string; targetDate?: string;
  } | null>(null);

  const load = useCallback(async (p: Period) => {
    setLoading(true); setError(null);
    try {
      const data = await TransactionService.getSupervisorDashboard(undefined, p);
      setDashboard(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  const handleLogout = async () => { await AuthService.logout(); navigate("/login"); };

  const sup    = dashboard?.superviseur;
  const totaux = dashboard?.totaux;

  // Comptes standards (non-partenaires)
  const accountEntries = dashboard
    ? Object.entries(dashboard.comptes.debut).filter(([k]) => !k.startsWith("part-"))
    : [];

  // Partenaires — union des clés part-xxx dans debut ET sortie
  const partnerRows: { name: string; depots: number; retraits: number }[] = (() => {
    if (!dashboard) return [];
    const map: Record<string, { depots: number; retraits: number }> = {};

    Object.entries(dashboard.comptes.debut)
      .filter(([k]) => k.startsWith("part-"))
      .forEach(([k, v]) => {
        const name = k.replace("part-", "");
        if (!map[name]) map[name] = { depots: 0, retraits: 0 };
        map[name].depots += v as number;
      });

    Object.entries(dashboard.comptes.sortie)
      .filter(([k]) => k.startsWith("part-"))
      .forEach(([k, v]) => {
        const name = k.replace("part-", "");
        if (!map[name]) map[name] = { depots: 0, retraits: 0 };
        map[name].retraits += v as number;
      });

    // Fallback depuis recentTransactions si rien dans comptes
    if (Object.keys(map).length === 0 && dashboard.recentTransactions) {
      dashboard.recentTransactions.forEach(tx => {
        if (!tx.partenaireId && !tx.partenaireNom) return;
        const name = tx.partenaireNom ?? tx.personne?.replace(" (Partenaire)", "") ?? "Inconnu";
        if (!map[name]) map[name] = { depots: 0, retraits: 0 };
        if (tx.type === "DEPOT")   map[name].depots   += tx.montant;
        if (tx.type === "RETRAIT") map[name].retraits += tx.montant;
      });
    }
    return Object.entries(map).map(([name, v]) => ({ name, ...v }));
  })();

  const hasPartners = partnerRows.length > 0;

  const partnerTransactions = dashboard?.recentTransactions?.filter(
    tx => tx.partenaireId || tx.partenaireNom
  ) ?? [];

  // Calcul de la targetDate selon la période
  const targetDate = period === "yesterday"
    ? (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split("T")[0]; })()
    : undefined;

  // Ouvre le modal d'action avec la bonne action préselected
  const openAction = (lineType: LineType, accountKey: string, currentValue: number, label: string) => {
    setActionModal({ lineType, accountKey, currentValue, label, targetDate });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans','Outfit',sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        .sup-grid-3     { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
        .sup-table-wrap { display: grid; grid-template-columns: 1fr 1fr; }
        .sup-totaux     { display: grid; grid-template-columns: 1fr 1fr 1fr; }
        .sup-row-actions         { display: flex; gap: 2px; opacity: 0; transition: opacity .15s; }
        .sup-row:hover .sup-row-actions { opacity: 1; }
        .sup-row-actions-partner { display: flex; gap: 2px; opacity: 1; }
        @media (max-width: 620px) {
          .sup-grid-3 { grid-template-columns: 1fr 1fr !important; }
          .sup-table-wrap { grid-template-columns: 1fr !important; }
          .sup-col-fin { border-top: 2px solid #e2e8f0; }
          .sup-hide-sm { display: none !important; }
        }
        @media (max-width: 400px) {
          .sup-grid-3 { grid-template-columns: 1fr !important; }
          .sup-totaux { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ══ NAVBAR ══ */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 30,
        background: "#fff", borderBottom: "1px solid #f1f5f9",
        boxShadow: "0 1px 12px rgba(0,0,0,.05)",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px", height: 58, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: "linear-gradient(135deg,#0f766e,#14b8a6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 800, color: "#fff",
            }}>
              {(user?.nomComplet ?? sup?.nom ?? "S")[0].toUpperCase()}
            </div>
            <div className="sup-hide-sm">
              <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>
                {user?.nomComplet ?? sup?.nom ?? "Superviseur"}
              </div>
              <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>Superviseur</div>
            </div>
          </div>

          <div style={{ flex: 1, display: "flex", justifyContent: "center", gap: 4 }}>
            {([
              { key: "dashboard"    as Tab, icon: "📊", label: "Dashboard"    },
              { key: "transactions" as Tab, icon: "🕐", label: "Transactions" },
            ] as const).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 10, border: "none",
                fontSize: 13, fontWeight: tab === t.key ? 800 : 600,
                color:      tab === t.key ? "#0f766e" : "#64748b",
                background: tab === t.key ? "#f0fdfa"  : "transparent",
                cursor: "pointer",
              }}>
                <span>{t.icon}</span>
                <span className="sup-hide-sm">{t.label}</span>
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <button onClick={() => setShowModal(true)} style={{
              padding: "7px 12px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg,#0f766e,#14b8a6)",
              color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer",
              whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(20,184,166,.3)",
            }}>
              + Transaction
            </button>
            <button onClick={() => setShowLogout(true)} style={{
              width: 34, height: 34, borderRadius: 10,
              border: "1.5px solid #fee2e2", background: "#fff5f5",
              color: "#f43f5e", display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer", flexShrink: 0,
            }}>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* ══ CONTENU ══ */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Période */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)} style={{
              padding: "6px 13px", borderRadius: 10, cursor: "pointer",
              border: `1.5px solid ${period === p.value ? "#14b8a6" : "#e2e8f0"}`,
              background: period === p.value ? "#f0fdfa" : "#fff",
              fontSize: 12, fontWeight: 600,
              color: period === p.value ? "#0f766e" : "#64748b",
            }}>{p.label}</button>
          ))}
          {loading && <span style={{ fontSize: 12, color: "#14b8a6", fontWeight: 600 }}>⏳ Chargement…</span>}
        </div>

        {error && (
          <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 12, padding: "12px 16px", color: "#9f1239", fontSize: 13, fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        {/* ══ TAB DASHBOARD ══ */}
        {tab === "dashboard" && (
          <>
            {/* KPI */}
            <div className="sup-grid-3">
              {[
                { icon: "🌅", label: "Début journée", value: totaux?.formatted.debutTotal,   color: "#0f766e", bg: "#f0fdfa", border: "#14b8a630" },
                { icon: "🌆", label: "Fin journée",   value: totaux?.formatted.sortieTotal,  color: "#d97706", bg: "#fffbeb", border: "#f59e0b30" },
                { icon: "⭐", label: "UV Master",     value: dashboard?.uvMaster?.formatted, color: "#7c3aed", bg: "#f5f3ff", border: "#8b5cf630" },
              ].map(c => (
                <div key={c.label} style={{
                  background: c.bg, border: `1px solid ${c.border}`,
                  borderRadius: 14, padding: "16px 12px", textAlign: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,.04)",
                }}>
                  {loading
                    ? <div style={{ height: 52, borderRadius: 10, background: "#f1f5f9" }} />
                    : <>
                        <div style={{ fontSize: 22, marginBottom: 5 }}>{c.icon}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 3 }}>{c.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: c.color }}>{c.value ?? "—"}</div>
                      </>
                  }
                </div>
              ))}
            </div>

            {/* G/R Banner */}
            {!loading && totaux && (
              <div style={{
                background: totaux.grTotal >= 0 ? "#f0fdfa" : "#fff1f2",
                border: `1px solid ${totaux.grTotal >= 0 ? "#14b8a630" : "#f4304030"}`,
                borderRadius: 14, padding: "14px 18px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".07em" }}>Gain / Reste (G/R)</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: totaux.grTotal >= 0 ? "#0f766e" : "#e11d48", marginTop: 3 }}>
                    {fmtSigned(totaux.grTotal)}
                  </div>
                </div>
                <div style={{ fontSize: 30, opacity: 0.18 }}>{totaux.grTotal >= 0 ? "📈" : "📉"}</div>
              </div>
            )}

            {/* ══ GRAND TABLEAU ══ */}
            {!loading && dashboard && (
              <div style={{
                background: "#fff", borderRadius: 16,
                border: "1px solid #f1f5f9",
                boxShadow: "0 2px 10px rgba(0,0,0,.04)",
                overflow: "hidden",
              }}>
                <div className="sup-table-wrap">

                  {/* ── COLONNE DÉBUT ── */}
                  <div style={{ borderRight: "1px solid #f1f5f9" }}>
                    <div style={{ padding: "9px 16px", borderBottom: "2px solid #14b8a6", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#14b8a6", display: "inline-block" }} />
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#0f766e", textTransform: "uppercase", letterSpacing: ".06em" }}>Début</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "5px 16px", fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".06em", borderBottom: "1px solid #f8fafc", background: "#fafafa" }}>
                      <span>Type / Partenaire</span><span>Montant</span>
                    </div>
                    {accountEntries.length === 0 && !hasPartners && (
                      <div style={{ padding: "18px 16px", color: "#cbd5e1", fontSize: 13, textAlign: "center" }}>—</div>
                    )}

                    {/* Lignes comptes standards */}
                    {accountEntries.map(([key, debut]) => (
                      <div key={key} className="sup-row" style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "9px 16px", alignItems: "center", borderBottom: "1px solid #f8fafc" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span style={{ fontSize: 15 }}>{ACCOUNT_ICONS[key] ?? "📦"}</span>
                          <span style={{ fontSize: 13, color: "#334155", fontWeight: 600 }}>{ACCOUNT_LABELS[key] ?? key}</span>
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 13, color: "#334155", fontWeight: 700 }}>{fmt(debut as number)}</span>
                          {sup?.id && (
                            <span className="sup-row-actions">
                              <ActionBtn icon="✏️" title="Modifier"    color="#0f766e" onClick={() => openAction("debut", key, debut as number, ACCOUNT_LABELS[key] ?? key)} />
                              <ActionBtn icon="🔄" title="Réinit à 0"  color="#d97706" onClick={() => openAction("debut", key, debut as number, ACCOUNT_LABELS[key] ?? key)} />
                              <ActionBtn icon="🗑️" title="Supprimer"  color="#e11d48" onClick={() => openAction("debut", key, debut as number, ACCOUNT_LABELS[key] ?? key)} />
                            </span>
                          )}
                        </span>
                      </div>
                    ))}

                    {/* ✅ Lignes partenaires (dépôts) AVEC boutons d'action */}
                    {partnerRows.filter(p => p.depots > 0).map(({ name, depots }) => (
                      <PartnerRow
                        key={`debut-part-${name}`}
                        name={name} montant={depots}
                        lineType="debut" supId={sup?.id}
                        color="#0f766e"
                        onAction={openAction}
                      />
                    ))}
                  </div>

                  {/* ── COLONNE FIN ── */}
                  <div className="sup-col-fin">
                    <div style={{ padding: "9px 16px", borderBottom: "2px solid #3b82f6", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3b82f6", display: "inline-block" }} />
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: ".06em" }}>Fin</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "5px 16px", fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".06em", borderBottom: "1px solid #f8fafc", background: "#fafafa" }}>
                      <span>Type / Partenaire</span><span>Montant</span>
                    </div>
                    {accountEntries.length === 0 && !hasPartners && (
                      <div style={{ padding: "18px 16px", color: "#cbd5e1", fontSize: 13, textAlign: "center" }}>—</div>
                    )}

                    {/* Lignes comptes standards */}
                    {accountEntries.map(([key]) => {
                      const sortie = dashboard.comptes.sortie[key] ?? 0;
                      return (
                        <div key={key} className="sup-row" style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "9px 16px", alignItems: "center", borderBottom: "1px solid #f8fafc" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <span style={{ fontSize: 15 }}>{ACCOUNT_ICONS[key] ?? "📦"}</span>
                            <span style={{ fontSize: 13, color: "#334155", fontWeight: 600 }}>{ACCOUNT_LABELS[key] ?? key}</span>
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 13, color: sortie > 0 ? "#334155" : "#cbd5e1", fontWeight: 700 }}>
                              {sortie > 0 ? fmt(sortie) : "—"}
                            </span>
                            {sup?.id && sortie > 0 && (
                              <span className="sup-row-actions">
                                <ActionBtn icon="✏️" title="Modifier"   color="#0f766e" onClick={() => openAction("sortie", key, sortie, ACCOUNT_LABELS[key] ?? key)} />
                                <ActionBtn icon="🔄" title="Réinit à 0" color="#d97706" onClick={() => openAction("sortie", key, sortie, ACCOUNT_LABELS[key] ?? key)} />
                                <ActionBtn icon="🗑️" title="Supprimer" color="#e11d48" onClick={() => openAction("sortie", key, sortie, ACCOUNT_LABELS[key] ?? key)} />
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })}

                    {/* ✅ Lignes partenaires (retraits) AVEC boutons d'action */}
                    {partnerRows.filter(p => p.retraits > 0).map(({ name, retraits }) => (
                      <PartnerRow
                        key={`fin-part-${name}`}
                        name={name} montant={retraits}
                        lineType="sortie" supId={sup?.id}
                        color="#e11d48"
                        onAction={openAction}
                      />
                    ))}
                  </div>
                </div>

                {/* Barre totaux */}
                {totaux && (
                  <div className="sup-totaux" style={{ borderTop: "2px solid #f1f5f9" }}>
                    <div style={{ padding: "12px 16px", textAlign: "center", background: "#f0fdf4", borderRight: "1px solid #f1f5f9" }}>
                      <div style={{ fontSize: 9, fontWeight: 800, color: "#16a34a", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 3 }}>Début</div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: "#15803d" }}>{fmt(totaux.debutTotal)}</div>
                    </div>
                    <div style={{ padding: "12px 16px", textAlign: "center", background: totaux.grTotal >= 0 ? "#16a34a" : "#dc2626" }}>
                      <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,.8)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 3 }}>GR Total</div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: "#fff" }}>{fmt(totaux.grTotal)}</div>
                    </div>
                    <div style={{ padding: "12px 16px", textAlign: "center", background: "#eff6ff", borderLeft: "1px solid #f1f5f9" }}>
                      <div style={{ fontSize: 9, fontWeight: 800, color: "#2563eb", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 3 }}>Fin</div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: "#1d4ed8" }}>{fmt(totaux.sortieTotal)}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[1, 2, 3].map(i => <div key={i} style={{ height: 60, borderRadius: 14, background: "#f1f5f9" }} />)}
              </div>
            )}
          </>
        )}

        {/* ══ TAB TRANSACTIONS ══ */}
        {tab === "transactions" && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", boxShadow: "0 2px 10px rgba(0,0,0,.04)", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f8fafc", fontSize: 13, fontWeight: 800, color: "#334155" }}>
              🕐 Transactions récentes
            </div>
            {loading ? (
              <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                {[1,2,3,4,5].map(i => <div key={i} style={{ height: 52, borderRadius: 12, background: "#f1f5f9" }} />)}
              </div>
            ) : !dashboard?.recentTransactions?.length ? (
              <div style={{ padding: "48px 20px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
                📭 Aucune transaction sur cette période
              </div>
            ) : (
              dashboard.recentTransactions.map(tx => {
                const isPos     = ["DEPOT", "DEBUT_JOURNEE", "TRANSFERT_RECU", "ALLOCATION_UV_MASTER"].includes(tx.type);
                const isPartner = !!(tx.partenaireId || tx.partenaireNom);
                return (
                  <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: "1px solid #f8fafc" }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: isPos ? "#f0fdfa" : "#fff1f2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                      {isPos ? "⬆️" : "⬇️"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{TX_LABEL[tx.type] ?? tx.type}</span>
                        {isPartner && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 6, background: "#f0fdfa", color: "#0f766e", border: "1px solid #14b8a620" }}>
                            🤝 Partenaire
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {tx.personne} · {new Date(tx.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: isPos ? "#0f766e" : "#e11d48", whiteSpace: "nowrap" }}>
                      {isPos ? "+" : "−"}{fmt(tx.montant)}
                    </div>
                  </div>
                );
              })
            )}

            {!loading && partnerTransactions.length > 0 && (
              <div style={{ borderTop: "2px solid #f1f5f9" }}>
                <div style={{ padding: "8px 16px", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: ".06em", background: "#f8fafc" }}>
                  🤝 Résumé partenaires · {partnerTransactions.length} tx
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "12px 16px", gap: 10 }}>
                  <div style={{ textAlign: "center", padding: "10px", borderRadius: 10, background: "#f0fdf4" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", marginBottom: 3 }}>Total dépôts</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "#15803d" }}>
                      {fmt(partnerTransactions.filter(t => t.type === "DEPOT").reduce((s, t) => s + t.montant, 0))}
                    </div>
                  </div>
                  <div style={{ textAlign: "center", padding: "10px", borderRadius: 10, background: "#fff1f2" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#e11d48", textTransform: "uppercase", marginBottom: 3 }}>Total retraits</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "#be123c" }}>
                      {fmt(partnerTransactions.filter(t => t.type === "RETRAIT").reduce((s, t) => s + t.montant, 0))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══ MODALS ══ */}
      {showModal && (
        <TransactionModal
          superviseurId={dashboard?.superviseur?.id ?? ""}
          onClose={() => setShowModal(false)}
          onSuccess={() => load(period)}
        />
      )}

      {actionModal && sup?.id && (
        <ActionModal
          supervisorId={sup.id}
          lineType={actionModal.lineType}
          accountKey={actionModal.accountKey}
          currentValue={actionModal.currentValue}
          label={actionModal.label}
          targetDate={actionModal.targetDate}
          onClose={() => setActionModal(null)}
          onSuccess={() => load(period)}
        />
      )}

      {showLogout && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(15,23,42,.5)", backdropFilter: "blur(6px)" }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 26, maxWidth: 300, width: "100%", textAlign: "center", boxShadow: "0 24px 64px rgba(0,0,0,.15)" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>👋</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", marginBottom: 5 }}>Déconnexion</div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>Voulez-vous vraiment vous déconnecter ?</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowLogout(false)} style={{ flex: 1, padding: "10px", borderRadius: 11, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 700, color: "#64748b", cursor: "pointer" }}>Annuler</button>
              <button onClick={handleLogout} style={{ flex: 1, padding: "10px", borderRadius: 11, border: "none", background: "#f43f5e", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>Déconnecter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Superviseur;