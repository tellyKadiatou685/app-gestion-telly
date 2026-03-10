// src/Routes/Userroutes.ts
import api from "@/config";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface LoginPayload {
  telephone: string;
  Code: string;
}

export interface User {
  id:         string;
  telephone:  string;
  nomComplet: string;
  adresse?:   string | null;
  photo?:     string | null;
  role:       "ADMIN" | "SUPERVISEUR" | "PARTENAIRE";
  status:     "ACTIVE" | "SUSPENDED" | "PENDING";
  createdAt?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user:  User;
    token: string;
  };
}

export interface UpdateProfilePayload {
  nomComplet?: string;
  telephone?:  string;
  adresse?:    string | null;
  photo?:      string | null;
}

export interface CreateUserPayload {
  telephone:  string;
  nomComplet: string;
  role:       "ADMIN" | "SUPERVISEUR" | "PARTENAIRE";
  code?:      string | null;
  adresse?:   string | null;
  photo?:     string | null;
}

export interface GetPartnersParams {
  status?:    "ACTIVE" | "SUSPENDED";
  search?:    string;
  page?:      number;
  limit?:     number;
  showCodes?: boolean;
}

// ─── NOUVEAU : pour getAllUsers (superviseurs avec tous statuts) ───────────────
export interface GetAllUsersParams {
  role?:      string;
  status?:    string; // "ACTIVE" | "SUSPENDED" | "all" — string large exprès
  search?:    string;
  page?:      number;
  limit?:     number;
  showCodes?: boolean;
}

export interface UserCodeResponse {
  userId:    string;
  codeClair: string | null;
}

export interface RegenerateCodeResponse {
  userId:     string;
  nomComplet: string;
  codeAcces:  string;
}

// ─── TYPE GÉNÉRIQUE RÉPONSE API ───────────────────────────────────────────────
interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?:    T;
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────

const userRoutes = {

  // ─── AUTH ──────────────────────────────────────────────────────────────────

  // 🔐 POST /users/login
  login: (payload: LoginPayload) =>
    api.post<LoginResponse>("/users/login", payload),

  // 🚪 POST /users/logout
  logout: () =>
    api.post("/users/logout"),

  // ─── PROFIL ────────────────────────────────────────────────────────────────

  // 👤 GET /users/profile
  getProfile: () =>
    api.get("/users/profile"),

  // ✏️ PATCH /users/profile — nom, téléphone, adresse, photo (pas code)
  updateProfile: (payload: UpdateProfilePayload) =>
    api.patch("/users/profile", payload),

  // ─── CRÉATION ──────────────────────────────────────────────────────────────

  // ➕ POST /users/create — créer un utilisateur (admin)
  createUser: (payload: CreateUserPayload) =>
    api.post("/users/create", payload),

  // ─── PARTENAIRES (inchangé — ne pas toucher) ───────────────────────────────

  // 🤝 GET /users/partners — liste des partenaires (ACTIVE | SUSPENDED)
  getPartners: (params?: GetPartnersParams) =>
    api.get("/users/partners", { params }),

  // ─── ADMIN — LISTE COMPLÈTE ────────────────────────────────────────────────

  // 📋 GET /users/all — tous les utilisateurs avec filtre role + status (admin)
  getAllUsers: (params?: GetAllUsersParams) =>
    api.get("/users/all", { params }),

  // ─── ADMIN — CODES D'ACCÈS ─────────────────────────────────────────────────

  // 🔑 GET /users/:userId/code — code clair (admin)
  getUserCode: (userId: string) =>
    api.get<ApiResponse<UserCodeResponse>>(`/users/${userId}/code`),

  // 🔄 POST /users/:userId/regenerate-code — nouveau code (admin)
  regenerateUserCode: (userId: string) =>
    api.post<ApiResponse<RegenerateCodeResponse>>(`/users/${userId}/regenerate-code`),

  // ─── ADMIN — STATUTS ───────────────────────────────────────────────────────

  // ✅ PATCH /users/:userId/activate — activer un compte (admin)
  activateUser: (userId: string) =>
    api.patch<ApiResponse>(`/users/${userId}/activate`),

  // 🚫 PATCH /users/:userId/suspend — suspendre un compte (admin)
  suspendUser: (userId: string) =>
    api.patch<ApiResponse>(`/users/${userId}/suspend`),

};

export default userRoutes;