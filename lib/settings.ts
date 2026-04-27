import fs from 'fs';
import path from 'path';
import { AppSettings } from './types';

const SETTINGS_PATH = path.join(process.cwd(), 'data', 'settings.json');

export const DEFAULT_SETTINGS: AppSettings = {
  makariosBrand: {
    name: 'Makarios Marketing',
    website: 'https://makariosmarketing.com/',
    phone: '+1 855-650-6126',
    email: 'seo@makariosmarketing.com',
    address: '505 Ellicott St, Buffalo, NY 14203',
  },
  defaultMapPackTemplates: [
    '{service} near me',
    '{service} {city}',
    'best {service} {city}',
    '{service} near {city}',
    '{service} {city} {state}',
    'top {service} {city}',
    '{service} services {city}',
    'affordable {service} {city}',
    '{service} reviews {city}',
    '{service} company {city}',
  ],
  revenueDefaults: {
    aov: 240,
    conversionRate: 0.028,
    topThreeCtr: 0.18,
    pageOneCtr: 0.05,
  },
  localDominatorApiEnabled: false,
};

export function readSettings(): AppSettings {
  if (!fs.existsSync(SETTINGS_PATH)) {
    return DEFAULT_SETTINGS;
  }
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function writeSettingsLocal(settings: AppSettings): void {
  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
}
