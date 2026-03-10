// src/pages/Login.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Phone } from "lucide-react";
import AuthService from "@/services/Authservice";

const Login = () => {
  const navigate = useNavigate();
  const [telephone, setTelephone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
  
    try {
      const user = await AuthService.login(telephone, code);
  
      switch (user.role) {
        case "ADMIN":
          navigate("/dashboard");
          break;
        case "SUPERVISEUR":
          navigate("/dashboard/superviseur");
          break;
        case "PARTENAIRE":
          navigate("/dashboard/partenaire");
          break;
        default:
          navigate("/dashboard");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Identifiants incorrects. Veuillez réessayer."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sidebar to-[hsl(var(--login-gradient-end))]">
      <div className="w-full max-w-md animate-fade-in">
        <div className="bg-card rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="bg-accent rounded-lg px-3 py-1 text-sm font-bold text-accent-foreground">
                Gestion
              </span>
              <span className="text-2xl font-bold text-foreground">App</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Connectez-vous à votre compte
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Téléphone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="tel"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder="77 000 00 00"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Code d'accès
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="••••••"
                  maxLength={6}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Connexion en cours…" : "Se connecter"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;