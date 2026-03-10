// src/services/AccountTypeService.ts
import api from '@/config';
import type {
  AccountTypesConfig,
  AccountTypeValue,
  GetAccountTypesResponse,
  ToggleAccountTypeResponse,
  UpdateAutresLabelResponse,
  SetAccountTypesResponse,
  SetAccountTypesPayload,
} from '@/types/accountType.types';

const BASE = '/accountype';

const AccountTypeService = {

  // ─── LECTURE ────────────────────────────────────────────────────────────────

  /**
   * Récupère toute la config (liste complète + options actives + autresLabel)
   * Utilisé par : page admin gestion des types ET formulaire transaction
   */
  async getConfig(): Promise<AccountTypesConfig> {
    const res = await api.get<GetAccountTypesResponse>(BASE);
    return res.data.data;
  },

  /**
   * Retourne uniquement les options actives pour un <select>
   * Raccourci pratique pour les formulaires
   */
  async getActiveOptions() {
    const config = await AccountTypeService.getConfig();
    return config.activeOptions;
  },

  // ─── TOGGLE ─────────────────────────────────────────────────────────────────

  /**
   * Active ou désactive un type de compte
   * PATCH /api/accountype/:type/toggle
   */
  async toggle(type: AccountTypeValue, isActive: boolean) {
    const res = await api.patch<ToggleAccountTypeResponse>(
      `${BASE}/${type}/toggle`,
      { isActive }
    );
    return res.data.data;
  },

  // ─── LABEL AUTRES ────────────────────────────────────────────────────────────

  /**
   * Met à jour le nom personnalisé du type "AUTRES"
   * PATCH /api/accountype/AUTRES/label
   */
  async updateAutresLabel(label: string) {
    const res = await api.patch<UpdateAutresLabelResponse>(
      `${BASE}/AUTRES/label`,
      { label }
    );
    return res.data.data;
  },

  // ─── RECONFIGURATION COMPLÈTE ────────────────────────────────────────────────

  /**
   * Remplace toute la liste active en une fois
   * POST /api/accountype
   */
  async setActiveTypes(payload: SetAccountTypesPayload) {
    const res = await api.post<SetAccountTypesResponse>(BASE, payload);
    return res.data.data;
  },

  // ─── HELPERS LOCAUX ──────────────────────────────────────────────────────────

  /** Label statique sans appel API (fallback) */
  getStaticLabel(type: AccountTypeValue): string {
    const labels: Record<AccountTypeValue, string> = {
      LIQUIDE:       'Liquide',
      ORANGE_MONEY:  'Orange Money',
      WAVE:          'Wave',
      UV_MASTER:     'UV Master',
      FREE_MONEY:    'Free Money',
      WESTERN_UNION: 'Western Union',
      RIA:           'Ria',
      MONEYGRAM:     'MoneyGram',
      AUTRES:        'Autres',
    };
    return labels[type] ?? type;
  },

  /** Tous les types possibles (sans appel API) */
  getAllTypes(): AccountTypeValue[] {
    return [
      'LIQUIDE', 'ORANGE_MONEY', 'WAVE', 'UV_MASTER',
      'FREE_MONEY', 'WESTERN_UNION', 'RIA', 'MONEYGRAM', 'AUTRES'
    ];
  },
};

export default AccountTypeService;