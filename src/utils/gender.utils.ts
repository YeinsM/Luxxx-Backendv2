export type CanonicalAdvertisementGender = 'woman' | 'man' | 'couple' | 'trans';

const GENDER_ALIASES: Record<string, CanonicalAdvertisementGender> = {
  woman: 'woman',
  women: 'woman',
  mujer: 'woman',
  female: 'woman',
  man: 'man',
  men: 'man',
  hombre: 'man',
  male: 'man',
  couple: 'couple',
  couples: 'couple',
  pareja: 'couple',
  parejas: 'couple',
  trans: 'trans',
  transexual: 'trans',
  transsexual: 'trans',
  transgender: 'trans',
};

export function normalizeAdvertisementGender(value?: string | null): CanonicalAdvertisementGender | undefined {
  if (!value) return undefined;

  const normalized = value.trim().toLowerCase();
  return GENDER_ALIASES[normalized];
}
