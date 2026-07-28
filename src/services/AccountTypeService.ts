import api from '@/config';
import type {
  AccountTypesConfig,
  AccountTypeValue,
  AccountTypeOption,
  CustomSlot,
  GetAccountTypesResponse,
  ToggleAccountTypeResponse,
  AddCustomSlotResponse,
  RenameCustomSlotResponse,
  RemoveCustomSlotResponse,
  SetAccountTypesResponse,
  SetAccountTypesPayload,
} from '@/types/accountType.types';

const BASE = '/accountype';

/** Labels statiques pour les types fixes (fallback sans API) */
const FIXED_LABELS: Record<string, string> = {
  LIQUIDE:       'Liquide',
  ORANGE_MONEY:  'Orange Money',
  WAVE:          'Wave',
  UV_MASTER:     'UV Master',
  FREE_MONEY:    'Free Money',
  WESTERN_UNION: 'Western Union',
  RIA:           'Ria',
  MONEYGRAM:     'MoneyGram',
  WESTERN_2:     'Western Union 2', // ← NOUVEAU
  RIA_2:         'Ria 2',           // ← NOUVEAU
};

const FIXED_TYPES = Object.keys(FIXED_LABELS) as AccountTypeValue[];

/** Valeurs possibles pour l'accès saisie superviseur */
export type EntryAccess = 'both' | 'debut_only' | 'fin_only';

export const ENTRY_ACCESS_LABELS: Record<EntryAccess, string> = {
  both:       'Début + Fin',
  debut_only: 'Début uniquement',
  fin_only:   'Fin uniquement',
};

const AccountTypeService = {

  // ─── LECTURE ────────────────────────────────────────────────────────────────

  async getConfig(): Promise<AccountTypesConfig> {
    const res = await api.get<GetAccountTypesResponse>(BASE);
    return res.data.data;
  },

  async getActiveOptions(): Promise<AccountTypeOption[]> {
    const config = await AccountTypeService.getConfig();
    return config.activeOptions;
  },

  // ─── TOGGLE ACTIF / INACTIF ──────────────────────────────────────────────────

  async toggle(type: AccountTypeValue, isActive: boolean) {
    const res = await api.patch<ToggleAccountTypeResponse>(
      `${BASE}/${type}/toggle`,
      { isActive }
    );
    return res.data.data;
  },

  // ─── ACCÈS SAISIE SUPERVISEUR ────────────────────────────────────────────────

  async setEntryAccess(type: AccountTypeValue, access: EntryAccess) {
    const res = await api.patch(
      `${BASE}/${type}/entry-access`,
      { access }
    );
    return res.data.data;
  },

  // ─── SLOTS CUSTOM (AUTRES_*) ─────────────────────────────────────────────────

  async addCustomSlot(label: string) {
    const res = await api.post<AddCustomSlotResponse>(
      `${BASE}/custom`,
      { label }
    );
    return res.data.data;
  },

  async renameCustomSlot(slotId: string, label: string) {
    const res = await api.patch<RenameCustomSlotResponse>(
      `${BASE}/custom/${slotId}`,
      { label }
    );
    return res.data.data;
  },

  async removeCustomSlot(slotId: string) {
    const res = await api.delete<RemoveCustomSlotResponse>(
      `${BASE}/custom/${slotId}`
    );
    return res.data.data;
  },

  // ─── RECONFIGURATION GLOBALE ─────────────────────────────────────────────────

  async setActiveTypes(payload: SetAccountTypesPayload) {
    const res = await api.post<SetAccountTypesResponse>(BASE, payload);
    return res.data.data;
  },

  // ─── TYPE VEDETTE ─────────────────────────────────────────────────────────────

  async setFeaturedType(type: AccountTypeValue): Promise<{ featuredType: string; label: string }> {
    const res = await api.patch(`${BASE}/${type}/featured`);
    return res.data.data;
  },

  // ─── HELPERS LOCAUX (sans appel API) ─────────────────────────────────────────

  getStaticLabel(type: AccountTypeValue): string {
    return FIXED_LABELS[type] ?? type;
  },

  isCustomSlot(type: AccountTypeValue): boolean {
    return String(type).startsWith('AUTRES_');
  },

  getFixedTypes(): AccountTypeValue[] {
    return [...FIXED_TYPES];
  },

  resolveLabel(type: AccountTypeValue, customSlots: CustomSlot[]): string {
    if (AccountTypeService.isCustomSlot(type)) {
      return customSlots.find(s => s.id === type)?.label ?? type;
    }
    return FIXED_LABELS[type] ?? type;
  },

  getEntryAccessLabel(access: EntryAccess): string {
    return ENTRY_ACCESS_LABELS[access] ?? access;
  },
};

export default AccountTypeService;