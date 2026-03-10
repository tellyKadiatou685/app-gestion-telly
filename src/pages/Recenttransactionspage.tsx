// src/pages/RecentTransactionsPage.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardSidebar from '@/components/DashboardSidebar';
import RecentTransactionService from '@/services/RecentTransactionService';
import { Menu } from 'lucide-react';
import type {
  RecentTransaction,
  TransactionStats,
  PaginationInfo,
  TransactionFilters,
  Period,
  TransactionType,
  AccountType,
} from '@/types/recentTransaction.types';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today',     label: "Aujourd'hui" },
  { key: 'yesterday', label: 'Hier'        },
  { key: 'week',      label: 'Semaine'     },
  { key: 'month',     label: 'Mois'        },
  { key: 'year',      label: 'Année'       },
  { key: 'all',       label: 'Tout'        },
];

const TX_TYPES: { key: TransactionType | ''; label: string; icon: string; color: string }[] = [
  { key: '',                     label: 'Tous',          icon: '📋', color: '#64748b' },
  { key: 'DEPOT',                label: 'Dépôts',        icon: '↓',  color: '#10b981' },
  { key: 'RETRAIT',              label: 'Retraits',      icon: '↑',  color: '#f59e0b' },
  { key: 'TRANSFERT_ENVOYE',     label: 'Transferts',    icon: '→',  color: '#3b82f6' },
  { key: 'ALLOCATION_UV_MASTER', label: 'Allocations',   icon: '⭐', color: '#8b5cf6' },
  { key: 'DEBUT_JOURNEE',        label: 'Début journée', icon: '🌅', color: '#0d9488' },
  { key: 'FIN_JOURNEE',          label: 'Fin journée',   icon: '🌇', color: '#475569' },
];

const ACCOUNT_META: Record<string, { color: string; icon: string; short: string }> = {
  LIQUIDE:       { color: '#10b981', icon: '💵', short: 'LIQ' },
  WAVE:          { color: '#3b82f6', icon: '🌊', short: 'WAV' },
  ORANGE_MONEY:  { color: '#f97316', icon: '🟠', short: 'OM'  },
  UV_MASTER:     { color: '#8b5cf6', icon: '💎', short: 'UVM' },
  FREE_MONEY:    { color: '#ec4899', icon: '💳', short: 'FM'  },
  WESTERN_UNION: { color: '#eab308', icon: '🏦', short: 'WU'  },
  RIA:           { color: '#06b6d4', icon: '💱', short: 'RIA' },
  MONEYGRAM:     { color: '#f43f5e', icon: '💸', short: 'MG'  },
  AUTRES:        { color: '#64748b', icon: '📦', short: 'AUT' },
};

const TYPE_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  success:   { bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
  warning:   { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  info:      { bg: '#eff6ff', text: '#1d4ed8', border: '#93c5fd' },
  primary:   { bg: '#faf5ff', text: '#7c3aed', border: '#c4b5fd' },
  secondary: { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
  default:   { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function fmt(n: number) { return Math.abs(n).toLocaleString('fr-FR'); }
function getAcctMeta(key: string) { return ACCOUNT_META[key] ?? { color: '#64748b', icon: '💳', short: key?.slice(0, 3) ?? '?' }; }
function initials(name: string) { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }

const AVATAR_PALETTES = [
  { bg: '#dbeafe', text: '#1e40af' },
  { bg: '#d1fae5', text: '#065f46' },
  { bg: '#ede9fe', text: '#5b21b6' },
  { bg: '#fce7f3', text: '#9d174d' },
  { bg: '#fef3c7', text: '#92400e' },
  { bg: '#f0fdfa', text: '#0f766e' },
  { bg: '#fee2e2', text: '#991b1b' },
];
function avatarColor(name: string) {
  let h = 0; for (const c of name) h = name.charCodeAt(0) + ((h << 5) - h);
  return AVATAR_PALETTES[Math.abs(h) % AVATAR_PALETTES.length];
}

function groupByDate(transactions: RecentTransaction[]): { date: string; items: RecentTransaction[] }[] {
  const map = new Map<string, RecentTransaction[]>();
  for (const tx of transactions) {
    const d = new Date(tx.dateHeure);
    const key = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(tx);
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color, bg }: {
  icon: string; label: string; value: string | number;
  sub?: string; color: string; bg: string;
}) {
  return (
    <div className="stat-card" style={{ background: bg, borderColor: color + '33' }}>
      <div className="stat-icon" style={{ background: color + '18', color }}>{icon}</div>
      <div className="stat-text">
        <div className="stat-val" style={{ color }}>{value}</div>
        <div className="stat-lbl">{label}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

function TxTypeBadge({ label, colorKey }: { label: string; colorKey: string }) {
  const s = TYPE_STYLE[colorKey] ?? TYPE_STYLE.default;
  return (
    <span className="tx-badge" style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
      {label}
    </span>
  );
}

function AccountChip({ compte }: { compte: string }) {
  const meta = getAcctMeta(compte);
  return (
    <span className="acct-chip" style={{ background: meta.color + '15', color: meta.color, border: `1px solid ${meta.color}30` }}>
      <span>{meta.icon}</span>
      <span>{meta.short}</span>
    </span>
  );
}

function MiniAvatar({ name, size = 32 }: { name: string; size?: number }) {
  const c = avatarColor(name);
  return (
    <div className="mini-avatar" style={{ width: size, height: size, minWidth: size, background: c.bg, color: c.text, borderRadius: size * 0.35, fontSize: size * 0.35 }}>
      {initials(name)}
    </div>
  );
}

// ─── TRANSACTION ROW ──────────────────────────────────────────────────────────

function TxRow({ tx, onClick }: { tx: RecentTransaction; onClick: () => void }) {
  const isCredit = tx.type.color === 'success';
  const isMuted  = ['DEBUT_JOURNEE', 'FIN_JOURNEE'].includes(tx.type.key);
  const interv   = tx.intervenant;

  return (
    <div className="tx-row" onClick={onClick}>
      {/* Timeline dot */}
      <div className="tx-timeline-dot" style={{
        background: isMuted ? '#e2e8f0' : (isCredit ? '#10b981' : '#f59e0b'),
        boxShadow:  isMuted ? 'none' : `0 0 0 3px ${isCredit ? '#d1fae5' : '#fef3c7'}`,
      }} />

      {/* Avatar — caché sur très petit écran */}
      <div className="tx-avatar-wrap">
        <MiniAvatar name={interv?.nom ?? '?'} size={36} />
      </div>

      {/* Info */}
      <div className="tx-info">
        <div className="tx-name-row">
          <span className="tx-who">{interv?.nom ?? '—'}</span>
          <span className="tx-role-pill" style={{
            background: interv?.role === 'SUPERVISEUR' ? '#f0fdfa' : '#f5f3ff',
            color:      interv?.role === 'SUPERVISEUR' ? '#0f766e' : '#7c3aed',
          }}>
            {interv?.role ?? ''}
          </span>
          {tx.partenaire && (
            <span className="tx-partner-tag">
              🤝 {(tx.partenaire as any)?.nom ?? (tx.partenaire as any)?.nomComplet ?? ''}
            </span>
          )}
        </div>
        <div className="tx-meta-row">
          <TxTypeBadge label={tx.type.label} colorKey={tx.type.color} />
          <AccountChip compte={tx.compte} />
          {tx.description && (
            <span className="tx-desc" title={tx.description}>
              {tx.description.slice(0, 35)}{tx.description.length > 35 ? '…' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Montant + heure */}
      <div className="tx-right">
        {!isMuted && (
          <div className="tx-montant" style={{ color: isCredit ? '#10b981' : '#f59e0b' }}>
            <span className="tx-signe">{tx.montant.signe}</span>
            {fmt(tx.montant.valeur)}
            <span className="tx-devise"> F</span>
          </div>
        )}
        <div className="tx-time">{tx.timeAgo}</div>
        <div className="tx-hour">
          {new Date(tx.dateHeure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

// ─── TRANSACTION DETAIL MODAL ─────────────────────────────────────────────────

function TxDetailModal({ tx, onClose }: { tx: RecentTransaction; onClose: () => void }) {
  const isCredit = tx.type.color === 'success';
  const interv   = tx.intervenant;
  const supNom   = typeof tx.superviseur === 'object' && 'nom' in tx.superviseur
    ? tx.superviseur.nom : String(tx.superviseur ?? '—');
  const acct = getAcctMeta(tx.compte);

  return (
    <div className="modal-overlay visible" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        <div className="modal-head" style={{
          background: isCredit
            ? 'linear-gradient(135deg,#065f46,#0d9488)'
            : 'linear-gradient(135deg,#92400e,#f59e0b)',
        }}>
          <button className="modal-close-btn" onClick={onClose}>×</button>
          <div className="modal-head-icon">{isCredit ? '↓' : '↑'}</div>
          <div className="modal-head-title">{tx.type.label}</div>
          {!['DEBUT_JOURNEE', 'FIN_JOURNEE'].includes(tx.type.key) && (
            <div className="modal-head-amount">
              {tx.montant.signe}{fmt(tx.montant.valeur)} F
            </div>
          )}
        </div>

        <div className="modal-detail-body">
          <div className="detail-row">
            <span className="detail-label">📅 Date &amp; heure</span>
            <span className="detail-value">
              {new Date(tx.dateHeure).toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
              })}
              {' à '}
              {new Date(tx.dateHeure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">👤 Effectué par</span>
            <div className="detail-user">
              <MiniAvatar name={interv?.nom ?? '?'} size={30} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{interv?.nom ?? '—'}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{interv?.role} · {interv?.telephone}</div>
              </div>
            </div>
          </div>

          <div className="detail-row">
            <span className="detail-label">🎯 Superviseur</span>
            <div className="detail-user">
              <MiniAvatar name={supNom} size={30} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{supNom}</div>
                {typeof tx.superviseur === 'object' && 'telephone' in tx.superviseur && (
                  <div style={{ fontSize: 11, color: '#64748b' }}>{(tx.superviseur as any).telephone}</div>
                )}
              </div>
            </div>
          </div>

          {tx.partenaire && (
            <div className="detail-row">
              <span className="detail-label">🤝 Partenaire</span>
              <div className="detail-user">
                <MiniAvatar name={(tx.partenaire as any)?.nom ?? '?'} size={30} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>
                    {(tx.partenaire as any)?.nom ?? (tx.partenaire as any)?.nomComplet ?? '—'}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{(tx.partenaire as any)?.telephone}</div>
                </div>
              </div>
            </div>
          )}

          <div className="detail-row">
            <span className="detail-label">💳 Compte</span>
            <div className="detail-acct" style={{ background: acct.color + '15', border: `1px solid ${acct.color}30` }}>
              <span style={{ fontSize: 16 }}>{acct.icon}</span>
              <span style={{ fontWeight: 700, color: acct.color }}>{tx.compte}</span>
            </div>
          </div>

          {!['DEBUT_JOURNEE', 'FIN_JOURNEE'].includes(tx.type.key) && (
            <div className="detail-row">
              <span className="detail-label">💰 Montant</span>
              <div className="detail-amount" style={{ color: isCredit ? '#10b981' : '#f59e0b' }}>
                {tx.montant.signe}{fmt(tx.montant.valeur)} {tx.montant.devise}
              </div>
            </div>
          )}

          {tx.description && (
            <div className="detail-row">
              <span className="detail-label">📝 Description</span>
              <span className="detail-value">{tx.description}</span>
            </div>
          )}

          <div className="detail-row">
            <span className="detail-label">✅ Statut</span>
            <span className={`detail-status ${tx.isValidated ? 'status-ok' : 'status-pending'}`}>
              {tx.isValidated ? '✅ Validée' : '⏳ En attente'}
            </span>
          </div>

          {tx.archived && (
            <div className="archived-banner">📦 Transaction archivée</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function RecentTransactionsPage() {
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [stats, setStats]               = useState<TransactionStats | null>(null);
  const [pagination, setPagination]     = useState<PaginationInfo | null>(null);
  const [loading, setLoading]           = useState(true);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [selectedTx, setSelectedTx]     = useState<RecentTransaction | null>(null);
  const [exporting, setExporting]       = useState(false);
  const [sidebarOpen, setSidebarOpen]   = useState(false);

  const [period, setPeriod]           = useState<Period>('today');
  const [txType, setTxType]           = useState<TransactionType | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const searchDebounce = useRef<ReturnType<typeof setTimeout>>();

  const [filters, setFilters] = useState<TransactionFilters>({
    period: 'today', transactionType: '', search: '', page: 1, limit: 20,
  });

  const load = useCallback(async (f: TransactionFilters, append = false) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const data = await RecentTransactionService.getRecentTransactions(f);
      setTransactions(prev => append ? [...prev, ...data.transactions] : data.transactions);
      setStats(data.stats);
      setPagination(data.pagination);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Erreur lors du chargement');
    } finally { setLoading(false); setLoadingMore(false); }
  }, []);

  useEffect(() => { load(filters); }, []);

  const applyFilters = useCallback((overrides: Partial<TransactionFilters>) => {
    const next = { ...filters, ...overrides, page: 1 };
    setFilters(next);
    setTransactions([]);
    load(next);
  }, [filters, load]);

  const onPeriod = (p: Period) => { setPeriod(p); applyFilters({ period: p }); };
  const onType   = (t: TransactionType | '') => { setTxType(t); applyFilters({ transactionType: t }); };

  const onSearchChange = (v: string) => {
    setSearchInput(v);
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => { applyFilters({ search: v }); }, 400);
  };

  const loadMore = () => {
    if (!pagination?.hasNextPage || loadingMore) return;
    const next = { ...filters, page: (filters.page ?? 1) + 1 };
    setFilters(next);
    load(next, true);
  };

  const handleExport = async () => {
    setExporting(true);
    try { await RecentTransactionService.downloadCSV(filters); } catch { }
    finally { setExporting(false); }
  };

  const grouped = groupByDate(transactions);

  return (
    <>
      <style>{CSS}</style>
      <div className="rt-shell">
        <DashboardSidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />

        <div className="rt-main">

          {/* ── HERO ── */}
          <div className="rt-hero">
            <div className="rt-hero-deco" />
            <div className="rt-hero-row">
              <div className="rt-hero-left">
                {/* Hamburger mobile — classes Tailwind directes, pas de CSS custom */}
                <button
                  className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 mt-0.5 cursor-pointer transition-colors"
                  style={{ background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.25)' }}
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Ouvrir le menu"
                >
                  <Menu size={18} color="white" />
                </button>
                <div>
                  <div className="rt-eyebrow">Historique</div>
                  <h1 className="rt-title">Transactions</h1>
                  <p className="rt-sub">Toutes les opérations en temps réel</p>
                </div>
              </div>
              <button className="btn-export" onClick={handleExport} disabled={exporting}>
                {exporting ? '⏳ Export…' : '⬇ CSV'}
              </button>
            </div>

            {/* Stats */}
            {stats && (
              <div className="stats-row">
                <StatCard icon="📋" label="Total"     value={fmt(stats.total)}                                    color="#0d9488" bg="#f0fdfa" />
                <StatCard icon="↓"  label="Dépôts"    value={fmt(stats.depots)}   sub={fmt(stats.montantEntrees) + ' F'} color="#10b981" bg="#f0fdf4" />
                <StatCard icon="↑"  label="Retraits"  value={fmt(stats.retraits)} sub={fmt(stats.montantSorties) + ' F'} color="#f59e0b" bg="#fffbeb" />
                <StatCard icon="→"  label="Transferts" value={fmt(stats.transferts)}                              color="#3b82f6" bg="#eff6ff" />
                <StatCard icon="💰" label="Volume"    value={fmt(stats.montantTotal) + ' F'}                     color="#8b5cf6" bg="#faf5ff" />
              </div>
            )}
          </div>

          {/* ── FILTERS ── */}
          <div className="filters-bar">
            <div className="search-wrap">
              <span className="search-ico">🔍</span>
              <input
                className="search-input"
                placeholder="Nom, partenaire, montant…"
                value={searchInput}
                onChange={e => onSearchChange(e.target.value)}
              />
              {searchInput && (
                <button className="search-clear" onClick={() => onSearchChange('')}>×</button>
              )}
            </div>
            <div className="filter-chips">
              {PERIODS.map(p => (
                <button
                  key={p.key}
                  className={`chip${period === p.key ? ' active' : ''}`}
                  onClick={() => onPeriod(p.key)}
                >{p.label}</button>
              ))}
            </div>
          </div>

          {/* ── TYPE FILTERS ── */}
          <div className="type-filters">
            {TX_TYPES.map(t => (
              <button
                key={t.key}
                className={`type-btn${txType === t.key ? ' active' : ''}`}
                style={txType === t.key ? { background: t.color + '18', color: t.color, borderColor: t.color + '44' } : {}}
                onClick={() => onType(t.key as TransactionType | '')}
              >
                <span className="type-ico">{t.icon}</span>
                <span className="type-label">{t.label}</span>
              </button>
            ))}
          </div>

          {/* ── ERROR ── */}
          {error && (
            <div className="rt-error">
              ⚠️ {error}
              <button className="retry-btn" onClick={() => load(filters)}>Réessayer</button>
            </div>
          )}

          {/* ── SKELETON ── */}
          {loading && (
            <div className="tx-list">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <div key={i} className="tx-row sk-row-anim" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="sk-dot" />
                  <div className="sk-circle" style={{ width: 36, height: 36, borderRadius: 12 }} />
                  <div style={{ flex: 1 }}>
                    <div className="sk-line" style={{ width: '45%', marginBottom: 6 }} />
                    <div className="sk-line" style={{ width: '30%', height: 8 }} />
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="sk-line" style={{ width: 64, height: 14, marginBottom: 4, marginLeft: 'auto' }} />
                    <div className="sk-line" style={{ width: 40, marginLeft: 'auto' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── EMPTY ── */}
          {!loading && transactions.length === 0 && !error && (
            <div className="rt-empty">
              <div className="rt-empty-icon">📭</div>
              <p>Aucune transaction pour cette période</p>
              <span>Essayez une autre période ou supprimez les filtres</span>
            </div>
          )}

          {/* ── TIMELINE ── */}
          {!loading && grouped.length > 0 && (
            <div className="tx-list">
              {grouped.map(group => (
                <div key={group.date} className="tx-group">
                  <div className="date-header">
                    <div className="date-line" />
                    <span className="date-label">{group.date}</span>
                    <div className="date-line" />
                    <span className="date-count">{group.items.length} op.</span>
                  </div>
                  <div className="tx-group-items">
                    {group.items.map(tx => (
                      <TxRow key={tx.id} tx={tx} onClick={() => setSelectedTx(tx)} />
                    ))}
                  </div>
                </div>
              ))}

              {pagination?.hasNextPage && (
                <div className="load-more-wrap">
                  <button className="btn-load-more" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore
                      ? <><span className="spinner" /> Chargement…</>
                      : `Voir plus · ${pagination.totalCount - transactions.length} restantes`}
                  </button>
                </div>
              )}

              {!pagination?.hasNextPage && transactions.length > 0 && (
                <div className="end-marker">
                  <div className="date-line" />
                  <span>✦ {transactions.length} transaction{transactions.length > 1 ? 's' : ''} affichée{transactions.length > 1 ? 's' : ''}</span>
                  <div className="date-line" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedTx && <TxDetailModal tx={selectedTx} onClose={() => setSelectedTx(null)} />}
    </>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
  /* LAYOUT */
  .rt-shell { display:flex; min-height:100vh; background:#f8fafc; }
  .rt-main  { flex:1; display:flex; flex-direction:column; overflow-x:hidden; min-width:0; }

  /* HERO */
  .rt-hero {
    background: linear-gradient(135deg,#0f4c47 0%,#0f766e 40%,#0d9488 75%,#14b8a6 100%);
    padding: 20px 16px 18px;
    position: relative; overflow: hidden;
  }
  @media (min-width:640px) { .rt-hero { padding: 28px 32px 24px; } }

  .rt-hero-deco { position:absolute; top:-80px; right:-60px; width:300px; height:300px; border-radius:50%; background:rgba(255,255,255,.05); pointer-events:none; }

  .rt-hero-row {
    display:flex; align-items:flex-start; justify-content:space-between;
    margin-bottom:16px; gap:10px;
  }
  @media (min-width:640px) { .rt-hero-row { margin-bottom:22px; } }

  .rt-hero-left { display:flex; align-items:flex-start; gap:10px; min-width:0; }



  .rt-eyebrow { font-size:10px; font-weight:700; color:rgba(255,255,255,.55); text-transform:uppercase; letter-spacing:.1em; margin-bottom:3px; }
  .rt-title   { font-size:22px; font-weight:800; color:white; letter-spacing:-.03em; line-height:1; margin-bottom:3px; }
  .rt-sub     { font-size:11px; color:rgba(255,255,255,.6); }
  @media (min-width:640px) { .rt-title { font-size:28px; } .rt-sub { font-size:13px; } }

  .btn-export {
    background:rgba(255,255,255,.15); border:1px solid rgba(255,255,255,.25);
    color:white; border-radius:10px; padding:8px 12px;
    font-weight:700; font-size:12px; cursor:pointer;
    backdrop-filter:blur(8px); transition:all .18s; white-space:nowrap; flex-shrink:0;
  }
  .btn-export:hover:not(:disabled) { background:rgba(255,255,255,.25); }
  .btn-export:disabled { opacity:.6; cursor:not-allowed; }
  @media (min-width:640px) { .btn-export { font-size:13px; padding:10px 18px; border-radius:12px; } }

  /* STATS */
  .stats-row {
    display:grid;
    grid-template-columns: repeat(2, 1fr);
    gap:8px;
  }
  @media (min-width:480px) { .stats-row { grid-template-columns: repeat(3, 1fr); } }
  @media (min-width:768px) { .stats-row { display:flex; flex-wrap:wrap; gap:10px; } }

  .stat-card {
    display:flex; align-items:center; gap:8px;
    border-radius:12px; padding:9px 11px; border:1px solid;
    flex:1; min-width:0;
  }
  @media (min-width:640px) { .stat-card { border-radius:14px; padding:11px 14px; gap:10px; } }

  .stat-icon {
    width:30px; height:30px; border-radius:9px;
    display:flex; align-items:center; justify-content:center;
    font-size:12px; font-weight:800; flex-shrink:0;
  }
  @media (min-width:640px) { .stat-icon { width:34px; height:34px; border-radius:10px; font-size:14px; } }

  .stat-text { min-width:0; }
  .stat-val  { font-size:13px; font-weight:800; line-height:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .stat-lbl  { font-size:9px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.06em; margin-top:2px; }
  .stat-sub  { font-size:9px; color:#94a3b8; font-weight:600; margin-top:1px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  @media (min-width:640px) { .stat-val { font-size:16px; } .stat-sub { font-size:10px; } }

  /* FILTERS BAR */
  .filters-bar {
    display:flex; align-items:center; gap:8px;
    padding:12px 12px; background:white;
    border-bottom:1px solid #e8edf2; flex-wrap:wrap;
  }
  @media (min-width:640px) { .filters-bar { padding:14px 24px; gap:12px; } }
  @media (min-width:1024px) { .filters-bar { padding:16px 32px; } }

  .search-wrap {
    display:flex; align-items:center; gap:6px;
    background:#f8fafc; border:1.5px solid #e2e8f0;
    border-radius:10px; padding:0 10px;
    flex:1; min-width:0; transition:border .15s;
  }
  @media (min-width:640px) { .search-wrap { border-radius:12px; padding:0 12px; max-width:320px; } }
  .search-wrap:focus-within { border-color:#0d9488; background:white; }

  .search-ico   { font-size:13px; color:#94a3b8; flex-shrink:0; }
  .search-input { border:none; background:transparent; outline:none; font-size:12px; color:#0f172a; padding:8px 0; flex:1; font-family:inherit; min-width:0; }
  @media (min-width:640px) { .search-input { font-size:13px; } }
  .search-input::placeholder { color:#94a3b8; }
  .search-clear { border:none; background:none; cursor:pointer; color:#94a3b8; font-size:16px; line-height:1; padding:0; flex-shrink:0; }

  .filter-chips { display:flex; gap:3px; flex-wrap:wrap; }
  @media (min-width:640px) { .filter-chips { gap:4px; } }

  .chip {
    border:1px solid #e2e8f0; background:transparent;
    border-radius:99px; padding:5px 10px;
    font-size:10px; font-weight:700; color:#64748b;
    cursor:pointer; transition:all .15s; white-space:nowrap;
  }
  @media (min-width:640px) { .chip { font-size:11px; padding:6px 14px; } }
  .chip:hover { border-color:#0d9488; color:#0d9488; }
  .chip.active { background:#0d9488; color:white; border-color:#0d9488; box-shadow:0 2px 8px rgba(13,148,136,.3); }

  /* TYPE FILTERS */
  .type-filters {
    display:flex; gap:4px;
    padding:10px 12px; background:white;
    border-bottom:1px solid #e8edf2;
    overflow-x:auto; -webkit-overflow-scrolling:touch;
    scrollbar-width:none;
  }
  .type-filters::-webkit-scrollbar { display:none; }
  @media (min-width:640px) { .type-filters { padding:12px 24px; gap:6px; flex-wrap:wrap; } }
  @media (min-width:1024px) { .type-filters { padding:12px 32px; } }

  .type-btn {
    border:1px solid #e8edf2; background:transparent;
    border-radius:9px; padding:6px 10px;
    font-size:11px; font-weight:700; color:#64748b;
    cursor:pointer; transition:all .15s;
    display:flex; align-items:center; gap:4px;
    white-space:nowrap; flex-shrink:0;
  }
  @media (min-width:640px) { .type-btn { border-radius:10px; padding:7px 14px; font-size:12px; gap:5px; } }
  .type-btn:hover { background:#f8fafc; }
  .type-btn.active { font-weight:800; }
  .type-ico { font-size:12px; }

  /* Cacher le texte label sur très petit écran pour les types */
  @media (max-width:400px) {
    .type-label { display:none; }
    .type-btn { padding:6px 8px; }
  }

  /* ERROR */
  .rt-error {
    background:#fee2e2; border:1px solid #fca5a5; border-radius:12px;
    padding:12px 16px; color:#9f1239; font-size:12px; font-weight:600;
    margin:16px 12px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;
  }
  @media (min-width:640px) { .rt-error { margin:20px 32px; font-size:13px; padding:13px 20px; } }
  .retry-btn { border:none; background:none; color:#9f1239; font-weight:800; text-decoration:underline; cursor:pointer; font-size:11px; }

  /* EMPTY */
  .rt-empty      { text-align:center; padding:48px 16px; color:#94a3b8; }
  .rt-empty-icon { font-size:40px; margin-bottom:12px; }
  .rt-empty p    { font-size:14px; font-weight:700; color:#475569; margin-bottom:6px; }
  .rt-empty span { font-size:12px; }
  @media (min-width:640px) { .rt-empty { padding:60px 32px; } .rt-empty-icon { font-size:48px; } }

  /* LIST */
  .tx-list { padding:0 8px 32px; display:flex; flex-direction:column; gap:0; }
  @media (min-width:640px) { .tx-list { padding:0 24px 40px; } }
  @media (min-width:1024px) { .tx-list { padding:0 32px 40px; } }

  /* DATE HEADER */
  .tx-group { margin-top:18px; }
  @media (min-width:640px) { .tx-group { margin-top:24px; } }

  .date-header { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
  @media (min-width:640px) { .date-header { gap:10px; margin-bottom:10px; } }

  .date-line  { flex:1; height:1px; background:#e8edf2; }
  .date-label { font-size:10px; font-weight:800; color:#64748b; white-space:nowrap; text-transform:capitalize; }
  @media (min-width:640px) { .date-label { font-size:11px; } }
  .date-count { font-size:9px; font-weight:700; color:#94a3b8; background:#f1f5f9; border-radius:99px; padding:2px 7px; white-space:nowrap; }
  @media (min-width:640px) { .date-count { font-size:10px; padding:2px 8px; } }

  .tx-group-items {
    background:white; border-radius:14px;
    border:1px solid #edf0f4; overflow:hidden;
    box-shadow:0 1px 6px rgba(0,0,0,.04);
  }
  @media (min-width:640px) { .tx-group-items { border-radius:18px; } }

  /* TRANSACTION ROW */
  .tx-row {
    display:flex; align-items:center; gap:8px;
    padding:10px 12px;
    border-bottom:1px solid #f8fafc;
    cursor:pointer; transition:background .15s;
    position:relative; animation:fadeUp .35s ease both;
  }
  @media (min-width:640px) { .tx-row { gap:12px; padding:13px 16px; } }
  .tx-row:last-child { border-bottom:none; }
  .tx-row:hover { background:#fafcff; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }

  .tx-timeline-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; transition:all .2s; }
  @media (min-width:640px) { .tx-timeline-dot { width:10px; height:10px; } }

  /* Avatar masqué sur tout petit écran */
  .tx-avatar-wrap { display:none; }
  @media (min-width:420px) { .tx-avatar-wrap { display:block; flex-shrink:0; } }

  .mini-avatar { display:flex; align-items:center; justify-content:center; font-weight:800; flex-shrink:0; }

  .tx-info { flex:1; min-width:0; }
  .tx-name-row { display:flex; align-items:center; gap:4px; margin-bottom:4px; flex-wrap:wrap; }
  @media (min-width:640px) { .tx-name-row { gap:6px; margin-bottom:5px; } }
  .tx-who  { font-size:12px; font-weight:700; color:#0f172a; }
  @media (min-width:640px) { .tx-who { font-size:13px; } }
  .tx-role-pill { font-size:8px; font-weight:800; padding:2px 6px; border-radius:99px; text-transform:uppercase; letter-spacing:.05em; white-space:nowrap; }
  @media (min-width:640px) { .tx-role-pill { font-size:9px; padding:2px 8px; } }
  .tx-partner-tag { font-size:9px; color:#64748b; font-weight:600; }
  @media (min-width:640px) { .tx-partner-tag { font-size:10px; } }

  .tx-meta-row { display:flex; align-items:center; gap:4px; flex-wrap:wrap; }
  @media (min-width:640px) { .tx-meta-row { gap:6px; } }

  .tx-badge { font-size:9px; font-weight:700; padding:2px 7px; border-radius:99px; white-space:nowrap; }
  @media (min-width:640px) { .tx-badge { font-size:10px; padding:2px 9px; } }

  .acct-chip { font-size:9px; font-weight:800; padding:2px 6px; border-radius:7px; display:inline-flex; align-items:center; gap:3px; white-space:nowrap; }
  @media (min-width:640px) { .acct-chip { font-size:10px; padding:2px 8px; border-radius:8px; gap:4px; } }

  .tx-desc { font-size:9px; color:#94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100px; }
  @media (min-width:640px) { .tx-desc { font-size:10px; max-width:160px; } }

  .tx-right { text-align:right; flex-shrink:0; min-width:70px; }
  @media (min-width:640px) { .tx-right { min-width:90px; } }

  .tx-montant { font-size:12px; font-weight:800; line-height:1; white-space:nowrap; }
  @media (min-width:640px) { .tx-montant { font-size:14px; } }
  .tx-signe  { font-size:10px; font-weight:700; margin-right:1px; }
  .tx-devise { font-size:9px; font-weight:600; }
  .tx-time   { font-size:9px; color:#94a3b8; margin-top:2px; }
  .tx-hour   { font-size:10px; color:#64748b; font-weight:600; }
  @media (min-width:640px) { .tx-time { font-size:10px; margin-top:3px; } .tx-hour { font-size:11px; } }

  /* SKELETON */
  .sk-row-anim { opacity:0; animation:fadeUp .5s ease both; }
  .sk-dot    { width:8px; height:8px; border-radius:50%; background:#e2e8f0; flex-shrink:0; animation:pulse 1.5s ease infinite; }
  .sk-circle { background:#e2e8f0; animation:pulse 1.5s ease infinite; flex-shrink:0; }
  .sk-line   { height:10px; background:#e2e8f0; border-radius:99px; animation:pulse 1.5s ease infinite; margin-bottom:2px; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

  /* LOAD MORE */
  .load-more-wrap { text-align:center; padding:16px 0; }
  @media (min-width:640px) { .load-more-wrap { padding:20px 0; } }
  .btn-load-more {
    background:white; border:1.5px solid #e2e8f0; border-radius:11px;
    padding:10px 22px; font-size:12px; font-weight:700; color:#64748b;
    cursor:pointer; display:inline-flex; align-items:center; gap:8px; transition:all .18s;
  }
  @media (min-width:640px) { .btn-load-more { border-radius:12px; padding:11px 28px; font-size:13px; } }
  .btn-load-more:hover:not(:disabled) { border-color:#0d9488; color:#0d9488; background:#f0fdfa; }
  .spinner { width:13px; height:13px; border:2px solid #e2e8f0; border-top-color:#0d9488; border-radius:50%; animation:spin .7s linear infinite; display:inline-block; }
  @keyframes spin { to{transform:rotate(360deg)} }

  .end-marker { display:flex; align-items:center; gap:10px; padding:16px 0 0; color:#94a3b8; font-size:11px; font-weight:600; }

  /* MODAL */
  .modal-overlay { position:fixed; inset:0; background:rgba(15,23,42,.5); backdrop-filter:blur(5px); z-index:200; display:flex; align-items:flex-end; justify-content:center; padding:0; opacity:0; pointer-events:none; transition:opacity .25s; }
  @media (min-width:640px) { .modal-overlay { align-items:center; padding:16px; } }
  .modal-overlay.visible { opacity:1; pointer-events:auto; }

  .modal-box {
    background:white; border-radius:20px 20px 0 0;
    width:100%; max-height:90vh; overflow-y:auto;
    box-shadow:0 28px 80px rgba(0,0,0,.22); animation:slideUp .3s cubic-bezier(.4,0,.2,1);
  }
  @media (min-width:640px) {
    .modal-box { border-radius:24px; max-width:460px; max-height:85vh; animation:scaleIn .3s cubic-bezier(.4,0,.2,1); }
  }
  @keyframes slideUp  { from{transform:translateY(100%)} to{transform:none} }
  @keyframes scaleIn  { from{transform:scale(.94) translateY(10px)} to{transform:none} }

  .modal-head { padding:24px 20px 18px; position:relative; overflow:hidden; text-align:center; }
  @media (min-width:640px) { .modal-head { padding:28px 24px 22px; } }
  .modal-head::before { content:''; position:absolute; top:-40px; right:-40px; width:140px; height:140px; border-radius:50%; background:rgba(255,255,255,.08); }
  .modal-close-btn { position:absolute; top:14px; right:14px; width:30px; height:30px; border-radius:50%; background:rgba(255,255,255,.18); border:none; color:white; font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:1; }
  @media (min-width:640px) { .modal-close-btn { top:16px; right:16px; width:32px; height:32px; } }
  .modal-close-btn:hover { background:rgba(255,255,255,.3); }
  .modal-head-icon   { width:46px; height:46px; background:rgba(255,255,255,.2); border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:800; color:white; margin:0 auto 8px; }
  .modal-head-title  { font-size:15px; font-weight:800; color:white; }
  .modal-head-amount { font-size:24px; font-weight:800; color:white; margin-top:5px; letter-spacing:-.02em; }
  @media (min-width:640px) { .modal-head-icon { width:52px; height:52px; font-size:22px; margin-bottom:10px; } .modal-head-title { font-size:17px; } .modal-head-amount { font-size:28px; } }

  .modal-detail-body { padding:16px 18px; display:flex; flex-direction:column; gap:0; }
  @media (min-width:640px) { .modal-detail-body { padding:20px 24px; } }

  .detail-row   { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; padding:10px 0; border-bottom:1px solid #f1f5f9; }
  .detail-row:last-child { border-bottom:none; }
  .detail-label { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.06em; flex-shrink:0; padding-top:2px; }
  .detail-value { font-size:11px; font-weight:600; color:#334155; text-align:right; }
  @media (min-width:640px) { .detail-label { font-size:11px; } .detail-value { font-size:12px; } }
  .detail-user  { display:flex; align-items:center; gap:8px; }
  .detail-acct  { display:flex; align-items:center; gap:6px; font-size:12px; font-weight:700; padding:4px 12px; border-radius:8px; }
  .detail-amount { font-size:16px; font-weight:800; }
  @media (min-width:640px) { .detail-amount { font-size:18px; } }
  .detail-status { font-size:10px; font-weight:800; padding:3px 10px; border-radius:99px; }
  .status-ok     { background:#d1fae5; color:#065f46; }
  .status-pending{ background:#fef3c7; color:#92400e; }
  .archived-banner { background:#f1f5f9; border-radius:10px; padding:10px 14px; font-size:12px; color:#475569; font-weight:600; text-align:center; margin-top:8px; }
`;