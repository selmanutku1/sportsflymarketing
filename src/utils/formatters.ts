import type {
  AthleteTier,
  BillingCycle,
  LabPlanMode,
  ProductModule,
  ProductPackage,
  SportsFlyModuleKey,
  TournamentPricingMode,
} from '../types/crm';

export const VAT_RATE = 20; // %20 standart yazılım KDV oranı
export const ANNUAL_PLAN_DISCOUNT_PERCENT = 20; // Yıllık planda %20 indirim
export const DISCOUNT_APPROVAL_THRESHOLD = 20; // %20 üzeri ek indirimde Yönetici ve Finans onayı
export const DEFAULT_VALIDITY_DAYS = 15; // 15 gün (3. ve 7. gün hatırlatmalı)
export const LAB_KARNE_PER_ATHLETE_PRICE = 499; // Sadece karne altyapısı (kişi başı)
export const LAB_ANALIZ_PER_ATHLETE_PRICE = 999; // Karne + analiz talebi (kişi başı)
export const SINGLE_TOURNAMENT_PRICE = 5000; // Sadece 1 turnuva için sabit tutar
export const NO_PACKAGE_ID = 'pkg-yok'; // Paket seçilmeden yalnızca ek modül teklifi

export function formatTRY(amount: number, showDecimals = true): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount);
}

export function formatNumberTR(value: number): string {
  return new Intl.NumberFormat('tr-TR').format(value);
}

export function formatDateTR(isoDate?: string): string {
  if (!isoDate) return '—';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateTimeTR(isoDate?: string): string {
  if (!isoDate) return '—';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function addDaysISO(baseIso: string, days: number): string {
  const date = new Date(baseIso);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA).getTime();
  const b = new Date(isoB).getTime();
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

export function daysSince(isoDate: string, nowIso = '2026-11-18T10:00:00.000Z'): number {
  const then = new Date(isoDate).getTime();
  const now = new Date(nowIso).getTime();
  return Math.max(0, Math.floor((now - then) / (1000 * 60 * 60 * 24)));
}

export function isDateOverdue(isoDate: string, nowIso = '2026-11-18T10:00:00.000Z'): boolean {
  const due = new Date(isoDate);
  const now = new Date(nowIso);
  due.setHours(23, 59, 59, 999);
  return due.getTime() < now.getTime();
}

export function isDateWithinDays(
  isoDate: string,
  days: number,
  nowIso = '2026-11-18T10:00:00.000Z'
): boolean {
  const target = new Date(isoDate).getTime();
  const now = new Date(nowIso).getTime();
  const limit = now + days * 24 * 60 * 60 * 1000;
  return target >= now - 24 * 60 * 60 * 1000 && target <= limit;
}

export function resolveAthleteTier(athleteCount: number, tiers: AthleteTier[]): AthleteTier {
  const found = tiers.find(
    (t) => athleteCount >= t.minAthletes && (t.maxAthletes === null || athleteCount <= t.maxAthletes)
  );
  return found ?? tiers[0];
}

export interface QuoteCalculationResult {
  billingCycle: BillingCycle;
  tier: AthleteTier;
  monthlyListAmount: number; // İndirimsiz aylık tekrarlayan tutar (paket + kapasite + aylık ek modüller)
  monthlyDiscountedAmount: number;
  annualListTotal: number;
  annualPlanDiscountPercent: number;
  annualPlanSavingsAmount: number;
  prepaidEnabled: boolean;
  prepaidDiscountPercent: number;
  prepaidDiscountAmount: number;
  simulatedPrepaidExtraPercent: number;
  simulatedPrepaidDiscountAmount: number;
  annualPrepaidAmount: number; // Yıllık peşin net tutar (KDV hariç)
  annualPrepaidWithVat: number; // Yıllık peşin toplam (KDV dahil)
  annualPrepaidEffectiveDiscountPercent: number;
  monthlyAfterAllDiscounts: number;
  packageBaseAmount: number;
  tierAdjustmentAmount: number;
  recurringAddonsAmount: number;
  labSelected: boolean;
  labMode: LabPlanMode;
  labAthleteCount: number;
  labUnitPrice: number;
  labAmount: number;
  tournamentSelected: boolean;
  tournamentMode: TournamentPricingMode;
  tournamentAmount: number;
  addonModulesAmount: number;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  effectiveTotalDiscountPercent: number;
  netTotal: number;
  vatRate: number;
  vatAmount: number;
  grandTotal: number;
  requiresDualApproval: boolean;
}

export function calculateQuotePricing(params: {
  pkg?: ProductPackage;
  selectedModules: SportsFlyModuleKey[];
  allModules: ProductModule[];
  athleteCount: number;
  tiers: AthleteTier[];
  discountPercent: number;
  billingCycle?: BillingCycle;
  customMonthlyPrice?: number;
  prepaidEnabled?: boolean;
  prepaidDiscountPercent?: number;
  labMode?: LabPlanMode;
  labAthleteCount?: number;
  tournamentMode?: TournamentPricingMode;
}): QuoteCalculationResult {
  const {
    pkg,
    selectedModules,
    allModules,
    athleteCount,
    tiers,
    discountPercent,
    billingCycle = 'yillik',
    customMonthlyPrice,
    prepaidEnabled = false,
    prepaidDiscountPercent = 10,
    labMode = 'karne',
    labAthleteCount,
    tournamentMode = 'monthly',
  } = params;

  const tier = resolveAthleteTier(athleteCount, tiers);
  const isYearly = billingCycle === 'yillik';
  const annualPlanDiscountPercent = isYearly ? ANNUAL_PLAN_DISCOUNT_PERCENT : 0;
  const includedModules = pkg?.includedModules ?? [];

  // Seçili paket aylık liste ve yıllık (%20 indirimli) aylık karşılığı (paket yoksa 0)
  const baseMonthlyList = !pkg
    ? 0
    : pkg.isCustomCorporate && customMonthlyPrice && customMonthlyPrice > 0
      ? Math.round(customMonthlyPrice)
      : pkg.monthlyPrice;
  const baseYearlyMonthly = !pkg
    ? 0
    : pkg.isCustomCorporate && customMonthlyPrice && customMonthlyPrice > 0
      ? Math.round(customMonthlyPrice * (1 - ANNUAL_PLAN_DISCOUNT_PERCENT / 100))
      : pkg.yearlyMonthlyPrice;

  // Paket kapasitesinin (örn. 100 veya 350 sporcu) üstüne çıkıldığında kapasite farkı uygulanır
  let extraCapacityFactor = 0;
  if (pkg && pkg.maxIncludedAthletes !== null && athleteCount > pkg.maxIncludedAthletes) {
    const excessRatio = (athleteCount - pkg.maxIncludedAthletes) / Math.max(100, pkg.maxIncludedAthletes);
    extraCapacityFactor = Math.min(1.5, Math.round(excessRatio * 35) / 100);
  }

  const tierMonthlyList = Math.round(baseMonthlyList * extraCapacityFactor);
  const tierMonthlyYearly = Math.round(baseYearlyMonthly * extraCapacityFactor);

  // Sporcu başı SportsFly Lab (499 TL karne / 999 TL karne + analiz)
  const labSelected =
    !includedModules.includes('SportsFlyLab') && selectedModules.includes('SportsFlyLab');
  const effectiveLabAthletes = Math.max(1, labAthleteCount ?? athleteCount);
  const labUnitPrice =
    labMode === 'analiz' ? LAB_ANALIZ_PER_ATHLETE_PRICE : LAB_KARNE_PER_ATHLETE_PRICE;
  const labAmount = labSelected ? effectiveLabAthletes * labUnitPrice : 0;

  // Turnuva & Fikstür (+399 TL/ay veya Tek Turnuva 5.000 TL)
  const tournamentSelected =
    !includedModules.includes('TurnuvaFikstur') && selectedModules.includes('TurnuvaFikstur');
  const tournamentSingleSelected = tournamentSelected && tournamentMode === 'single';

  // Aylık tekrarlayan ek modüller (SportsFlyLab ve tek turnuva hariç)
  const extraRecurringKeys = selectedModules.filter((k) => {
    if (includedModules.includes(k)) return false;
    if (k === 'SportsFlyLab') return false;
    if (k === 'TurnuvaFikstur' && tournamentSingleSelected) return false;
    return true;
  });

  const addonMonthlyList = extraRecurringKeys.reduce((sum, key) => {
    const mod = allModules.find((m) => m.key === key);
    return sum + (mod ? mod.monthlyAddonPrice : 0);
  }, 0);
  const addonMonthlyYearly = extraRecurringKeys.reduce((sum, key) => {
    const mod = allModules.find((m) => m.key === key);
    return sum + (mod ? Math.round(mod.monthlyAddonPrice * (1 - ANNUAL_PLAN_DISCOUNT_PERCENT / 100)) : 0);
  }, 0);

  // Aylık tekrarlayan toplam (liste ve yıllık indirimli aylık)
  const monthlyListAmount = baseMonthlyList + tierMonthlyList + addonMonthlyList;
  const monthlyDiscountedAmount = isYearly
    ? baseYearlyMonthly + tierMonthlyYearly + addonMonthlyYearly
    : monthlyListAmount;

  // Sabit / sporcu başı kalemler (SportsFly Lab + Tek Turnuva)
  const fixedOneTimeAmount = labAmount + (tournamentSingleSelected ? SINGLE_TOURNAMENT_PRICE : 0);

  // 12 Aylık Karşılaştırma ve Yıllık Peşin baz tutarlar
  const annualListTotal = monthlyListAmount * 12 + fixedOneTimeAmount;
  const annualRecurringBase =
    (baseYearlyMonthly + tierMonthlyYearly + addonMonthlyYearly) * 12;
  const annualPrepaidBase = annualRecurringBase + fixedOneTimeAmount;
  const annualPlanSavingsAmount = isYearly ? Math.max(0, annualListTotal - annualPrepaidBase) : 0;

  // Seçilen faturalama dönemine göre kalemler
  const periodMonths = isYearly ? 12 : 1;
  const packageBaseAmount = (isYearly ? baseYearlyMonthly : baseMonthlyList) * periodMonths;
  const tierAdjustmentAmount = (isYearly ? tierMonthlyYearly : tierMonthlyList) * periodMonths;
  const recurringAddonsAmount = (isYearly ? addonMonthlyYearly : addonMonthlyList) * periodMonths;

  const tournamentMod = allModules.find((m) => m.key === 'TurnuvaFikstur');
  const tournamentMonthlyVal = tournamentMod ? tournamentMod.monthlyAddonPrice : 399;
  const tournamentAmount = !tournamentSelected
    ? 0
    : tournamentSingleSelected
      ? SINGLE_TOURNAMENT_PRICE
      : (isYearly ? Math.round(tournamentMonthlyVal * 0.8) : tournamentMonthlyVal) * periodMonths;

  const addonModulesAmount = recurringAddonsAmount + fixedOneTimeAmount;

  const subtotal = packageBaseAmount + tierAdjustmentAmount + addonModulesAmount;
  const safeDiscount = Math.min(60, Math.max(0, discountPercent));
  const discountAmount = Math.round((subtotal * safeDiscount) / 100);
  const afterCorporateTotal = subtotal - discountAmount;

  // Yıllık peşin ekstra indirim yüzdesi (ör. %10)
  const safeSimPrepaidPercent = Math.min(30, Math.max(0, prepaidDiscountPercent));
  const activePrepaid = isYearly && prepaidEnabled;
  const activePrepaidPercent = activePrepaid ? safeSimPrepaidPercent : 0;
  const prepaidDiscountAmount = activePrepaid
    ? Math.round((afterCorporateTotal * activePrepaidPercent) / 100)
    : 0;

  const netTotal = afterCorporateTotal - prepaidDiscountAmount;
  const vatAmount = Math.round((netTotal * VAT_RATE) / 100);
  const grandTotal = netTotal + vatAmount;

  // Yıllık peşin simülasyonu
  const annualAfterCorporate = Math.round(annualPrepaidBase * (1 - safeDiscount / 100));
  const simulatedPrepaidDiscountAmount = Math.round(
    (annualAfterCorporate * safeSimPrepaidPercent) / 100
  );
  const annualPrepaidNet = activePrepaid
    ? netTotal
    : annualAfterCorporate - simulatedPrepaidDiscountAmount;
  const annualPrepaidWithVat = activePrepaid
    ? grandTotal
    : Math.round(annualPrepaidNet * (1 + VAT_RATE / 100));

  const annualPrepaidEffectiveDiscountPercent =
    annualListTotal > 0
      ? Math.max(
          0,
          Math.min(99, Math.round(((annualListTotal - annualPrepaidNet) / annualListTotal) * 100))
        )
      : 0;

  // Liste fiyatına göre seçili plandaki toplam efektif indirim yüzdesi
  const fullListPeriod = isYearly ? annualListTotal : monthlyListAmount + fixedOneTimeAmount;
  const effectiveTotalDiscountPercent =
    fullListPeriod > 0
      ? Math.max(
          0,
          Math.min(99, Math.round(((fullListPeriod - netTotal) / fullListPeriod) * 100))
        )
      : 0;

  const monthlyAfterAllDiscounts = isYearly ? Math.round(netTotal / 12) : netTotal;

  return {
    billingCycle,
    tier,
    monthlyListAmount,
    monthlyDiscountedAmount,
    annualListTotal,
    annualPlanDiscountPercent,
    annualPlanSavingsAmount,
    prepaidEnabled: activePrepaid,
    prepaidDiscountPercent: activePrepaidPercent,
    prepaidDiscountAmount,
    simulatedPrepaidExtraPercent: safeSimPrepaidPercent,
    simulatedPrepaidDiscountAmount,
    annualPrepaidAmount: annualPrepaidNet,
    annualPrepaidWithVat,
    annualPrepaidEffectiveDiscountPercent,
    monthlyAfterAllDiscounts,
    packageBaseAmount,
    tierAdjustmentAmount,
    recurringAddonsAmount,
    labSelected,
    labMode,
    labAthleteCount: effectiveLabAthletes,
    labUnitPrice,
    labAmount,
    tournamentSelected,
    tournamentMode,
    tournamentAmount,
    addonModulesAmount,
    subtotal,
    discountPercent: safeDiscount,
    discountAmount,
    effectiveTotalDiscountPercent,
    netTotal,
    vatRate: VAT_RATE,
    vatAmount,
    grandTotal,
    requiresDualApproval: safeDiscount > DISCOUNT_APPROVAL_THRESHOLD,
  };
}
