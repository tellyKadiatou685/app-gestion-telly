// ─── TYPES DE BASE ────────────────────────────────────────────────────────────

import { EntryAccess } from "@/services/AccountTypeService";

/** Types fixes (enum Prisma) */
export type FixedAccountTypeValue =
  | 'LIQUIDE'
  | 'ORANGE_MONEY'
  | 'WAVE'
  | 'UV_MASTER'
  | 'FREE_MONEY'
  | 'WESTERN_UNION'
  | 'RIA'
  | 'MONEYGRAM'
  | 'WESTERN_2'   // ← NOUVEAU
  | 'RIA_2';      // ← NOUVEAU

export type AccountTypeValue = FixedAccountTypeValue | `AUTRES_${number}` | string;

// ─── MODÈLES ──────────────────────────────────────────────────────────────────

export interface AccountTypeItem {
  value: AccountTypeValue;
  label: string;
  isActive: boolean;
  canCustomizeLabel: boolean;
  isCustomSlot: boolean;
  entryAccess: EntryAccess;
  isFeatured: boolean;
}

export interface AccountTypeOption {
  value: AccountTypeValue;
  label: string;
}

export interface CustomSlot {
  id: string;
  label: string;
}

// ─── CONFIG GLOBALE ───────────────────────────────────────────────────────────

export interface AccountTypesConfig {
  allTypes: AccountTypeItem[];
  activeTypes: AccountTypeValue[];
  activeOptions: AccountTypeOption[];
  customSlots: CustomSlot[];
  entryAccess: Record<string, EntryAccess>;
  featuredType: string;
}

// ─── RÉPONSES API ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export type GetAccountTypesResponse = ApiResponse<AccountTypesConfig>;

export type ToggleAccountTypeResponse = ApiResponse<{
  accountType: AccountTypeValue;
  isActive: boolean;
  activeTypes: AccountTypeValue[];
}>;

export type AddCustomSlotResponse = ApiResponse<{
  slot: CustomSlot;
  activeTypes: AccountTypeValue[];
}>;

export type RenameCustomSlotResponse = ApiResponse<{
  slot: CustomSlot;
}>;

export type RemoveCustomSlotResponse = ApiResponse<{
  slotId: string;
  removedLabel: string;
  activeTypes: AccountTypeValue[];
}>;

export type SetAccountTypesResponse = ApiResponse<{
  activeTypes: AccountTypeValue[];
}>;

// ─── PAYLOADS ─────────────────────────────────────────────────────────────────

export interface ToggleAccountTypePayload {
  isActive: boolean;
}

export interface AddCustomSlotPayload {
  label: string;
}

export interface RenameCustomSlotPayload {
  label: string;
}

export interface SetAccountTypesPayload {
  types: AccountTypeValue[];
}