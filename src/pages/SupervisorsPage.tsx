// src/pages/SupervisorsPage.tsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import userRoutes from "@/Routes/Userroutes";
import TransactionService from "@/services/TransactionService";
import type { User } from "@/Routes/Userroutes";
import type { Period } from "@/types/transaction.types";

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface SupervisorItem {
  user: User & { codeClair?: string | null };
  todayStats: {
    txCount: number; debutTotal: number; sortieTotal: number;
    grTotal: number; lastTx?: string;
  } | null;
  loading: boolean;
}

interface DashboardData {
  comptes: { debut: Record<string, number>; sortie: Record<string, number> };
  totaux:  { debutTotal: number; sortieTotal: number; grTotal: number };
  recentTransactions: {
    id: string; type: string; montant: number;
    description: string; personne: string; createdAt: string;
  }[];
  transactionCount?: number; totalTransactions?: number; period: string;
  dynamicConfig?: { totalTransactionsFound?: number };
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const PALETTES = [
  { bg: "#dbeafe", text: "#1e40af" }, { bg: "#d1fae5", text: "#065f46" },
  { bg: "#ede9fe", text: "#5b21b6" }, { bg: "#fce7f3", text: "#9d174d" },
  { bg: "#fef3c7", text: "#92400e" }, { bg: "#f0fdfa", text: "#0f766e" },
  { bg: "#fee2e2", text: "#991b1b" },
];
const ACCOUNT_ICONS: Record<string, string> = {
  LIQUIDE: "💵", WAVE: "🌊", ORANGE_MONEY: "📱", UV_MASTER: "⭐", AUTRES: "📦",
};

function palFor(name: string) {
  let h = 0;
  for (const c of name) h = name.charCodeAt(0) + ((h << 5) - h);
  return PALETTES[Math.abs(h) % PALETTES.length];
}
function initials(n: string) { return n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(); }
function fmt(n: number) { return Math.abs(n).toLocaleString("fr-FR"); }
function fmtSigned(n: number) { const s = Math.abs(n).toLocaleString("fr-FR") + " F"; return n >= 0 ? `+${s}` : `-${s}`; }
function timeAgo(iso?: string) {
  if (!iso) return "—";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "à l'instant"; if (m < 60) return `${m} min`;
  if (m < 1440) return `${Math.floor(m / 60)}h`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}
function isPartnerKey(k: string) { return k.startsWith("part-"); }
function partnerName(k: string) { return k.replace(/^part-/, ""); }
function accountIcon(k: string) { return isPartnerKey(k) ? "🤝" : (ACCOUNT_ICONS[k] ?? "📦"); }
function accountLabel(k: string) {
  if (isPartnerKey(k)) return partnerName(k);
  return ({ LIQUIDE: "Liquide", WAVE: "Wave", ORANGE_MONEY: "Orange Money", UV_MASTER: "UV Master", AUTRES: "Autres" } as any)[k] ?? k;
}
function extractTxCount(d: DashboardData) {
  if (typeof d.transactionCount === "number") return d.transactionCount;
  if (typeof d.totalTransactions === "number") return d.totalTransactions;
  if (typeof d.dynamicConfig?.totalTransactionsFound === "number") return d.dynamicConfig.totalTransactionsFound;
  return d.recentTransactions?.length ?? 0;
}

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────

function Sk({ w = "100%", h = 12, r = 8 }: { w?: string | number; h?: number; r?: number }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: "linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%)", backgroundSize: "200% 100%", animation: "skpulse 1.4s ease infinite" }} />;
}

function Donut({ segs, size = 50 }: { segs: { color: string; v: number }[]; size?: number }) {
  const total = segs.reduce((s, d) => s + d.v, 0);
  if (total === 0) return <div style={{ width: size, height: size, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📊</div>;
  const cx = size / 2, cy = size / 2, r = (size - 8) / 2;
  let angle = -Math.PI / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segs.map((d, i) => {
        const sweep = (d.v / total) * 2 * Math.PI;
        const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
        angle += sweep;
        const x2 = cx + r * Math.cos(angle), y2 = cy + r * Math.sin(angle);
        return <path key={i} d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${sweep > Math.PI ? 1 : 0},1 ${x2},${y2}Z`} fill={d.color} opacity={0.9} />;
      })}
      <circle cx={cx} cy={cy} r={r * 0.54} fill="white" />
    </svg>
  );
}

function CopyCodeBtn({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try { await navigator.clipboard.writeText(code); } catch {
      const el = document.createElement("textarea"); el.value = code;
      document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el);
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} title="Copier le code" style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8,
      border: copied ? "1px solid #1d4ed8" : "1px solid #bfdbfe",
      background: copied ? "#dbeafe" : "#eff6ff", color: copied ? "#1e3a8a" : "#1d4ed8",
      fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all .2s",
      fontFamily: "monospace", letterSpacing: ".06em",
    }}>
      {copied ? "✓ Copié !" : `🔑 ${code}`}
    </button>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function SupervisorsPage() {
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [supervisors, setSupervisors]   = useState<SupervisorItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [tab, setTab]                   = useState<"tous" | "actifs" | "suspendus">("tous");
  const [panelId, setPanelId]           = useState<string | null>(null);
  const [showCreate, setShowCreate]     = useState(false);
  const [showCode, setShowCode]         = useState<{ nom: string; code: string } | null>(null);
  const [toast, setToast]               = useState<{ msg: string; ok: boolean } | null>(null);
  const [form, setForm]                 = useState({ nomComplet: "", telephone: "", code: "" });
  const [submitting, setSubmitting]     = useState(false);
  const [actioning, setActioning]       = useState<string | null>(null);

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      let list: User[] = [];
      try {
        const rAll = await userRoutes.getAllUsers({ role: "SUPERVISEUR", limit: 200 });
        const p = (rAll as any)?.data?.data ?? (rAll as any)?.data ?? rAll;
        list = Array.isArray(p) ? p : p?.users ?? p?.supervisors ?? [];
      } catch {
        try {
          const rActive = await userRoutes.getAllUsers({ role: "SUPERVISEUR", status: "ACTIVE", limit: 200 });
          const p = (rActive as any)?.data?.data ?? (rActive as any)?.data ?? rActive;
          list = Array.isArray(p) ? p : p?.users ?? p?.supervisors ?? [];
        } catch (e2: any) { throw e2; }
      }
      list = list.filter((u, i) => list.findIndex(x => x.id === u.id) === i);
      if (list.length === 0) { setSupervisors([]); return; }

      setSupervisors(list.map(u => ({ user: u, todayStats: null, loading: true })));

      const [dashResults, codeResults] = await Promise.all([
        Promise.allSettled(list.map(u =>
          u.status === "ACTIVE"
            ? TransactionService.getSupervisorDashboard(u.id, "today")
            : Promise.reject("suspended")
        )),
        Promise.allSettled(list.map(u => userRoutes.getUserCode(u.id))),
      ]);

      setSupervisors(list.map((u, i) => {
        const codeRes = codeResults[i];
        const codeClair: string | null = (() => {
          if (codeRes.status !== "fulfilled") return null;
          const r = (codeRes.value as any);
          return r?.data?.data?.codeAcces ?? r?.data?.data?.codeClair ?? r?.data?.codeAcces ?? r?.data?.codeClair ?? null;
        })();

        const dashRes = dashResults[i];
        if (dashRes.status === "rejected") return { user: { ...u, codeClair }, todayStats: null, loading: false };
        const d = dashRes.value as unknown as DashboardData;
        return {
          user: { ...u, codeClair },
          todayStats: {
            txCount:     extractTxCount(d),
            debutTotal:  d.totaux?.debutTotal  ?? 0,
            sortieTotal: d.totaux?.sortieTotal ?? 0,
            grTotal:     d.totaux?.grTotal     ?? 0,
            lastTx:      d.recentTransactions?.[0]?.createdAt,
          },
          loading: false,
        };
      }));
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Impossible de charger");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sorted = useMemo(() =>
    [...supervisors].sort((a, b) => (b.todayStats?.txCount ?? 0) - (a.todayStats?.txCount ?? 0)),
    [supervisors]);

  const counts = useMemo(() => ({
    tous:      sorted.length,
    actifs:    sorted.filter(s => s.user.status === "ACTIVE").length,
    suspendus: sorted.filter(s => s.user.status === "SUSPENDED").length,
  }), [sorted]);

  const filtered = useMemo(() => {
    if (tab === "actifs")    return sorted.filter(s => s.user.status === "ACTIVE");
    if (tab === "suspendus") return sorted.filter(s => s.user.status === "SUSPENDED");
    return sorted;
  }, [sorted, tab]);

  const heroKpis = useMemo(() => ({
    txTotal:  sorted.reduce((s, x) => s + (x.todayStats?.txCount ?? 0), 0),
    volTotal: sorted.reduce((s, x) => s + (x.todayStats?.sortieTotal ?? 0), 0),
  }), [sorted]);

  const maxTx = useMemo(() =>
    Math.max(1, sorted.reduce((m, x) => Math.max(m, x.todayStats?.txCount ?? 0), 0)), [sorted]);

  const handleToggle = async (sv: SupervisorItem) => {
    setActioning(sv.user.id);
    try {
      if (sv.user.status === "ACTIVE") { await userRoutes.suspendUser(sv.user.id); showToast(`⏸ ${sv.user.nomComplet} suspendu`); }
      else { await userRoutes.activateUser(sv.user.id); showToast(`✅ ${sv.user.nomComplet} activé`); }
      setPanelId(null); setSupervisors([]); await load();
    } catch (e: any) { showToast(e?.response?.data?.message ?? "Erreur", false); }
    finally { setActioning(null); }
  };

  const handleRegen = async (sv: SupervisorItem) => {
    setActioning(sv.user.id + "_c");
    try {
      const r = await userRoutes.regenerateUserCode(sv.user.id);
      const code = (r as any)?.data?.data?.nouveauCode ?? (r as any)?.data?.data?.codeAcces ?? "—";
      setShowCode({ nom: sv.user.nomComplet, code });
      setSupervisors(prev => prev.map(s => s.user.id === sv.user.id ? { ...s, user: { ...s.user, codeClair: code } } : s));
    } catch (e: any) { showToast(e?.response?.data?.message ?? "Erreur", false); }
    finally { setActioning(null); }
  };

  const handleCreate = async () => {
    if (!form.nomComplet.trim() || !form.telephone.trim()) { showToast("Nom et téléphone requis", false); return; }
    setSubmitting(true);
    try {
      const r: any = await userRoutes.createUser({
        nomComplet: form.nomComplet.trim(), telephone: form.telephone.trim(), role: "SUPERVISEUR", code: form.code.trim() || null,
      });
      const generatedCode = r?.data?.data?.codeAcces ?? r?.data?.data?.code ?? null;
      setShowCreate(false); setForm({ nomComplet: "", telephone: "", code: "" });
      if (generatedCode) setShowCode({ nom: form.nomComplet.trim(), code: generatedCode });
      else showToast(`✅ ${form.nomComplet} créé !`);
      await load();
    } catch (e: any) { showToast(e?.response?.data?.message ?? "Erreur création", false); }
    finally { setSubmitting(false); }
  };

  const panelSv = panelId ? sorted.find(s => s.user.id === panelId) : null;

  return (
    <>
      <style>{CSS}</style>

      {/* ── LAYOUT COMME LES AUTRES PAGES ── */}
      <div className="flex min-h-screen bg-[#f1f5f9]">
        <DashboardSidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />

        <div className="flex-1 min-w-0">

          {/* ── HERO ── */}
          <div className="sp-hero">
            <div className="sp-hero-deco" />
            <div className="sp-hero-row">
              <div className="sp-hero-left">
                {/* Hamburger — Tailwind pur */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden flex items-center justify-center rounded-xl flex-shrink-0 cursor-pointer"
                  style={{ width: 36, height: 36, background: "rgba(255,255,255,.18)", border: "1px solid rgba(255,255,255,.3)" }}
                  aria-label="Ouvrir le menu"
                >
                  <Menu className="h-4 w-4 text-white" />
                </button>
                <div>
                  <p className="sp-eyebrow">Gestion</p>
                  <h1 className="sp-title">Superviseurs</h1>
                  <p className="sp-sub">Classement en temps réel · activité du jour</p>
                </div>
              </div>

              <div className="sp-kpis">
                {[
                  { icon: "👥", v: counts.tous,                   l: "Total"          },
                  { icon: "✅", v: counts.actifs,                 l: "Actifs"         },
                  { icon: "⚡", v: heroKpis.txTotal,              l: "Tx aujourd'hui" },
                  { icon: "💰", v: fmt(heroKpis.volTotal) + " F", l: "Volume jour"    },
                ].map((k, i) => (
                  <div className="sp-kpill" key={i}>
                    <div className="sp-kpill-ico">{k.icon}</div>
                    <div className="sp-kpill-val">{k.v}</div>
                    <div className="sp-kpill-lbl">{k.l}</div>
                  </div>
                ))}
              </div>

              <button className="sp-btn-new" onClick={() => setShowCreate(true)}>＋ Nouveau</button>
            </div>
          </div>

          {/* ── CONTENU ── */}
          <div className="sp-body">

            {/* Tabs */}
            <div className="sp-tabs-row">
              <div className="sp-tabs">
                {(["tous", "actifs", "suspendus"] as const).map(t => (
                  <button key={t} className={`sp-tab${tab === t ? " on" : ""}`} onClick={() => setTab(t)}>
                    {t.charAt(0).toUpperCase() + t.slice(1)} ({counts[t]})
                  </button>
                ))}
              </div>
              <span className="sp-sort-hint">↓ classé par transactions du jour</span>
            </div>

            {error && (
              <div className="sp-err">
                ⚠️ {error}
                <button onClick={load} className="sp-err-retry">Réessayer</button>
              </div>
            )}

            {/* Grid cartes */}
            <div className="sp-grid">
              {loading
                ? Array(6).fill(0).map((_, i) => <CardSkeleton key={i} />)
                : filtered.length === 0
                  ? <div className="sp-empty">📭 Aucun superviseur</div>
                  : filtered.map((sv, idx) => (
                      <SupervisorCard key={sv.user.id} sv={sv}
                        rank={sorted.findIndex(s => s.user.id === sv.user.id) + 1}
                        idx={idx} maxTx={maxTx}
                        onOpen={() => setPanelId(sv.user.id)} />
                    ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── PANEL DETAIL ── */}
      <div className={`sp-overlay${panelId ? " on" : ""}`} onClick={() => setPanelId(null)} />
      <div className={`sp-panel${panelId ? " open" : ""}`}>
        {panelSv && (
          <PanelDetail sv={panelSv}
            rank={sorted.findIndex(s => s.user.id === panelSv.user.id) + 1}
            onClose={() => setPanelId(null)}
            onToggle={() => handleToggle(panelSv)}
            onRegen={() => handleRegen(panelSv)}
            actioning={actioning} />
        )}
      </div>

      {/* ── MODAL CRÉATION ── */}
      {showCreate && (
        <div className="sp-modal-bg" onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div className="sp-modal">
            <div className="sp-modal-head">
              <button className="sp-modal-x" onClick={() => setShowCreate(false)}>×</button>
              <div className="sp-modal-ico">👤</div>
              <h2>Nouveau superviseur</h2>
              <p>Créer un compte avec accès superviseur</p>
            </div>
            <div className="sp-modal-body">
              {[
                { label: "Nom complet",  ico: "👤", key: "nomComplet", type: "text",     ph: "Ex: Mamadou Diallo"         },
                { label: "Téléphone",    ico: "📞", key: "telephone",  type: "tel",      ph: "Ex: 77 123 45 67"           },
                { label: "Code d'accès", ico: "🔑", key: "code",       type: "password", ph: "Laisser vide = généré auto" },
              ].map(f => (
                <div className="sp-field" key={f.key}>
                  <label>{f.label}</label>
                  <div className="sp-finput">
                    <span className="sp-ficon">{f.ico}</span>
                    <input type={f.type} placeholder={f.ph} value={(form as any)[f.key]}
                      onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))} />
                  </div>
                </div>
              ))}
              <div className="sp-notice"><span>💡</span><p>{form.code ? "Code personnalisé." : "Code à 6 chiffres généré automatiquement."}</p></div>
              <div className="sp-modal-btns">
                <button className="sp-btn-cancel" onClick={() => setShowCreate(false)}>Annuler</button>
                <button className="sp-btn-ok" onClick={handleCreate} disabled={submitting}>{submitting ? "Création…" : "＋ Créer"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CODE ── */}
      {showCode && (
        <div className="sp-modal-bg" onClick={() => setShowCode(null)}>
          <div className="sp-modal" onClick={e => e.stopPropagation()}>
            <div className="sp-modal-head" style={{ background: "linear-gradient(135deg,#1e40af,#3b82f6)" }}>
              <button className="sp-modal-x" onClick={() => setShowCode(null)}>×</button>
              <div className="sp-modal-ico">🔑</div>
              <h2>Code d'accès</h2><p>Pour {showCode.nom}</p>
            </div>
            <div className="sp-modal-body">
              <div className="sp-code-box">
                <div className="sp-code-lbl">Code d'accès</div>
                <div className="sp-code-val">{showCode.code}</div>
                <div className="sp-code-warn">⚠️ Notez ce code, il ne sera plus visible ensuite.</div>
              </div>
              <button className="sp-btn-copy" onClick={async () => { await navigator.clipboard.writeText(showCode.code); showToast("Code copié !"); }}>
                📋 Copier le code
              </button>
              <button className="sp-btn-ok" style={{ width: "100%" }} onClick={() => setShowCode(null)}>✅ J'ai noté le code</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`sp-toast${toast.ok ? "" : " sp-toast-err"} show`}>{toast.msg}</div>}
    </>
  );
}

// ─── CARD SKELETON ────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="sp-card">
      <div className="sp-card-bar" />
      <div className="sp-card-body" style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
          <Sk w={22} h={22} r={50} /><Sk w={42} h={42} r={12} />
          <div style={{ flex: 1 }}><Sk w="60%" h={11} r={6} /><div style={{ height: 5 }} /><Sk w="38%" h={9} r={6} /></div>
        </div>
        <Sk h={26} r={8} />
        <Sk h={50} r={11} /><Sk h={5} r={99} /><Sk h={34} r={9} />
      </div>
    </div>
  );
}

// ─── SUPERVISOR CARD ─────────────────────────────────────────────────────────

function SupervisorCard({ sv, rank, idx, maxTx, onOpen }: {
  sv: SupervisorItem; rank: number; idx: number; maxTx: number; onOpen: () => void;
}) {
  const { user, todayStats, loading } = sv;
  const active = user.status === "ACTIVE";
  const pal    = palFor(user.nomComplet);
  const pct    = maxTx > 0 ? Math.round((todayStats?.txCount ?? 0) / maxTx * 100) : 0;
  const code   = user.codeClair ?? null;

  let rankEl = <span>#{rank}</span>, rankCls = "sp-rank-n";
  if (rank === 1) { rankEl = <span>🥇</span>; rankCls = "sp-rank-1"; }
  else if (rank === 2) { rankEl = <span>🥈</span>; rankCls = "sp-rank-2"; }
  else if (rank === 3) { rankEl = <span>🥉</span>; rankCls = "sp-rank-3"; }

  return (
    <div className="sp-card" style={{ animationDelay: `${idx * 0.06}s` }}>
      <div className={`sp-card-bar${active ? "" : " suspended"}`} />
      <div className="sp-card-body">
        <div className="sp-card-header">
          <div className={`sp-rank ${rankCls}`}>{rankEl}</div>
          <div className="sp-avatar" style={{ background: pal.bg, color: pal.text }}>{initials(user.nomComplet)}</div>
          <div className="sp-info">
            <div className="sp-name">{user.nomComplet}</div>
            <div className="sp-phone">📞 {user.telephone}</div>
            <div className={`sp-badge ${active ? "sp-badge-on" : "sp-badge-off"}`}>{active ? "Actif" : "Suspendu"}</div>
          </div>
          {loading ? <Sk w={48} h={48} r={50} /> : (
            <Donut size={48} segs={todayStats && (todayStats.debutTotal > 0 || todayStats.sortieTotal > 0)
              ? [{ color: "#1d4ed8", v: todayStats.debutTotal }, { color: "#60a5fa", v: todayStats.sortieTotal }]
              : []} />
          )}
        </div>

        <div className="sp-code-row">
          <span className="sp-code-row-lbl">🔑 Code</span>
          {loading
            ? <Sk w={88} h={26} r={8} />
            : code
              ? <CopyCodeBtn code={code} />
              : <span style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic" }}>Non disponible</span>
          }
        </div>

        <div className="sp-stats">
          <div className="sp-stat-box">
            <div className="sp-stat-val sp-stat-blue">{loading ? <Sk w={34} h={13} r={4} /> : (todayStats?.txCount ?? "—")}</div>
            <div className="sp-stat-lbl">Transactions</div>
          </div>
          <div className="sp-stat-sep" />
          <div className="sp-stat-box">
            <div className="sp-stat-val sp-stat-indigo">{loading ? <Sk w={54} h={13} r={4} /> : fmt(todayStats?.debutTotal ?? 0) + " F"}</div>
            <div className="sp-stat-lbl">Début</div>
          </div>
          <div className="sp-stat-sep" />
          <div className="sp-stat-box">
            <div className="sp-stat-val sp-stat-sky">{loading ? <Sk w={54} h={13} r={4} /> : fmt(todayStats?.sortieTotal ?? 0) + " F"}</div>
            <div className="sp-stat-lbl">Sortie</div>
          </div>
        </div>

        {!loading && todayStats && (
          <div className={`sp-gr-pill ${todayStats.grTotal >= 0 ? "sp-gr-pos" : "sp-gr-neg"}`}>
            <span>GR du jour</span><strong>{fmtSigned(todayStats.grTotal)}</strong>
          </div>
        )}
        {!loading && !todayStats && (
          <div className="sp-gr-pill sp-gr-neutral"><span style={{ margin: "0 auto" }}>{active ? "Aucune activité" : "Compte suspendu"}</span></div>
        )}

        <div className="sp-prog-wrap">
          <div className="sp-prog-meta"><span>Activité relative</span><strong>{pct}%</strong></div>
          <div className="sp-prog-track"><div className={`sp-prog-fill${active ? "" : " suspended"}`} style={{ width: loading ? "0%" : `${pct}%` }} /></div>
        </div>

        <div className="sp-card-foot">
          <span>🕐 {timeAgo(todayStats?.lastTx ?? user.createdAt)}</span>
          <span>Depuis {user.createdAt ? new Date(user.createdAt).toLocaleDateString("fr-FR", { month: "short", year: "numeric" }) : "—"}</span>
        </div>

        <button className="sp-btn-detail" onClick={onOpen}>Voir le détail →</button>
      </div>
    </div>
  );
}

// ─── ACTION POPOVER ───────────────────────────────────────────────────────────

type ActionMode = "edit" | "delete" | "reset";
interface ActiveAction { supervisorId: string; lineType: "debut" | "sortie"; accountKey: string; currentValue: number; mode: ActionMode; }

function ActionPopover({ action, onClose, onSuccess }: { action: ActiveAction; onClose: () => void; onSuccess: () => void }) {
  const [inputValue, setInputValue] = useState(String(action.currentValue));
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const isPartnerRow = action.accountKey.startsWith("part-");
  const displayLabel = isPartnerRow ? action.accountKey.replace("part-", "") : accountLabel(action.accountKey);
  const lineLabel    = action.lineType === "debut" ? "Début" : "Fin";
  const cfg = {
    edit:   { title: "Modifier",      accent: "#1d4ed8", light: "rgba(29,78,216,.08)",  textColor: "#1e3a8a", btnLabel: "Enregistrer",   icon: "✏️" },
    delete: { title: "Supprimer",     accent: "#ef4444", light: "rgba(239,68,68,.08)",  textColor: "#991b1b", btnLabel: "Supprimer",     icon: "🗑️" },
    reset:  { title: "Remettre à 0",  accent: "#f59e0b", light: "rgba(245,158,11,.08)", textColor: "#92400e", btnLabel: "Réinitialiser", icon: "↺"  },
  }[action.mode];

  const handleSubmit = async () => {
    setLoading(true); setError(null);
    try {
      const { default: ALS } = await import("@/services/accountLines.service") as any;
      if (action.mode === "delete")      await ALS.deleteAccountLine(action.supervisorId, action.lineType, action.accountKey);
      else if (action.mode === "reset")  await ALS.resetAccountLine(action.supervisorId, action.lineType, action.accountKey, 0);
      else {
        const val = parseFloat(inputValue);
        if (isNaN(val) || val < 0) { setError("Valeur invalide"); setLoading(false); return; }
        await ALS.updateAccountLine(action.supervisorId, action.lineType, action.accountKey, val);
      }
      onSuccess(); onClose();
    } catch (e: any) { setError(e?.response?.data?.message || "Erreur"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,.55)", backdropFilter: "blur(3px)" }} onClick={onClose} />
      <div style={{ position: "relative", background: "white", borderRadius: 18, width: "100%", maxWidth: 340, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,.18)", border: `1.5px solid ${cfg.accent}40` }}>
        <div style={{ background: cfg.light, borderBottom: `1px solid ${cfg.accent}25`, padding: "13px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ width: 30, height: 30, borderRadius: "50%", background: cfg.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>{cfg.icon}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: cfg.textColor }}>{cfg.title}</div>
              <div style={{ fontSize: 10, color: cfg.textColor, opacity: .75 }}>{accountIcon(action.accountKey)} {displayLabel} · {lineLabel}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 24, height: 24, borderRadius: "50%", border: "none", background: "rgba(0,0,0,.07)", cursor: "pointer", fontSize: 14 }}>×</button>
        </div>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", background: "#f8fafc", borderRadius: 9, padding: "8px 11px" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" as const }}>Valeur actuelle</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>{fmt(action.currentValue)} F</span>
          </div>
          {action.mode === "edit" && (
            <input type="number" min={0} value={inputValue} onChange={e => setInputValue(e.target.value)} autoFocus
              style={{ width: "100%", padding: "9px 10px", border: `1.5px solid ${cfg.accent}60`, borderRadius: 9, fontSize: 12, outline: "none", boxSizing: "border-box" as const }} />
          )}
          {action.mode !== "edit" && (
            <div style={{ padding: "9px 11px", borderRadius: 9, background: cfg.light, color: cfg.textColor, fontSize: 11 }}>
              ⚠️ {action.mode === "delete" ? "Cette ligne sera archivée." : "La valeur sera remise à 0."}
            </div>
          )}
          {error && <div style={{ fontSize: 11, color: "#9f1239", background: "#fee2e2", padding: "7px 11px", borderRadius: 7 }}>{error}</div>}
          <div style={{ display: "flex", gap: 7 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "white", fontSize: 12, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Annuler</button>
            <button onClick={handleSubmit} disabled={loading} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", background: cfg.accent, color: "white", fontSize: 12, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
              {loading ? "⏳" : "✓"} {cfg.btnLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PANEL DETAIL ─────────────────────────────────────────────────────────────

function PanelDetail({ sv, rank, onClose, onToggle, onRegen, actioning }: {
  sv: SupervisorItem; rank: number; onClose: () => void;
  onToggle: () => void; onRegen: () => void; actioning: string | null;
}) {
  const { user } = sv;
  const active   = user.status === "ACTIVE";
  const pal      = palFor(user.nomComplet);
  const code     = user.codeClair ?? null;

  const [dash, setDash]               = useState<DashboardData | null>(null);
  const [loadingDash, setLoadingDash] = useState(false);
  const [errDash, setErrDash]         = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<ActiveAction | null>(null);

  const loadDash = useCallback(async () => {
    setLoadingDash(true); setErrDash(null); setDash(null);
    try {
      const d = await TransactionService.getSupervisorDashboard(user.id, "today") as unknown as DashboardData;
      setDash(d);
    } catch (e: any) { setErrDash(e?.response?.data?.message ?? e?.message ?? "Erreur"); }
    finally { setLoadingDash(false); }
  }, [user.id]);

  useEffect(() => { if (active) loadDash(); }, [loadDash, active]);

  const allRows = useMemo(() => {
    if (!dash) return [];
    const keys = new Set([...Object.keys(dash.comptes?.debut ?? {}), ...Object.keys(dash.comptes?.sortie ?? {})]);
    return Array.from(keys)
      .map(k => ({ key: k, debut: dash.comptes?.debut[k] ?? 0, sortie: dash.comptes?.sortie[k] ?? 0 }))
      .filter(r => r.debut > 0 || r.sortie > 0)
      .sort((a, b) => (isPartnerKey(a.key) ? 1 : 0) - (isPartnerKey(b.key) ? 1 : 0) || (b.debut + b.sortie) - (a.debut + a.sortie));
  }, [dash]);

  const isSusp = actioning === user.id;
  const isReg  = actioning === user.id + "_c";
  const grPos  = (dash?.totaux?.grTotal ?? 0) >= 0;

  let rankEl = <span>#{rank}</span>, rankCls = "sp-rank-n";
  if (rank === 1) { rankEl = <span>🥇</span>; rankCls = "sp-rank-1"; }
  else if (rank === 2) { rankEl = <span>🥈</span>; rankCls = "sp-rank-2"; }
  else if (rank === 3) { rankEl = <span>🥉</span>; rankCls = "sp-rank-3"; }

  const openAction = (lineType: "debut" | "sortie", key: string, val: number, mode: ActionMode) =>
    setActiveAction({ supervisorId: user.id, lineType, accountKey: key, currentValue: val, mode });

  const ActionBtns = ({ lineType, rowKey, montant }: { lineType: "debut" | "sortie"; rowKey: string; montant: number }) => (
    <div className="sp-row-actions">
      <button className="sp-ra-btn sp-ra-edit"   onClick={e => { e.stopPropagation(); openAction(lineType, rowKey, montant, "edit");   }}>✏️</button>
      <button className="sp-ra-btn sp-ra-reset"  onClick={e => { e.stopPropagation(); openAction(lineType, rowKey, montant, "reset");  }}>↺</button>
      <button className="sp-ra-btn sp-ra-delete" onClick={e => { e.stopPropagation(); openAction(lineType, rowKey, montant, "delete"); }}>🗑️</button>
    </div>
  );

  return (
    <>
      {activeAction && <ActionPopover action={activeAction} onClose={() => setActiveAction(null)} onSuccess={() => { setActiveAction(null); loadDash(); }} />}

      <div className="sp-ph">
        <button className="sp-ph-close" onClick={onClose}>×</button>
        <div className="sp-ph-av-row">
          <div className="sp-ph-av" style={{ background: pal.bg, color: pal.text }}>{initials(user.nomComplet)}</div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <div className="sp-ph-name">{user.nomComplet}</div>
              <div className={`sp-rank ${rankCls}`} style={{ flexShrink: 0 }}>{rankEl}</div>
            </div>
            <div className="sp-ph-phone">📞 {user.telephone}</div>
            <div className="sp-ph-since">Membre depuis {user.createdAt ? new Date(user.createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "—"}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" as const }}>
          <div className={`sp-badge${active ? " sp-badge-on" : " sp-badge-off"}`} style={{ display: "inline-flex" }}>{active ? "Compte actif" : "Compte suspendu"}</div>
          {code ? (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.18)", border: "1px solid rgba(255,255,255,.28)", borderRadius: 9, padding: "4px 10px" }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,.7)", fontWeight: 600 }}>Code :</span>
              <span style={{ fontSize: 14, color: "white", fontWeight: 800, fontFamily: "monospace", letterSpacing: ".1em" }}>{code}</span>
              <button onClick={async () => { try { await navigator.clipboard.writeText(code); } catch {} }}
                style={{ background: "rgba(255,255,255,.22)", border: "none", borderRadius: 6, padding: "2px 7px", color: "white", fontSize: 10, cursor: "pointer", fontWeight: 700 }}>
                📋
              </button>
            </div>
          ) : (
            <span style={{ fontSize: 11, color: "rgba(255,255,255,.45)", fontStyle: "italic" }}>Code non disponible</span>
          )}
        </div>
      </div>

      <div className="sp-pb">
        {!active && (
          <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 11, padding: "12px 14px", fontSize: 13, color: "#9f1239", fontWeight: 600 }}>
            ⏸ Ce compte est suspendu. Activez-le pour voir les données.
          </div>
        )}

        {active && (
          <div>
            <div className="sp-sect-title">Période</div>
            <div className="sp-period-badge">📅 Aujourd'hui</div>
          </div>
        )}

        {loadingDash && <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{[1,2,3].map(i => <Sk key={i} h={40} r={9} />)}</div>}

        {errDash && !loadingDash && (
          <div className="sp-err" style={{ margin: 0 }}>⚠️ {errDash}<button onClick={loadDash} className="sp-err-retry">Réessayer</button></div>
        )}

        {active && !loadingDash && dash && (
          <>
            <div className="sp-at-wrap">
              <div className="sp-at-heads">
                <div className="sp-at-head sp-at-green"><span className="sp-at-dot sp-green-dot" />Début journée</div>
                <div className="sp-at-head sp-at-blue"><span className="sp-at-dot sp-blue-dot" />Fin journée</div>
              </div>
              <div className="sp-at-subheads">
                <div className="sp-at-subhead"><span>Type / Partenaire</span><span>Montant</span></div>
                <div className="sp-at-subhead"><span>Type / Partenaire</span><span>Montant</span></div>
              </div>
              {allRows.length === 0
                ? <div className="sp-empty">📭 Aucune donnée pour aujourd'hui</div>
                : allRows.map(r => (
                  <div key={r.key} className="sp-at-row">
                    <div className="sp-at-cell sp-at-cell-green">
                      {r.debut > 0 ? (<>
                        <div className="sp-at-cell-l"><span className="sp-at-ico">{accountIcon(r.key)}</span><span className="sp-at-name">{accountLabel(r.key)}</span></div>
                        <div className="sp-at-cell-r"><span className="sp-at-amt">{fmt(r.debut)} F</span><ActionBtns lineType="debut" rowKey={r.key} montant={r.debut} /></div>
                      </>) : <span />}
                    </div>
                    <div className="sp-at-cell sp-at-cell-blue">
                      {r.sortie > 0 ? (<>
                        <div className="sp-at-cell-l"><span className="sp-at-ico">{accountIcon(r.key)}</span><span className="sp-at-name">{accountLabel(r.key)}</span></div>
                        <div className="sp-at-cell-r"><span className="sp-at-amt">{fmt(r.sortie)} F</span><ActionBtns lineType="sortie" rowKey={r.key} montant={r.sortie} /></div>
                      </>) : <span />}
                    </div>
                  </div>
                ))}
              <div className="sp-at-footer">
                <div className="sp-at-foot" style={{ background: "rgba(29,78,216,.05)" }}>
                  <div className="sp-at-foot-lbl" style={{ color: "#1d4ed8" }}>Début</div>
                  <div className="sp-at-foot-val" style={{ color: "#1e3a8a" }}>{fmt(dash.totaux?.debutTotal ?? 0)} F</div>
                </div>
                <div className="sp-at-foot" style={{ background: grPos ? "#1d4ed8" : "#e11d48" }}>
                  <div className="sp-at-foot-lbl" style={{ color: "rgba(255,255,255,.8)" }}>GR Total</div>
                  <div className="sp-at-foot-val" style={{ color: "white" }}>{fmtSigned(dash.totaux?.grTotal ?? 0)}</div>
                </div>
                <div className="sp-at-foot" style={{ background: "rgba(59,130,246,.05)" }}>
                  <div className="sp-at-foot-lbl" style={{ color: "#2563eb" }}>Fin</div>
                  <div className="sp-at-foot-val" style={{ color: "#1e40af" }}>{fmt(dash.totaux?.sortieTotal ?? 0)} F</div>
                </div>
              </div>
            </div>

            {(dash.recentTransactions?.length ?? 0) > 0 && (
              <div>
                <div className="sp-sect-title">Transactions récentes</div>
                <div className="sp-tx-list">
                  {dash.recentTransactions.slice(0, 8).map(tx => {
                    const isPos = ["DEPOT", "DEBUT_JOURNEE", "TRANSFERT_RECU"].includes(tx.type);
                    return (
                      <div className="sp-tx-row" key={tx.id}>
                        <div className="sp-tx-left">
                          <div className={`sp-tx-dot ${isPos ? "sp-tx-pos" : "sp-tx-neg"}`} />
                          <div>
                            <div className="sp-tx-desc">{tx.description || tx.type}</div>
                            <div className="sp-tx-who">{tx.personne} · {timeAgo(tx.createdAt)}</div>
                          </div>
                        </div>
                        <div className={`sp-tx-amt ${isPos ? "sp-tx-pos" : "sp-tx-neg"}`}>{isPos ? "+" : "-"}{fmt(tx.montant)} F</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        <div className="sp-act-row">
          <button className={`sp-act-btn ${active ? "sp-act-susp" : "sp-act-activ"}`} onClick={onToggle} disabled={isSusp}>
            {isSusp ? "⏳ En cours…" : active ? "⏸ Suspendre" : "▶ Activer"}
          </button>
          <button className="sp-act-btn sp-act-code" onClick={onRegen} disabled={isReg}>
            {isReg ? "⏳ Génération…" : "🔑 Réinitialiser code"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
@keyframes skpulse { 0%,100%{opacity:1} 50%{opacity:.4} }
@keyframes spFadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
* { box-sizing: border-box; }

/* HERO */
.sp-hero {
  background: linear-gradient(135deg,#1e3a8a,#1d4ed8,#2563eb);
  padding: 20px 16px 18px; position: relative; overflow: hidden;
}
@media (min-width:640px) { .sp-hero { padding: 24px 32px 20px; } }
.sp-hero-deco { position:absolute; top:-60px; right:-40px; width:190px; height:190px; border-radius:50%; background:rgba(255,255,255,.06); pointer-events:none; }

.sp-hero-row {
  display: flex; align-items: flex-start; flex-wrap: wrap;
  gap: 12px; justify-content: space-between;
}
.sp-hero-left { display:flex; align-items:flex-start; gap:10px; min-width:0; }

.sp-eyebrow { font-size:10px; font-weight:700; color:rgba(255,255,255,.55); text-transform:uppercase; letter-spacing:.1em; margin-bottom:2px; }
.sp-title   { font-size:clamp(18px,4vw,22px); font-weight:800; color:white; letter-spacing:-.02em; line-height:1.1; margin-bottom:2px; }
.sp-sub     { font-size:11px; color:rgba(255,255,255,.6); }

.sp-kpis  { display:flex; gap:6px; flex-wrap:wrap; }
.sp-kpill { background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.18); backdrop-filter:blur(8px); border-radius:11px; padding:7px 10px; text-align:center; min-width:64px; }
.sp-kpill-ico { font-size:11px; margin-bottom:2px; }
.sp-kpill-val { font-size:14px; font-weight:800; color:white; line-height:1; }
.sp-kpill-lbl { font-size:8px; color:rgba(255,255,255,.6); font-weight:600; text-transform:uppercase; letter-spacing:.04em; margin-top:2px; white-space:nowrap; }

.sp-btn-new {
  background:white; color:#1d4ed8; border:none; border-radius:10px;
  padding:8px 14px; font-weight:700; font-size:12px; cursor:pointer;
  box-shadow:0 4px 14px rgba(0,0,0,.14); white-space:nowrap; transition:all .2s; flex-shrink:0; align-self:flex-start;
}
.sp-btn-new:hover { transform:translateY(-1px); box-shadow:0 7px 22px rgba(0,0,0,.18); }

/* BODY */
.sp-body { padding: 14px 12px; }
@media (min-width:640px) { .sp-body { padding: 16px 24px; } }
@media (min-width:1024px) { .sp-body { padding: 18px 32px; } }

/* TABS */
.sp-tabs-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; flex-wrap:wrap; gap:8px; }
.sp-tabs     { display:flex; background:white; border:1px solid #e2e8f0; border-radius:10px; padding:3px; gap:2px; }
.sp-tab      { border:none; background:transparent; border-radius:7px; padding:5px 10px; font-weight:600; font-size:11px; color:#64748b; cursor:pointer; transition:all .14s; white-space:nowrap; }
.sp-tab.on   { background:#1d4ed8; color:white; box-shadow:0 2px 7px rgba(29,78,216,.28); }
.sp-sort-hint { font-size:10px; color:#94a3b8; }
@media (max-width:480px) { .sp-sort-hint { display:none; } }

/* ERROR */
.sp-err       { background:#fee2e2; border:1px solid #fca5a5; border-radius:10px; padding:9px 13px; color:#9f1239; font-size:12px; font-weight:600; margin-bottom:14px; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.sp-err-retry { background:none; border:none; color:#9f1239; font-weight:800; cursor:pointer; text-decoration:underline; }

/* GRID */
.sp-grid  { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:12px; }
@media (max-width:480px) { .sp-grid { grid-template-columns:1fr; } }

/* CARD */
.sp-card { background:white; border-radius:15px; border:1px solid #edf0f4; box-shadow:0 2px 8px rgba(0,0,0,.04); overflow:hidden; animation:spFadeUp .5s ease both; transition:all .2s; }
.sp-card:hover { transform:translateY(-2px); box-shadow:0 9px 28px rgba(0,0,0,.08); border-color:#93c5fd; }
.sp-card-bar { height:3px; background:linear-gradient(90deg,#1d4ed8,#60a5fa); }
.sp-card-bar.suspended { background:linear-gradient(90deg,#e2e8f0,#cbd5e1); }
.sp-card-body { padding:13px; }

.sp-card-header { display:flex; align-items:flex-start; gap:7px; margin-bottom:9px; }
.sp-rank   { width:21px; height:21px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:800; flex-shrink:0; margin-top:2px; }
.sp-rank-1 { background:linear-gradient(135deg,#fbbf24,#d97706); color:white; }
.sp-rank-2 { background:linear-gradient(135deg,#cbd5e1,#94a3b8); color:white; }
.sp-rank-3 { background:linear-gradient(135deg,#d97706,#92400e); color:white; }
.sp-rank-n { background:#f1f5f9; color:#64748b; }
.sp-avatar { width:40px; height:40px; border-radius:11px; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:800; flex-shrink:0; }
.sp-info   { flex:1; min-width:0; }
.sp-name   { font-weight:700; font-size:12px; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:2px; }
.sp-phone  { font-size:10px; color:#64748b; }
.sp-badge  { display:inline-flex; align-items:center; gap:3px; font-size:9px; font-weight:700; text-transform:uppercase; padding:2px 6px; border-radius:99px; margin-top:3px; }
.sp-badge::before { content:''; width:4px; height:4px; border-radius:50%; background:currentColor; }
.sp-badge-on  { background:#dbeafe; color:#1d4ed8; }
.sp-badge-off { background:#fee2e2; color:#9f1239; }

.sp-code-row     { display:flex; align-items:center; gap:7px; margin-bottom:9px; padding:6px 9px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0; }
.sp-code-row-lbl { font-size:10px; font-weight:700; color:#64748b; white-space:nowrap; }

.sp-stats    { display:flex; align-items:center; background:#f8fafc; border-radius:10px; padding:8px; margin-bottom:8px; }
.sp-stat-box { flex:1; text-align:center; }
.sp-stat-sep { width:1px; height:24px; background:#e2e8f0; flex-shrink:0; margin:0 2px; }
.sp-stat-val    { font-size:12px; font-weight:800; line-height:1; margin-bottom:2px; }
.sp-stat-lbl    { font-size:8px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.04em; }
.sp-stat-blue   { color:#1d4ed8; }
.sp-stat-indigo { color:#4338ca; font-size:11px; }
.sp-stat-sky    { color:#0284c7; font-size:11px; }

.sp-gr-pill     { display:flex; justify-content:space-between; align-items:center; border-radius:7px; padding:5px 9px; margin-bottom:8px; font-size:10px; }
.sp-gr-pos      { background:#eff6ff; border:1px solid #bfdbfe; color:#1d4ed8; }
.sp-gr-neg      { background:#fff1f2; border:1px solid #fecdd3; color:#be123c; }
.sp-gr-neutral  { background:#f8fafc; border:1px solid #e2e8f0; color:#94a3b8; }
.sp-gr-pill strong { font-weight:800; font-size:11px; }

.sp-prog-wrap { margin-bottom:8px; }
.sp-prog-meta { display:flex; justify-content:space-between; margin-bottom:3px; }
.sp-prog-meta span   { font-size:9px; color:#64748b; font-weight:600; }
.sp-prog-meta strong { font-size:9px; color:#1d4ed8; font-weight:800; }
.sp-prog-track { height:4px; background:#f1f5f9; border-radius:99px; overflow:hidden; }
.sp-prog-fill  { height:100%; background:linear-gradient(90deg,#1d4ed8,#60a5fa); border-radius:99px; transition:width 1s cubic-bezier(.4,0,.2,1); }
.sp-prog-fill.suspended { background:linear-gradient(90deg,#cbd5e1,#94a3b8); }

.sp-card-foot  { display:flex; justify-content:space-between; margin-bottom:9px; font-size:9px; color:#94a3b8; }
.sp-btn-detail { width:100%; padding:8px; border:none; border-radius:9px; font-weight:700; font-size:12px; cursor:pointer; background:linear-gradient(135deg,#1e3a8a,#1d4ed8); color:white; box-shadow:0 3px 9px rgba(29,78,216,.26); transition:all .16s; }
.sp-btn-detail:hover { transform:translateY(-1px); box-shadow:0 5px 14px rgba(29,78,216,.36); }

/* PANEL */
.sp-overlay { position:fixed; inset:0; background:rgba(15,23,42,.4); backdrop-filter:blur(4px); z-index:100; opacity:0; pointer-events:none; transition:opacity .3s; }
.sp-overlay.on { opacity:1; pointer-events:auto; }
.sp-panel   { position:fixed; top:0; right:0; bottom:0; width:min(490px,100%); background:white; z-index:101; box-shadow:-10px 0 48px rgba(0,0,0,.11); overflow-y:auto; transform:translateX(110%); transition:transform .3s cubic-bezier(.4,0,.2,1); }
.sp-panel.open { transform:none; }
.sp-panel::-webkit-scrollbar { width:3px; }
.sp-panel::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:99px; }

.sp-ph { background:linear-gradient(135deg,#1e3a8a,#1d4ed8,#2563eb); padding:20px 16px 16px; position:relative; overflow:hidden; }
.sp-ph::before { content:''; position:absolute; top:-50px; right:-50px; width:160px; height:160px; border-radius:50%; background:rgba(255,255,255,.07); pointer-events:none; }
.sp-ph-close  { position:absolute; top:12px; right:12px; width:27px; height:27px; border-radius:50%; background:rgba(255,255,255,.18); border:none; color:white; font-size:15px; cursor:pointer; display:flex; align-items:center; justify-content:center; }
.sp-ph-close:hover { background:rgba(255,255,255,.28); }
.sp-ph-av-row { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
.sp-ph-av     { width:50px; height:50px; border-radius:15px; display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:800; border:3px solid rgba(255,255,255,.26); flex-shrink:0; }
.sp-ph-name   { font-size:15px; font-weight:800; color:white; }
.sp-ph-phone  { font-size:11px; color:rgba(255,255,255,.65); margin-top:2px; }
.sp-ph-since  { font-size:10px; color:rgba(255,255,255,.5); margin-top:1px; }

.sp-pb { padding:15px 16px; display:flex; flex-direction:column; gap:14px; }
.sp-sect-title   { font-size:9px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:.08em; margin-bottom:7px; }
.sp-period-badge { display:inline-flex; align-items:center; gap:5px; background:#dbeafe; border:1.5px solid #bfdbfe; color:#1d4ed8; border-radius:8px; padding:5px 12px; font-size:11px; font-weight:700; }

/* TABLE */
.sp-at-wrap     { border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; }
.sp-at-heads    { display:grid; grid-template-columns:1fr 1fr; }
.sp-at-head     { display:flex; align-items:center; gap:5px; padding:7px 10px; font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; }
.sp-at-green    { background:rgba(29,78,216,.05); color:#1d4ed8; border-right:1px solid #e2e8f0; border-bottom:2px solid #1d4ed8; }
.sp-at-blue     { background:rgba(59,130,246,.05); color:#2563eb; border-bottom:2px solid #60a5fa; }
.sp-at-dot      { width:6px; height:6px; border-radius:2px; flex-shrink:0; }
.sp-green-dot   { background:#1d4ed8; }
.sp-blue-dot    { background:#60a5fa; }
.sp-at-subheads { display:grid; grid-template-columns:1fr 1fr; background:#f8fafc; border-bottom:1px solid #e2e8f0; }
.sp-at-subhead  { display:flex; justify-content:space-between; padding:4px 10px; font-size:8px; font-weight:700; color:#94a3b8; text-transform:uppercase; }
.sp-at-subhead:first-child { border-right:1px solid #e2e8f0; }
.sp-at-row      { display:grid; grid-template-columns:1fr 1fr; border-bottom:1px solid #f1f5f9; }
.sp-at-row:last-of-type { border-bottom:none; }
.sp-at-cell     { display:flex; align-items:center; justify-content:space-between; padding:7px 10px; min-height:36px; transition:background .1s; gap:4px; }
.sp-at-cell-green { border-right:1px solid #f1f5f9; }
.sp-at-cell-green:hover { background:rgba(29,78,216,.03); }
.sp-at-cell-blue:hover  { background:rgba(59,130,246,.03); }
.sp-at-cell-l   { display:flex; align-items:center; gap:5px; min-width:0; flex:1; }
.sp-at-cell-r   { display:flex; align-items:center; gap:2px; flex-shrink:0; }
.sp-at-ico      { font-size:11px; flex-shrink:0; }
.sp-at-name     { font-size:10px; font-weight:600; color:#334155; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sp-at-amt      { font-size:10px; font-weight:700; color:#0f172a; white-space:nowrap; }
.sp-row-actions { display:flex; align-items:center; gap:1px; opacity:0; transition:opacity .14s; }
.sp-at-cell:hover .sp-row-actions { opacity:1; }
.sp-ra-btn      { width:19px; height:19px; border:none; border-radius:5px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:9px; background:transparent; transition:all .1s; }
.sp-ra-edit:hover   { background:#dbeafe; }
.sp-ra-reset:hover  { background:#fef3c7; }
.sp-ra-delete:hover { background:#fee2e2; }
.sp-at-footer  { display:grid; grid-template-columns:1fr auto 1fr; border-top:2px solid #e2e8f0; }
.sp-at-foot    { padding:9px 10px; text-align:center; }
.sp-at-foot:first-child { border-right:1px solid #e2e8f0; }
.sp-at-foot:last-child  { border-left:1px solid #e2e8f0; }
.sp-at-foot-lbl { font-size:8px; font-weight:800; text-transform:uppercase; letter-spacing:.05em; margin-bottom:2px; }
.sp-at-foot-val { font-size:13px; font-weight:900; }

/* TX LIST */
.sp-tx-list { display:flex; flex-direction:column; gap:1px; }
.sp-tx-row  { display:flex; align-items:center; justify-content:space-between; padding:6px 8px; border-radius:7px; transition:background .1s; }
.sp-tx-row:hover { background:#f8fafc; }
.sp-tx-left { display:flex; align-items:center; gap:7px; flex:1; min-width:0; }
.sp-tx-dot  { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
.sp-tx-pos  { color:#1d4ed8; } .sp-tx-pos.sp-tx-dot { background:#1d4ed8; }
.sp-tx-neg  { color:#e11d48; } .sp-tx-neg.sp-tx-dot { background:#e11d48; }
.sp-tx-desc { font-size:11px; font-weight:600; color:#334155; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:160px; }
.sp-tx-who  { font-size:9px; color:#94a3b8; margin-top:1px; }
.sp-tx-amt  { font-size:11px; font-weight:800; flex-shrink:0; margin-left:5px; }

.sp-empty { text-align:center; padding:22px; color:#94a3b8; font-size:12px; font-weight:600; grid-column:1/-1; }

/* ACTIONS */
.sp-act-row  { display:flex; gap:7px; }
.sp-act-btn  { flex:1; padding:10px; border-radius:10px; border:none; font-weight:700; font-size:12px; cursor:pointer; transition:all .14s; display:flex; align-items:center; justify-content:center; gap:4px; }
.sp-act-btn:disabled { opacity:.6; cursor:not-allowed; }
.sp-act-susp  { background:#fee2e2; color:#9f1239; }
.sp-act-activ { background:#dbeafe; color:#1e3a8a; }
.sp-act-code  { background:linear-gradient(135deg,#1e3a8a,#1d4ed8); color:white; box-shadow:0 3px 11px rgba(29,78,216,.26); }

/* MODALS */
.sp-modal-bg { position:fixed; inset:0; background:rgba(15,23,42,.5); backdrop-filter:blur(6px); z-index:200; display:flex; align-items:center; justify-content:center; padding:14px; }
.sp-modal    { background:white; border-radius:18px; width:100%; max-width:390px; overflow:hidden; box-shadow:0 26px 72px rgba(0,0,0,.2); }
.sp-modal-head { background:linear-gradient(135deg,#1e3a8a,#1d4ed8,#2563eb); padding:18px; position:relative; overflow:hidden; }
.sp-modal-head::after { content:''; position:absolute; top:-38px; right:-38px; width:115px; height:115px; border-radius:50%; background:rgba(255,255,255,.07); pointer-events:none; }
.sp-modal-x   { position:absolute; top:12px; right:12px; width:26px; height:26px; border-radius:50%; background:rgba(255,255,255,.18); border:none; color:white; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:1; }
.sp-modal-ico { width:38px; height:38px; border-radius:11px; background:rgba(255,255,255,.2); display:flex; align-items:center; justify-content:center; font-size:16px; margin-bottom:8px; }
.sp-modal-head h2 { color:white; font-size:15px; font-weight:800; }
.sp-modal-head p  { color:rgba(255,255,255,.65); font-size:11px; margin-top:2px; }
.sp-modal-body { padding:18px; display:flex; flex-direction:column; gap:10px; }

.sp-field label { display:block; font-size:9px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:.06em; margin-bottom:3px; }
.sp-finput { position:relative; }
.sp-ficon  { position:absolute; left:9px; top:50%; transform:translateY(-50%); font-size:12px; }
.sp-modal-body input { width:100%; padding:8px 9px 8px 30px; border:1.5px solid #e2e8f0; border-radius:9px; font-size:12px; color:#0f172a; background:#f8fafc; outline:none; transition:border .14s; box-sizing:border-box; }
.sp-modal-body input:focus { border-color:#1d4ed8; background:white; }
.sp-notice { background:#fef3c7; border:1px solid #fde68a; border-radius:9px; padding:9px 11px; display:flex; gap:7px; }
.sp-notice span { font-size:13px; flex-shrink:0; }
.sp-notice p    { font-size:11px; color:#92400e; line-height:1.4; }
.sp-modal-btns { display:flex; gap:7px; }
.sp-btn-cancel { flex:1; padding:9px; border-radius:9px; border:none; background:#f1f5f9; color:#64748b; font-weight:700; font-size:12px; cursor:pointer; }
.sp-btn-ok     { flex:2; padding:9px; border-radius:9px; border:none; background:linear-gradient(135deg,#1e3a8a,#1d4ed8); color:white; font-weight:700; font-size:12px; cursor:pointer; box-shadow:0 3px 11px rgba(29,78,216,.28); }
.sp-btn-ok:disabled { opacity:.6; cursor:not-allowed; }

.sp-code-box  { background:#eff6ff; border:2px solid rgba(29,78,216,.2); border-radius:11px; padding:15px; text-align:center; }
.sp-code-lbl  { font-size:9px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:.08em; margin-bottom:7px; }
.sp-code-val  { font-size:30px; font-weight:800; color:#1d4ed8; letter-spacing:.2em; font-family:monospace; margin-bottom:9px; }
.sp-code-warn { font-size:10px; color:#d97706; font-weight:600; }
.sp-btn-copy  { width:100%; padding:8px; border-radius:9px; border:1.5px solid #bfdbfe; background:#eff6ff; color:#1d4ed8; font-weight:700; font-size:12px; cursor:pointer; margin-bottom:4px; }
.sp-btn-copy:hover { background:#dbeafe; }

/* TOAST */
.sp-toast     { position:fixed; bottom:16px; right:16px; z-index:999; background:#1d4ed8; color:white; border-radius:10px; padding:10px 14px; font-size:12px; font-weight:600; box-shadow:0 7px 24px rgba(29,78,216,.38); transform:translateY(60px); opacity:0; transition:all .38s cubic-bezier(.4,0,.2,1); }
.sp-toast.show { transform:none; opacity:1; }
.sp-toast-err  { background:#9f1239; box-shadow:0 7px 24px rgba(159,18,57,.38); }
@media (max-width:480px) { .sp-toast { bottom:8px; right:8px; left:8px; text-align:center; } }
`;