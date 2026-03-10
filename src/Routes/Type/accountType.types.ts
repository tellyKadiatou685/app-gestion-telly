// src/types/accountType.types.ts

// ─── ENUM ─────────────────────────────────────────────────────────────────────

export type AccountTypeValue =
  | 'LIQUIDE'
  | 'ORANGE_MONEY'
  | 'WAVE'
  | 'UV_MASTER'
  | 'FREE_MONEY'
  | 'WESTERN_UNION'
  | 'RIA'
  | 'MONEYGRAM'
  | 'AUTRES';

// ─── MODÈLES ──────────────────────────────────────────────────────────────────

/** Un type de compte tel que retourné par l'API (page admin — liste complète) */
export interface AccountTypeItem {
  value: AccountTypeValue;
  label: string;           // ex: "Wave", "Tigo Cash" pour AUTRES
  isActive: boolean;
  canCustomizeLabel: boolean; // true seulement pour AUTRES
}

/** Option simplifiée pour les <select> du formulaire transaction */
export interface AccountTypeOption {
  value: AccountTypeValue;
  label: string;
}

// ─── RÉPONSES API ─────────────────────────────────────────────────────────────

/** GET /api/accountype — réponse complète */
export interface AccountTypesConfig {
  allTypes: AccountTypeItem[];       // liste complète avec isActive (page admin)
  activeTypes: AccountTypeValue[];   // ex: ['LIQUIDE', 'WAVE']
  activeOptions: AccountTypeOption[]; // pour <select> transaction
  autresLabel: string;               // label perso de AUTRES
}

export interface GetAccountTypesResponse {
  success: boolean;
  data: AccountTypesConfig;
}

/** PATCH /:type/toggle — réponse */
export interface ToggleAccountTypeResponse {
  success: boolean;
  data: {
    accountType: AccountTypeValue;
    isActive: boolean;
    activeTypes: AccountTypeValue[];
  };
}

/** PATCH /AUTRES/label — réponse */
export interface UpdateAutresLabelResponse {
  success: boolean;
  data: {
    autresLabel: string;
  };
}

/** POST / — reconfiguration complète */
export interface SetAccountTypesResponse {
  success: boolean;
  data: {
    activeTypes: AccountTypeValue[];
    autresLabel: string;
  };
}

// ─── PAYLOADS ─────────────────────────────────────────────────────────────────

export interface ToggleAccountTypePayload {
  isActive: boolean;
}

export interface UpdateAutresLabelPayload {
  label: string;
}

export interface SetAccountTypesPayload {
  types: AccountTypeValue[];
  autresLabel?: string;
}