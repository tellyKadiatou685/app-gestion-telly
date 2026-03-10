// src/components/DashboardSidebar.tsx
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, UserCheck, AlertCircle,
  CreditCard, Settings2, LogOut, X,
} from "lucide-react";
import AuthService from "@/services/Authservice";

const menuItems = [
  { label: "Dashboard",          icon: LayoutDashboard, path: "/dashboard"     },
  { label: "Nos partenaires",    icon: UserCheck,       path: "/partners"      },
  { label: "Transactions",       icon: Users,           path: "/transactions"  },
  { label: "Nos superviseurs",   icon: AlertCircle,     path: "/sup"           },
  { label: "Compte global",      icon: CreditCard,      path: "/dashboard"     },
  { label: "Types de Compte",    icon: Settings2,       path: "/account-types" },
];

// ─── CONTENU DE LA SIDEBAR ────────────────────────────────────────────────────

const SidebarContent = ({
  onNavigate,
  onClose,
}: {
  onNavigate?: () => void;
  onClose?: () => void;
}) => {
  const navigate    = useNavigate();
  const location    = useLocation();
  const [showConfirm, setShowConfirm] = useState(false);
  const currentUser = AuthService.getStoredUser();

  const handleLogout = async () => {
    await AuthService.logout();
    navigate("/login");
  };

  const handleNav = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  return (
    <>
      <div className="flex flex-col h-full py-5 px-3">

        {/* ── Logo + bouton fermer ── */}
        <div className="flex items-center justify-between mb-8 px-2">
          <div className="flex items-center gap-2">
            <span className="bg-accent rounded-md px-2 py-0.5 text-xs font-bold text-accent-foreground">
              Gestion
            </span>
            <span className="text-base font-bold text-sidebar-foreground">App</span>
          </div>
          {/* Bouton ✕ affiché seulement si onClose fourni (= mode mobile drawer) */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-sidebar-active/20 transition-colors"
              aria-label="Fermer le menu"
            >
              <X className="h-5 w-5 text-sidebar-foreground" />
            </button>
          )}
        </div>

        <p className="text-[11px] uppercase tracking-wider text-sidebar-foreground/50 mb-3 px-2">
          Menu Principal
        </p>

        {/* ── Navigation ── */}
        <nav className="flex flex-col gap-1 flex-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.label}
                onClick={() => handleNav(item.path)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left ${
                  isActive
                    ? "bg-sidebar-active text-sidebar-active-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-active/10"
                }`}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* ── Profil + déconnexion ── */}
        <div className="mt-auto pt-4 flex flex-col gap-2">
          <div className="h-px bg-sidebar-foreground/10 mb-2" />

          {currentUser && (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-sidebar-active/10">
              <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                <span className="text-accent-foreground text-xs font-bold">
                  {currentUser.nomComplet[0]?.toUpperCase() ?? "A"}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-sidebar-foreground truncate leading-tight">
                  {currentUser.nomComplet}
                </p>
                <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wide">
                  {currentUser.role}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-red-500 hover:bg-red-500/10 w-full"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </div>

      {/* ── Modal confirmation déconnexion ── */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(15,23,42,.55)", backdropFilter: "blur(6px)" }}
        >
          <div className="bg-white rounded-2xl p-7 w-full max-w-xs text-center shadow-2xl">
            <div className="text-4xl mb-3">👋</div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Déconnexion</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Voulez-vous vraiment vous déconnecter de votre session ?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors shadow-md shadow-red-200"
              >
                Déconnecter
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────────

interface DashboardSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const DashboardSidebar = ({
  mobileOpen = false,
  onMobileClose,
}: DashboardSidebarProps) => {
  return (
    <>
      {/* ══ DESKTOP : sidebar fixe, visible à partir de lg (1024px) ══ */}
      <aside className="hidden lg:flex w-56 min-h-screen bg-sidebar flex-col flex-shrink-0 sticky top-0 h-screen overflow-y-auto">
        <SidebarContent />
      </aside>

      {/* ══ MOBILE : drawer slide-in depuis la gauche ══ */}

      {/* Overlay sombre — cliquable pour fermer */}
      <div
        aria-hidden="true"
        className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300"
        style={{
          opacity:        mobileOpen ? 1 : 0,
          pointerEvents:  mobileOpen ? "auto" : "none",
        }}
        onClick={onMobileClose}
      />

      {/* Drawer */}
      <aside
        className="lg:hidden fixed top-0 left-0 z-50 h-full w-[260px] bg-sidebar flex flex-col shadow-2xl transition-transform duration-300 ease-in-out"
        style={{ transform: mobileOpen ? "translateX(0)" : "translateX(-100%)" }}
        aria-hidden={!mobileOpen}
      >
        <SidebarContent onNavigate={onMobileClose} onClose={onMobileClose} />
      </aside>
    </>
  );
};

export default DashboardSidebar;