// src/services/AuthService.ts
import userRoutes, {
  User,
  UpdateProfilePayload,
  UpdateUserPayload,
  UpdateUserResponse,
  DeleteUserResponse,
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

  async updateUser(userId: string, payload: UpdateUserPayload): Promise<UpdateUserResponse> {
    const { data } = await userRoutes.updateUser(userId, payload);
    return data.data!;
  },

  async deleteUser(userId: string, reason?: string): Promise<DeleteUserResponse> {
    const { data } = await userRoutes.deleteUser(userId, reason);
    return data.data!;
  },

  async activateUser(userId: string): Promise<void> {
    await userRoutes.activateUser(userId);
  },

  async suspendUser(userId: string): Promise<void> {
    await userRoutes.suspendUser(userId);
  },

  async getUserCode(userId: string): Promise<UserCodeResponse> {
    const { data } = await userRoutes.getUserCode(userId);
    const raw = data.data as any;
    return { userId, codeClair: raw?.codeAcces ?? null };
  },

  async regenerateUserCode(userId: string): Promise<RegenerateCodeResponse> {
    const { data } = await userRoutes.regenerateUserCode(userId);
    const raw = data.data as any;
    return {
      userId,
      nomComplet: raw?.user?.nomComplet ?? "",
      codeAcces:  raw?.nouveauCode ?? "",
    };
  },

  // ─── PHOTO — conversion File → base64 puis updateUser ────────────────────────
  async uploadUserPhoto(userId: string, file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = async () => {
        try {
          const base64 = reader.result as string;
          await userRoutes.updateUser(userId, { photo: base64 });
          resolve(base64);
        } catch (e) { reject(e); }
      };
      reader.onerror = () => reject(new Error("Lecture du fichier échouée"));
      reader.readAsDataURL(file);
    });
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