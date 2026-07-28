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
  updatedAt?: string;
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

// ─── NOUVEAU : payload pour modifier un utilisateur (admin) ───────────────────
export interface UpdateUserPayload {
  nomComplet?: string;
  telephone?:  string;
  adresse?:    string | null;
  photo?:      string | null;
  role?:       "SUPERVISEUR" | "PARTENAIRE";
  status?:     "ACTIVE" | "SUSPENDED";
  code?:       string | null; // si fourni (≥ 4 chars) → rehasché côté backend
}

// ─── NOUVEAU : réponse de updateUser ──────────────────────────────────────────
export interface UpdateUserResponse {
  user:         User;
  changements:  string[];
  codeModifie:  boolean;
  nouveauCode?: string; // présent uniquement si le code a été modifié
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

export interface GetAllUsersParams {
  role?:      string;
  status?:    string;
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

// ─── NOUVEAU : réponse de deleteUser ──────────────────────────────────────────
export interface DeleteUserResponse {
  message:     string;
  deletedUser: Pick<User, "id" | "nomComplet" | "telephone" | "role">;
}

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?:    T;
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────

const userRoutes = {

  // ─── AUTH ──────────────────────────────────────────────────────────────────

  login: (payload: LoginPayload) =>
    api.post<LoginResponse>("/users/login", payload),

  logout: () =>
    api.post("/users/logout"),

  // ─── PROFIL ────────────────────────────────────────────────────────────────

  getProfile: () =>
    api.get("/users/profile"),

  // PATCH /users/profile — nom, téléphone, adresse, photo (code exclu)
  updateProfile: (payload: UpdateProfilePayload) =>
    api.patch("/users/profile", payload),

  // ─── CRÉATION ──────────────────────────────────────────────────────────────

  createUser: (payload: CreateUserPayload) =>
    api.post("/users/create", payload),

  // ─── MODIFICATION (admin) ──────────────────────────────────────────────────

  // PUT /users/:userId — modifier nomComplet, telephone, adresse, photo, role, status, code
  updateUser: (userId: string, payload: UpdateUserPayload) =>
    api.put<ApiResponse<UpdateUserResponse>>(`/users/${userId}`, payload),

  // ─── SUPPRESSION (admin) ───────────────────────────────────────────────────

  // DELETE /users/:userId — supprimer un utilisateur (solde doit être à zéro)
  deleteUser: (userId: string, reason?: string) =>
    api.delete<ApiResponse<DeleteUserResponse>>(`/users/${userId}`, {
      data: reason ? { reason } : undefined,
    }),

  // ─── PARTENAIRES ───────────────────────────────────────────────────────────

  getPartners: (params?: GetPartnersParams) =>
    api.get("/users/partners", { params }),

  // ─── ADMIN — LISTE COMPLÈTE ────────────────────────────────────────────────

  getAllUsers: (params?: GetAllUsersParams) =>
    api.get("/users/all", { params }),

  // ─── ADMIN — CODES D'ACCÈS ─────────────────────────────────────────────────

  getUserCode: (userId: string) =>
    api.get<ApiResponse<UserCodeResponse>>(`/users/${userId}/code`),

  regenerateUserCode: (userId: string) =>
    api.post<ApiResponse<RegenerateCodeResponse>>(`/users/${userId}/regenerate-code`),

  // ─── ADMIN — STATUTS ───────────────────────────────────────────────────────

  activateUser: (userId: string) =>
    api.patch<ApiResponse>(`/users/${userId}/activate`),

  suspendUser: (userId: string) =>
    api.patch<ApiResponse>(`/users/${userId}/suspend`),

};

export default userRoutes;