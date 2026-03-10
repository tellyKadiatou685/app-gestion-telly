// src/services/Authservice.ts
import userRoutes, {
  User,
  UpdateProfilePayload,
  UserCodeResponse,
  RegenerateCodeResponse,
} from "@/Routes/Userroutes";

const AuthService = {

  // ─── AUTHENTIFICATION ────────────────────────────────────────────────────────

  async login(telephone: string, code: string): Promise<User> {
    const { data } = await userRoutes.login({ telephone, Code: code });
    localStorage.setItem("token", data.data.token);
    localStorage.setItem("user", JSON.stringify(data.data.user));
    return data.data.user;
  },

  async logout(): Promise<void> {
    try {
      await userRoutes.logout();
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  },

  // ─── PROFIL ──────────────────────────────────────────────────────────────────

  async getProfile(): Promise<User> {
    const { data } = await userRoutes.getProfile();
    const user = data.data.user;
    localStorage.setItem("user", JSON.stringify(user));
    return user;
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<User> {
    const { data } = await userRoutes.updateProfile(payload);
    const user = data.data.user;
    localStorage.setItem("user", JSON.stringify(user));
    return user;
  },

  // ─── GESTION UTILISATEURS (ADMIN) ────────────────────────────────────────────

  // ✅ Activer un compte → PATCH /:userId/activate → data: updatedUser
  async activateUser(userId: string): Promise<void> {
    await userRoutes.activateUser(userId);
  },

  // 🚫 Suspendre un compte → PATCH /:userId/suspend → data: updatedUser
  async suspendUser(userId: string): Promise<void> {
    await userRoutes.suspendUser(userId);
  },

  // 🔑 GET /:userId/code → { success, data: { user, codeAcces } }
  async getUserCode(userId: string): Promise<UserCodeResponse> {
    const { data } = await userRoutes.getUserCode(userId);
    // Backend retourne data.codeAcces (champ codeClair en BDD)
    return {
      userId,
      codeClair: data.data.codeAcces ?? null,
    };
  },

  // 🔄 POST /:userId/regenerate-code → { success, data: { user, nouveauCode } }
  async regenerateUserCode(userId: string): Promise<RegenerateCodeResponse> {
    const { data } = await userRoutes.regenerateUserCode(userId);
    return {
      userId,
      nomComplet: data.data.user?.nomComplet ?? "",
      // Backend retourne "nouveauCode", pas "codeAcces"
      codeAcces:  data.data.nouveauCode,
    };
  },

  // ─── UTILITAIRES ─────────────────────────────────────────────────────────────

  getStoredUser(): User | null {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem("token");
  },

  updateStoredUser(partial: Partial<User>): void {
    const current = this.getStoredUser();
    if (!current) return;
    localStorage.setItem("user", JSON.stringify({ ...current, ...partial }));
  },
};

export default AuthService;