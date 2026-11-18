import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  History,
  Printer,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type {
  AthleteTier,
  BillingCycle,
  Club,
  Contact,
  LabPlanMode,
  ProductModule,
  ProductPackage,
  Quote,
  RolePermission,
  SportsFlyModuleKey,
  TournamentPricingMode,
  User,
} from '../types/crm';
import {
  ANNUAL_PLAN_DISCOUNT_PERCENT,
  DEFAULT_VALIDITY_DAYS,
  DISCOUNT_APPROVAL_THRESHOLD,
  LAB_ANALIZ_PER_ATHLETE_PRICE,
  LAB_KARNE_PER_ATHLETE_PRICE,
  NO_PACKAGE_ID,
  SINGLE_TOURNAMENT_PRICE,
  addDaysISO,
  calculateQuotePricing,
  formatDateTR,
  formatDateTimeTR,
  formatNumberTR,
  formatTRY,
} from '../utils/formatters';
import { TODAY_ISO } from '../data/mockData';
import { StatusText } from './ui';

interface QuoteBuilderViewProps {
  existingQuote?: Quote;
  clubs: Club[];
  contacts: Contact[];
  packages: ProductPackage[];
  modules: ProductModule[];
  tiers: AthleteTier[];
  users: User[];
  currentUser: User;
  permission: RolePermission;
  onBack: () => void;
  onSaveQuote: (payload: {
    quoteId?: string;
    clubId: string;
    contactId: string;
    requestId?: string;
    templateName: Quote['templateName'];
    billingCycle: BillingCycle;
    packageId: string;
    selectedModules: SportsFlyModuleKey[];
    athleteCount: number;
    customMonthlyPrice?: number;
    discountPercent: number;
    prepaidEnabled: boolean;
    prepaidDiscountPercent: number;
    labMode: LabPlanMode;
    labAthleteCount: number;
    tournamentMode: TournamentPricingMode;
    validityDays: number;
    reminderDay3Enabled: boolean;
    reminderDay7Enabled: boolean;
    termsNote: string;
    changeNote: string;
    action: 'draft' | 'send' | 'request_approval';
  }) => Quote;
  onApproveQuote: (quoteId: string, kind: 'manager' | 'finance') => void;
  onOpenDigitalApproval: (quoteId: string) => void;
  onOpenProposalPreview: (quoteId: string) => void;
}

export function QuoteBuilderView({
  existingQuote,
  clubs,
  contacts,
  packages,
  modules,
  tiers,
  users,
  currentUser,
  permission,
  onBack,
  onSaveQuote,
  onApproveQuote,
  onOpenDigitalApproval,
  onOpenProposalPreview,
}: QuoteBuilderViewProps) {
  const latestVersion = existingQuote
    ? existingQuote.versions[existingQuote.versions.length - 1]
    : undefined;

  const defaultClubId = existingQuote?.clubId ?? clubs[0]?.id ?? '';
  const initialClub = clubs.find((c) => c.id === defaultClubId);
  const initialContact =
    contacts.find((ct) => ct.id === existingQuote?.contactId) ??
    contacts.find((ct) => ct.clubId === defaultClubId);

  const [clubId, setClubId] = useState(defaultClubId);
  const [contactId, setContactId] = useState(initialContact?.id ?? '');
  const [templateName, setTemplateName] = useState<Quote['templateName']>(
    existingQuote?.templateName ?? 'Kulübe Özel Dijital Yönetim Sistemi Teklifi'
  );
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(
    latestVersion?.billingCycle ?? 'yillik'
  );
  const initialPackageId = latestVersion?.packageId ?? packages[1]?.id ?? packages[0].id;
  const [packageId, setPackageId] = useState<string>(initialPackageId);
  const [customMonthlyPrice, setCustomMonthlyPrice] = useState<number>(
    latestVersion?.customMonthlyPrice ?? packages.find((p) => p.isCustomCorporate)?.monthlyPrice ?? 5999
  );
  const defaultPkg =
    initialPackageId === NO_PACKAGE_ID
      ? undefined
      : packages.find((p) => p.id === initialPackageId);
  const defaultIncluded = defaultPkg?.includedModules ?? [];
  const initialRawModules = latestVersion?.selectedModules ?? defaultIncluded;
  const [selectedModules, setSelectedModules] = useState<SportsFlyModuleKey[]>(
    initialRawModules.filter(
      (k) => defaultIncluded.includes(k) || modules.find((m) => m.key === k)?.featured
    )
  );
  const [athleteCount, setAthleteCount] = useState<number>(
    latestVersion?.athleteCount ?? initialClub?.estimatedAthletes ?? 250
  );
  const [discountPercent, setDiscountPercent] = useState<number>(
    latestVersion?.discountPercent ?? 0
  );
  const [prepaidEnabled, setPrepaidEnabled] = useState<boolean>(
    latestVersion ? Boolean(latestVersion.prepaidEnabled) : true
  );
  const [prepaidDiscountPercent, setPrepaidDiscountPercent] = useState<number>(
    latestVersion?.prepaidDiscountPercent ?? 10
  );
  const [labMode, setLabMode] = useState<LabPlanMode>(latestVersion?.labMode ?? 'karne');
  const [labAthleteCount, setLabAthleteCount] = useState<number>(
    latestVersion?.labAthleteCount ??
      latestVersion?.athleteCount ??
      initialClub?.estimatedAthletes ??
      250
  );
  const [tournamentMode, setTournamentMode] = useState<TournamentPricingMode>(
    latestVersion?.tournamentMode ?? 'monthly'
  );
  const [validityDays, setValidityDays] = useState<number>(
    existingQuote?.validityDays ?? DEFAULT_VALIDITY_DAYS
  );
  const [reminderDay3Enabled, setReminderDay3Enabled] = useState<boolean>(
    existingQuote?.reminderDay3Enabled ?? true
  );
  const [reminderDay7Enabled, setReminderDay7Enabled] = useState<boolean>(
    existingQuote?.reminderDay7Enabled ?? true
  );
  const [termsNote, setTermsNote] = useState<string>(
    latestVersion?.termsNote ??
      'Yıllık peşin planda %20 indirim ve ücretsiz başlangıç avantajı geçerlidir. İlk kurulum ve yönetici eğitimi dahildir.'
  );
  const [changeNote, setChangeNote] = useState<string>(
    existingQuote ? 'Fiyat ve kapsam güncellemesi' : 'İlk teklif sürümü (v1)'
  );
  const [showVersions, setShowVersions] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const activeClub = clubs.find((c) => c.id === clubId);
  const clubContacts = contacts.filter((c) => c.clubId === clubId);
  const activeContact =
    contacts.find((c) => c.id === contactId) ?? clubContacts[0];
  const selectedPkg =
    packageId === NO_PACKAGE_ID ? undefined : packages.find((p) => p.id === packageId);
  const isStandaloneAddonOnly = !selectedPkg;

  const handleClubChange = (nextClubId: string) => {
    setClubId(nextClubId);
    const nextClub = clubs.find((c) => c.id === nextClubId);
    const nextContact = contacts.find((ct) => ct.clubId === nextClubId);
    setContactId(nextContact?.id ?? '');
    if (nextClub) {
      setAthleteCount(nextClub.estimatedAthletes);
      setLabAthleteCount(nextClub.estimatedAthletes);
    }
  };

  const handlePackageChange = (nextPkgId: string) => {
    setPackageId(nextPkgId);
    if (nextPkgId === NO_PACKAGE_ID) {
      setSelectedModules((prev) =>
        prev.filter((k) => modules.find((m) => m.key === k)?.featured)
      );
      return;
    }
    const pkg = packages.find((p) => p.id === nextPkgId);
    if (pkg) {
      setSelectedModules((prev) => {
        const featuredSelected = prev.filter((k) => modules.find((m) => m.key === k)?.featured);
        return Array.from(new Set([...pkg.includedModules, ...featuredSelected]));
      });
    }
  };

  const toggleModule = (key: SportsFlyModuleKey) => {
    if (selectedPkg?.includedModules.includes(key)) return;
    setSelectedModules((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const pricing = useMemo(
    () =>
      calculateQuotePricing({
        pkg: selectedPkg,
        selectedModules,
        allModules: modules,
        athleteCount: Math.max(1, athleteCount),
        tiers,
        discountPercent,
        billingCycle,
        customMonthlyPrice: selectedPkg?.isCustomCorporate ? customMonthlyPrice : undefined,
        prepaidEnabled,
        prepaidDiscountPercent,
        labMode,
        labAthleteCount,
        tournamentMode,
      }),
    [
      selectedPkg,
      selectedModules,
      modules,
      athleteCount,
      tiers,
      discountPercent,
      billingCycle,
      customMonthlyPrice,
      prepaidEnabled,
      prepaidDiscountPercent,
      labMode,
      labAthleteCount,
      tournamentMode,
    ]
  );

  const validUntilPreview = addDaysISO(TODAY_ISO, validityDays);
  const getUserName = (id: string) => users.find((u) => u.id === id)?.name ?? 'Sistem';

  const canSendDirectly =
    !pricing.requiresDualApproval ||
    (Boolean(existingQuote?.managerApproved) && Boolean(existingQuote?.financeApproved));

  const handleSave = (action: 'draft' | 'send' | 'request_approval') => {
    if (!clubId) return;
    if (isStandaloneAddonOnly && selectedModules.length === 0) return;
    onSaveQuote({
      quoteId: existingQuote?.id,
      clubId,
      contactId: activeContact?.id ?? '',
      requestId: existingQuote?.requestId,
      templateName,
      billingCycle,
      packageId: selectedPkg?.id ?? NO_PACKAGE_ID,
      selectedModules,
      athleteCount,
      customMonthlyPrice: selectedPkg?.isCustomCorporate ? customMonthlyPrice : undefined,
      discountPercent,
      prepaidEnabled: billingCycle === 'yillik' && prepaidEnabled,
      prepaidDiscountPercent,
      labMode,
      labAthleteCount,
      tournamentMode,
      validityDays,
      reminderDay3Enabled,
      reminderDay7Enabled,
      termsNote,
      changeNote,
      action,
    });
  };

  const copyApprovalUrl = () => {
    if (!existingQuote) return;
    const url = `${window.location.origin}/onay/${existingQuote.digitalApprovalToken}`;
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!permission.canViewPricingAndContracts) {
    return (
      <div className="p-8 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-center space-y-3">
        <ShieldCheck className="w-8 h-8 mx-auto text-[var(--status-warning)]" />
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Teklif Fiyatlandırma Yetkisi Kısıtlı
        </h2>
        <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
          Aktif rolünüz ({permission.label}) hassas fiyatlandırma ve indirim oluşturma ekranına erişim yetkisine sahip değildir.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-[8px] text-xs font-medium border border-[var(--border-hairline)] hover:bg-[var(--bg-subtle)]"
        >
          Geri Dön
        </button>
      </div>
    );
  }

  const featuredModules = modules.filter((m) => m.featured);

  return (
    <div className="space-y-5">
      {/* Üst Bağlam ve Eylemler */}
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-xs font-medium border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Tekliflere Dön</span>
          </button>
          <div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">
              {existingQuote
                ? `${existingQuote.quoteNumber} · Sürüm v${existingQuote.currentVersion}`
                : 'Yeni Teklif Oluştur (v1)'}
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              {activeClub?.name} · {activeContact?.fullName ?? 'Yetkili Seçilmedi'}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {existingQuote && (
            <>
              <button
                type="button"
                onClick={() => setShowVersions((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-xs font-medium border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <History className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Sürümler ({existingQuote.versions.length})</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenProposalPreview(existingQuote.id)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-xs font-medium bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]"
              >
                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Teklif Formu (PDF)</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenDigitalApproval(existingQuote.id)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-xs font-medium border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Müşteri Onay Sayfası</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-xs font-medium border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <Printer className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Yazdır</span>
          </button>
        </div>
      </div>

      {/* Sürüm Geçmişi Paneli */}
      {existingQuote && showVersions && (
        <div className="p-4 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-2.5 no-print">
          <h3 className="text-xs font-semibold text-[var(--text-primary)]">
            Teklif Sürüm Geçmişi ({existingQuote.quoteNumber})
          </h3>
          <div className="divide-y divide-[var(--border-hairline)]">
            {existingQuote.versions.map((ver) => (
              <div key={ver.version} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-semibold text-[var(--text-primary)]">v{ver.version}</span>
                  <span className="text-[var(--text-muted)] mx-2">·</span>
                  <span className="text-[var(--text-secondary)]">{ver.changeNote}</span>
                </div>
                <div className="text-[11px] text-[var(--text-muted)] tabular-nums">
                  {ver.billingCycle === 'yillik' ? 'Yıllık Peşin' : 'Aylık'} · {formatTRY(ver.grandTotal)} (Toplam %{ver.effectiveTotalDiscountPercent} indirim) · {getUserName(ver.createdById)} · {formatDateTimeTR(ver.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ana İki Sütun Düzenleyici */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Sol Form Alanı */}
        <div className="xl:col-span-8 space-y-5">
          {/* 1. Kulüp, Yetkili ve Şablon */}
          <section className="p-4 sm:p-5 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              1. Kulüp, Yetkili ve Teklif Şablonu
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="qb-club" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Spor Kulübü / Kurum
                </label>
                <select
                  id="qb-club"
                  value={clubId}
                  disabled={Boolean(existingQuote)}
                  onChange={(e) => handleClubChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)] disabled:opacity-70"
                >
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="qb-contact" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Kulüp Yetkilisi
                </label>
                <select
                  id="qb-contact"
                  value={activeContact?.id ?? ''}
                  onChange={(e) => setContactId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)]"
                >
                  {clubContacts.length === 0 ? (
                    <option value="">Kayıtlı yetkili yok</option>
                  ) : (
                    clubContacts.map((ct) => (
                      <option key={ct.id} value={ct.id}>
                        {ct.fullName} · {ct.roleTitle}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label htmlFor="qb-template" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Teklif Şablonu
                </label>
                <select
                  id="qb-template"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value as Quote['templateName'])}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)]"
                >
                  <option value="Kulübe Özel Dijital Yönetim Sistemi Teklifi">
                    Kulübe Özel Dijital Yönetim Sistemi Teklifi
                  </option>
                  <option value="Spor Okulu Sezonluk Teklifi">Spor Okulu Sezonluk Teklifi</option>
                  <option value="Federasyon & Kongre Paketi">Federasyon & Kongre Paketi</option>
                </select>
              </div>
            </div>
          </section>

          {/* 2. Ödeme Planı (Aylık / Yıllık %20 İndirim) & Paket Seçimi */}
          <section className="p-4 sm:p-5 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  2. Ödeme Dönemi, Paket ve Sporcu Kapasitesi
                </h2>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Yıllık ödeme planında tüm paket ve modüllerde otomatik %{ANNUAL_PLAN_DISCOUNT_PERCENT} indirim uygulanır.
                </p>
              </div>

              {/* Aylık Ödeme / Yıllık %20 İndirim Seçici */}
              <div className="inline-flex items-center p-1 rounded-[10px] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setBillingCycle('aylik')}
                  className={`px-3.5 py-2 rounded-[8px] text-xs font-semibold transition-colors whitespace-nowrap ${
                    billingCycle === 'aylik'
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Aylık Ödeme
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('yillik')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-xs font-semibold transition-colors whitespace-nowrap ${
                    billingCycle === 'yillik'
                      ? 'bg-[var(--accent)] text-white shadow-[var(--shadow-sm)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span>Yıllık</span>
                  <span className="px-1.5 py-0.5 rounded-[4px] bg-[var(--brand-lime)] text-[var(--brand-navy)] text-[10px] font-bold">
                    %{ANNUAL_PLAN_DISCOUNT_PERCENT} İndirim
                  </span>
                </button>
              </div>
            </div>

            {/* Yıllık Plan Avantaj Şeridi */}
            <div
              className={`px-3.5 py-2 rounded-[8px] border text-xs flex flex-wrap items-center justify-between gap-2 ${
                billingCycle === 'yillik'
                  ? 'border-[var(--status-success)]/40 bg-[var(--status-success-bg)] text-[var(--status-success)]'
                  : 'border-[var(--border-hairline)] bg-[var(--bg-subtle)]/60 text-[var(--text-secondary)]'
              }`}
            >
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                {billingCycle === 'yillik'
                  ? `Yıllık planda Ücretsiz Başla ve %${ANNUAL_PLAN_DISCOUNT_PERCENT} indirim avantajı aktiftir (12 aylık peşin fiyatlandırma).`
                  : 'Ücretsiz Başla ve %20 indirim avantajı yalnızca Yıllık Planda geçerlidir.'}
              </span>
              {billingCycle === 'yillik' && pricing.annualPlanSavingsAmount > 0 && (
                <span className="font-bold tabular-nums">
                  Yıllık Plan Kazancı: {formatTRY(pricing.annualPlanSavingsAmount, false)}
                </span>
              )}
            </div>

            {/* Sporcu Sayısı & Kurumsal Özel Fiyat */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div>
                <label htmlFor="qb-athletes" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Tahmini Aktif Sporcu Sayısı
                </label>
                <input
                  id="qb-athletes"
                  type="number"
                  min={1}
                  max={25000}
                  value={athleteCount}
                  onChange={(e) => setAthleteCount(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)] tabular-nums"
                />
                <div className="mt-1 text-[11px] text-[var(--text-muted)]">
                  Ölçek kademesi: <span className="font-medium text-[var(--text-primary)]">{pricing.tier.label}</span>
                  {selectedPkg ? (
                    selectedPkg.maxIncludedAthletes !== null && athleteCount > selectedPkg.maxIncludedAthletes ? (
                      ` (Paket içi ${selectedPkg.maxIncludedAthletes} sporcu üstü kapasite farkı dahil)`
                    ) : selectedPkg.maxIncludedAthletes !== null ? (
                      ` (${selectedPkg.maxIncludedAthletes} sporcu paket limitine dahil)`
                    ) : (
                      ' (Sınırsız sporcu & şube)'
                    )
                  ) : (
                    ' (Paketsiz · Yalnızca seçili ek modüller fiyatlandırılır)'
                  )}
                </div>
              </div>

              {selectedPkg?.isCustomCorporate ? (
                <div>
                  <label htmlFor="qb-custom-price" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                    Kurumsal Özel Aylık Liste Fiyatı (₺ / ay, KDV hariç)
                  </label>
                  <input
                    id="qb-custom-price"
                    type="number"
                    min={1000}
                    step={100}
                    value={customMonthlyPrice}
                    onChange={(e) => setCustomMonthlyPrice(Math.max(1000, Number(e.target.value) || 5999))}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[var(--accent)] bg-[var(--bg-canvas)] text-[var(--text-primary)] font-semibold tabular-nums"
                  />
                  <div className="mt-1 text-[11px] text-[var(--text-muted)] tabular-nums">
                    Yıllık %20 indirimli: {formatTRY(Math.round(customMonthlyPrice * 0.8), false)}/ay · Yıllık peşin:{' '}
                    {formatTRY(Math.round(customMonthlyPrice * 0.8) * 12, false)}
                  </div>
                </div>
              ) : selectedPkg ? (
                <div className="p-3 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[11px] text-[var(--text-secondary)] flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-[var(--text-primary)]">
                      Seçili Paket: {selectedPkg.name}
                    </div>
                    <div className="mt-0.5 tabular-nums">
                      Aylık liste: {formatTRY(selectedPkg.monthlyPrice, false)}/ay · Yıllık plan:{' '}
                      <span className="font-semibold text-[var(--accent)]">
                        {formatTRY(selectedPkg.yearlyMonthlyPrice, false)}/ay
                      </span>{' '}
                      (Peşin: {formatTRY(selectedPkg.baseAnnualPrice, false)}/yıl)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePackageChange(NO_PACKAGE_ID)}
                    className="px-2.5 py-1.5 rounded-[7px] border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[11px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] shrink-0"
                  >
                    Paket Almadan Devam Et
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-[8px] border border-[var(--accent)] bg-[var(--accent-soft)]/30 text-[11px] text-[var(--text-secondary)] flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-[var(--text-primary)]">
                      Paketsiz Mod · Sadece Ek Modüller
                    </div>
                    <div className="mt-0.5">
                      Ana paket seçilmedi; Adım 3&apos;ten yalnızca istediğiniz ek modülleri ekleyebilirsiniz.
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-[4px] bg-[var(--brand-navy)] text-[var(--brand-lime)] text-[10px] font-bold shrink-0">
                    AKTİF
                  </span>
                </div>
              )}
            </div>

            {/* Paket Opsiyonel Seçim Çubuğu */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-[8px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-canvas)] text-xs">
              <span className="text-[var(--text-secondary)]">
                {isStandaloneAddonOnly
                  ? 'Ana paket zorunluluğu kapalı: Dilerseniz aşağıdan bir ana paket seçebilir veya sadece ek modül ile devam edebilirsiniz.'
                  : 'Paket almak zorunlu değildir — kulüp yalnızca SportsFly Lab, Turnuva veya tek bir modül istiyorsa paketsiz devam edebilirsiniz.'}
              </span>
              <button
                type="button"
                onClick={() =>
                  handlePackageChange(
                    isStandaloneAddonOnly ? packages[1]?.id ?? packages[0].id : NO_PACKAGE_ID
                  )
                }
                className={`px-3 py-1.5 rounded-[7px] text-[11px] font-semibold border transition-colors shrink-0 ${
                  isStandaloneAddonOnly
                    ? 'bg-[var(--brand-navy)] text-[var(--brand-lime)] border-[var(--brand-navy)]'
                    : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-hairline)] hover:border-[var(--accent)]'
                }`}
              >
                {isStandaloneAddonOnly ? 'Standart Paket Seç' : 'Sadece Ek Modül (Paketsiz)'}
              </button>
            </div>

            {/* 3 Resmi SportsFly Paket Kartı */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {packages.map((pkg) => {
                const selected = Boolean(selectedPkg && pkg.id === selectedPkg.id);
                const displayMonthly = pkg.isCustomCorporate
                  ? billingCycle === 'yillik'
                    ? Math.round(customMonthlyPrice * 0.8)
                    : customMonthlyPrice
                  : billingCycle === 'yillik'
                    ? pkg.yearlyMonthlyPrice
                    : pkg.monthlyPrice;
                const annualPrepaidPkg = pkg.isCustomCorporate
                  ? Math.round(customMonthlyPrice * 0.8) * 12
                  : pkg.baseAnnualPrice;
                const isHighlighted = pkg.id === 'pkg-pro';

                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => handlePackageChange(pkg.id)}
                    className={`relative text-left p-4 rounded-[10px] border transition-all flex flex-col justify-between ${
                      selected
                        ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/20 bg-[var(--accent-soft)]/35'
                        : isHighlighted
                          ? 'border-[var(--accent)]/50 bg-[var(--bg-canvas)] hover:border-[var(--accent)]'
                          : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`px-2 py-0.5 rounded-[5px] text-[10px] font-bold tracking-wide ${
                            isHighlighted
                              ? 'bg-[var(--accent)] text-white'
                              : pkg.isCustomCorporate
                                ? 'bg-[var(--brand-navy)] text-[var(--brand-lime)]'
                                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                          }`}
                        >
                          {pkg.badge ?? 'PAKET'}
                        </span>
                        {selected && (
                          <CheckCircle2 className="w-4 h-4 text-[var(--accent)] shrink-0" />
                        )}
                      </div>

                      <div className="text-sm font-bold text-[var(--text-primary)]">{pkg.name}</div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-1 leading-snug">
                        {pkg.targetAudience}
                      </div>

                      <div className="mt-3 pt-3 border-t border-[var(--border-hairline)]">
                        {pkg.isCustomCorporate ? (
                          <>
                            <div className="text-base font-bold text-[var(--text-primary)]">
                              Kurumsal Teklif
                            </div>
                            <div className="text-[11px] text-[var(--accent)] font-semibold tabular-nums mt-0.5">
                              Baz: {formatTRY(displayMonthly, false)} / ay · Peşin: {formatTRY(annualPrepaidPkg, false)}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-xl font-bold text-[var(--text-primary)] tabular-nums">
                                {formatTRY(displayMonthly, false)}
                              </span>
                              <span className="text-[11px] text-[var(--text-muted)]">/ ay</span>
                              {billingCycle === 'yillik' && (
                                <span className="text-[11px] text-[var(--text-muted)] line-through tabular-nums ml-1">
                                  {formatTRY(pkg.monthlyPrice, false)}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-medium text-[var(--accent)] tabular-nums mt-0.5">
                              Yıllık Peşin: {formatTRY(annualPrepaidPkg, false)} (%20 İndirim)
                            </div>
                          </>
                        )}
                      </div>

                      <ul className="mt-3 space-y-1.5 text-[11px] text-[var(--text-secondary)]">
                        {pkg.features.map((feat) => (
                          <li key={feat} className="flex items-start gap-1.5">
                            <Check className="w-3.5 h-3.5 text-[var(--accent)] shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 3. SportsFly Modülleri ve Entegrasyonlar */}
          <section className="p-4 sm:p-5 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  3. SportsFly Entegrasyonları ve Akıllı Modüller
                </h2>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Seçtiğiniz pakete eklemek istediğiniz akıllı modülleri ve sporcu başı/turnuva seçeneklerini belirleyin.
                </p>
              </div>
              {billingCycle === 'yillik' && (
                <span className="px-2 py-1 rounded-[6px] bg-[var(--brand-lime)] text-[var(--brand-navy)] text-[10px] font-bold">
                  Ek modüllerde de %20 Yıllık Plan İndirimi aktif
                </span>
              )}
            </div>

            {/* Öne Çıkan Entegrasyonlar */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Kulüpler İçin Öne Çıkan Akıllı Modüller
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {featuredModules.map((mod) => {
                  const included = Boolean(selectedPkg?.includedModules.includes(mod.key));
                  const checked = included || selectedModules.includes(mod.key);
                  const isLab = mod.key === 'SportsFlyLab';
                  const isTournament = mod.key === 'TurnuvaFikstur';

                  const monthlyEff =
                    billingCycle === 'yillik'
                      ? Math.round(mod.monthlyAddonPrice * 0.8)
                      : mod.monthlyAddonPrice;
                  const yearlyPrepaidMod = monthlyEff * 12;

                  const labUnit =
                    labMode === 'analiz' ? LAB_ANALIZ_PER_ATHLETE_PRICE : LAB_KARNE_PER_ATHLETE_PRICE;
                  const labSubtotal = Math.max(1, labAthleteCount) * labUnit;

                  let badgeText = 'Pakete Dahil';
                  if (!included) {
                    if (isLab) {
                      badgeText = checked
                        ? `${formatTRY(labSubtotal, false)} (${formatNumberTR(labAthleteCount)} × ${labUnit} ₺)`
                        : `${LAB_KARNE_PER_ATHLETE_PRICE} / ${LAB_ANALIZ_PER_ATHLETE_PRICE} ₺ / sporcu`;
                    } else if (isTournament && tournamentMode === 'single') {
                      badgeText = `${formatTRY(SINGLE_TOURNAMENT_PRICE, false)} (1 Turnuva)`;
                    } else {
                      badgeText =
                        billingCycle === 'yillik'
                          ? `+${formatTRY(mod.monthlyAddonPrice, false)}/ay → ${formatTRY(yearlyPrepaidMod, false)}/yıl`
                          : `+${formatTRY(mod.monthlyAddonPrice, false)}/ay`;
                    }
                  }

                  return (
                    <div
                      key={mod.key}
                      className={`p-3.5 rounded-[10px] border transition-colors space-y-2.5 ${
                        checked
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)]/25'
                          : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] hover:border-[var(--border-strong)]'
                      } ${isLab || isTournament ? 'sm:col-span-2' : ''}`}
                    >
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={included}
                          onChange={() => toggleModule(mod.key)}
                          className="mt-1 rounded border-[var(--border-strong)]"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <span className="text-xs font-bold text-[var(--text-primary)]">
                              {mod.name}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold tabular-nums ${
                                included
                                  ? 'bg-[var(--brand-lime)] text-[var(--brand-navy)]'
                                  : checked
                                    ? 'bg-[var(--brand-navy)] text-[var(--brand-lime)]'
                                    : 'bg-[var(--bg-subtle)] text-[var(--accent)]'
                              }`}
                            >
                              {badgeText}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">
                            {mod.description}
                          </p>
                        </div>
                      </label>

                      {/* SportsFly Lab Özel Sporcu Başı Plan Seçeneği */}
                      {isLab && !included && (
                        <div className="pt-2.5 border-t border-[var(--border-hairline)] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setLabMode('karne');
                                if (!checked) toggleModule('SportsFlyLab');
                              }}
                              className={`px-3 py-1.5 rounded-[7px] text-[11px] font-semibold border transition-colors tabular-nums ${
                                labMode === 'karne' && checked
                                  ? 'bg-[var(--brand-navy)] text-[var(--brand-lime)] border-[var(--brand-navy)]'
                                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
                              }`}
                            >
                              Sadece Karne Altyapısı · {LAB_KARNE_PER_ATHLETE_PRICE} ₺ / sporcu
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setLabMode('analiz');
                                if (!checked) toggleModule('SportsFlyLab');
                              }}
                              className={`px-3 py-1.5 rounded-[7px] text-[11px] font-semibold border transition-colors tabular-nums ${
                                labMode === 'analiz' && checked
                                  ? 'bg-[var(--brand-navy)] text-[var(--brand-lime)] border-[var(--brand-navy)]'
                                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
                              }`}
                            >
                              Karne + Analiz Talebi · {LAB_ANALIZ_PER_ATHLETE_PRICE} ₺ / sporcu
                            </button>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[11px]">
                            <label htmlFor="qb-lab-athletes" className="text-[var(--text-secondary)] font-medium">
                              Sporcu Sayısı:
                            </label>
                            <input
                              id="qb-lab-athletes"
                              type="number"
                              min={1}
                              max={25000}
                              value={labAthleteCount}
                              onChange={(e) =>
                                setLabAthleteCount(Math.max(1, Number(e.target.value) || 1))
                              }
                              className="w-20 px-2.5 py-1 rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-semibold tabular-nums"
                            />
                            <button
                              type="button"
                              onClick={() => setLabAthleteCount(athleteCount)}
                              className="px-2 py-1 rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] tabular-nums"
                            >
                              Kulüp ({athleteCount})
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Turnuva & Fikstür Aylık veya Tek Turnuva Seçeneği */}
                      {isTournament && !included && (
                        <div className="pt-2.5 border-t border-[var(--border-hairline)] flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                            Faturalandırma Tipi:
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setTournamentMode('monthly');
                                if (!checked) toggleModule('TurnuvaFikstur');
                              }}
                              className={`px-3 py-1.5 rounded-[7px] text-[11px] font-semibold border transition-colors tabular-nums ${
                                tournamentMode === 'monthly' && checked
                                  ? 'bg-[var(--brand-navy)] text-[var(--brand-lime)] border-[var(--brand-navy)]'
                                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
                              }`}
                            >
                              Aylık Abonelik (+399 ₺ / ay)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTournamentMode('single');
                                if (!checked) toggleModule('TurnuvaFikstur');
                              }}
                              className={`px-3 py-1.5 rounded-[7px] text-[11px] font-semibold border transition-colors tabular-nums ${
                                tournamentMode === 'single' && checked
                                  ? 'bg-[var(--brand-navy)] text-[var(--brand-lime)] border-[var(--brand-navy)]'
                                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
                              }`}
                            >
                              Sadece 1 Turnuva ({formatTRY(SINGLE_TOURNAMENT_PRICE, false)} Sabit)
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 4. Yıllık Peşin Ödeme & Ekstra İndirim Hesaplama Modülü */}
          <section className="p-4 sm:p-5 rounded-[10px] border-2 border-[var(--brand-navy)]/20 bg-[var(--bg-surface)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-[8px] bg-[var(--brand-navy)] text-[var(--brand-lime)] shrink-0">
                  <Calculator className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                      4. Yıllık Peşin Ödeme ve Ekstra İndirim Hesaplama Modülü
                    </h2>
                    <span
                      className={`px-2 py-0.5 rounded-[5px] text-[10px] font-bold ${
                        pricing.prepaidEnabled
                          ? 'bg-[var(--brand-lime)] text-[var(--brand-navy)]'
                          : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {pricing.prepaidEnabled
                        ? `Aktif · Ek +%${pricing.prepaidDiscountPercent} Peşin İndirimi`
                        : `Önizleme · +%${pricing.simulatedPrepaidExtraPercent} Seçeneği`}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Paket bazlı fiyatlandırmaya ek olarak yıllık peşin tahsilat seçeneğini ve ekstra peşin indirim oranını hesaplayın.
                  </p>
                </div>
              </div>

              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-xs font-semibold text-[var(--text-primary)] cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={billingCycle === 'yillik' && prepaidEnabled}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    if (checked && billingCycle !== 'yillik') {
                      setBillingCycle('yillik');
                    }
                    setPrepaidEnabled(checked);
                  }}
                />
                <span>Yıllık Peşin Seçeneğini Uygula</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-5 space-y-2">
                <label
                  htmlFor="qb-prepaid-discount"
                  className="block text-xs font-medium text-[var(--text-secondary)]"
                >
                  Yıllık Peşin Ekstra İndirim Yüzdesi (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="qb-prepaid-discount"
                    type="number"
                    min={0}
                    max={30}
                    value={prepaidDiscountPercent}
                    onChange={(e) =>
                      setPrepaidDiscountPercent(
                        Math.min(30, Math.max(0, Number(e.target.value) || 0))
                      )
                    }
                    className="w-24 px-3 py-2 text-xs font-bold rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)] tabular-nums"
                  />
                  <div className="flex flex-wrap items-center gap-1">
                    {[5, 10, 15, 20].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          setPrepaidDiscountPercent(pct);
                          if (billingCycle !== 'yillik') setBillingCycle('yillik');
                          setPrepaidEnabled(true);
                        }}
                        className={`px-2.5 py-1.5 rounded-[6px] text-[11px] font-semibold tabular-nums border transition-colors ${
                          prepaidDiscountPercent === pct
                            ? 'bg-[var(--brand-navy)] text-[var(--brand-lime)] border-[var(--brand-navy)]'
                            : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        %{pct}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] tabular-nums">
                  {billingCycle === 'yillik'
                    ? `Yıllık plan (%${ANNUAL_PLAN_DISCOUNT_PERCENT}) + Ek kurumsal (%${pricing.discountPercent}) + Peşin (%${pricing.simulatedPrepaidExtraPercent}) → Toplam %${pricing.annualPrepaidEffectiveDiscountPercent} avantaj`
                    : `Yıllık peşin geçildiğinde %${ANNUAL_PLAN_DISCOUNT_PERCENT} yıllık plan + %${pricing.simulatedPrepaidExtraPercent} ekstra peşin indirimi uygulanır.`}
                </p>
              </div>

              <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                    12 Aylık Liste
                  </div>
                  <div className="text-sm font-bold text-[var(--text-primary)] tabular-nums mt-1">
                    {formatTRY(pricing.annualListTotal, false)}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5 tabular-nums">
                    {formatTRY(pricing.monthlyListAmount, false)}/ay × 12
                    {pricing.labAmount > 0 || (pricing.tournamentSelected && pricing.tournamentMode === 'single')
                      ? ' + Özel Kalemler'
                      : ''}
                  </div>
                </div>

                <div className="p-3 rounded-[8px] border border-[var(--status-success)]/30 bg-[var(--status-success-bg)]/50">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-[var(--status-success)]">
                    Ekstra Peşin (%{pricing.simulatedPrepaidExtraPercent})
                  </div>
                  <div className="text-sm font-bold text-[var(--status-success)] tabular-nums mt-1">
                    -{formatTRY(pricing.simulatedPrepaidDiscountAmount, false)}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 tabular-nums">
                    Toplam %{pricing.annualPrepaidEffectiveDiscountPercent} Liste İndirimi
                  </div>
                </div>

                <div className="p-3 rounded-[8px] bg-[var(--brand-navy)] text-white">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--brand-lime)]">
                    Yıllık Peşin Tutar
                  </div>
                  <div className="text-base font-bold text-white tabular-nums mt-0.5">
                    {formatTRY(pricing.annualPrepaidWithVat, false)}
                  </div>
                  <div className="text-[10px] text-slate-300 mt-0.5 tabular-nums">
                    KDV Hariç: {formatTRY(pricing.annualPrepaidAmount, false)}
                  </div>
                </div>
              </div>
            </div>

            {(!pricing.prepaidEnabled || billingCycle !== 'yillik') && (
              <div className="pt-2 border-t border-[var(--border-hairline)] flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-[var(--text-secondary)]">
                  Teklif şu an{' '}
                  <strong>
                    {billingCycle === 'aylik' ? 'Aylık Ödeme' : 'Standart Yıllık Plan'}
                  </strong>{' '}
                  üzerinden hesaplanıyor; yıllık peşin seçilirse{' '}
                  <strong className="text-[var(--accent)] tabular-nums">
                    {formatTRY(pricing.annualPrepaidWithVat, false)}
                  </strong>{' '}
                  (KDV dahil) uygulanır.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setBillingCycle('yillik');
                    setPrepaidEnabled(true);
                  }}
                  className="px-3 py-1.5 rounded-[7px] bg-[var(--brand-navy)] text-[var(--brand-lime)] text-[11px] font-bold hover:opacity-90"
                >
                  Yıllık Peşin Tutarı Teklife Uygula
                </button>
              </div>
            )}
          </section>

          {/* 5. İndirim, Geçerlilik, Hatırlatmalar ve Notlar */}
          <section className="p-4 sm:p-5 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              5. Ek Kurumsal İndirim, Geçerlilik ve Otomatik Hatırlatmalar
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="qb-discount" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Ek Kurumsal İndirim Oranı (%) — Onay Sınırı: %{DISCOUNT_APPROVAL_THRESHOLD}
                </label>
                <input
                  id="qb-discount"
                  type="number"
                  min={0}
                  max={60}
                  value={discountPercent}
                  onChange={(e) =>
                    setDiscountPercent(Math.min(60, Math.max(0, Number(e.target.value) || 0)))
                  }
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)] tabular-nums"
                />
                <div className="mt-1.5 text-[11px] text-[var(--text-muted)] tabular-nums">
                  {billingCycle === 'yillik'
                    ? `Yıllık plan (%20) + Ek (%${pricing.discountPercent}) → Toplam liste indirim oranı: %${pricing.effectiveTotalDiscountPercent}`
                    : `Toplam indirim oranı: %${pricing.effectiveTotalDiscountPercent}`}
                </div>
                {pricing.requiresDualApproval && (
                  <p className="mt-1 text-[11px] text-[var(--status-warning)] font-medium">
                    %{DISCOUNT_APPROVAL_THRESHOLD} üzeri ek indirim uygulandı: Yönetici ve Finans onayı zorunludur.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="qb-validity" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Geçerlilik Süresi (Gün)
                </label>
                <input
                  id="qb-validity"
                  type="number"
                  min={3}
                  max={90}
                  value={validityDays}
                  onChange={(e) => setValidityDays(Math.max(3, Number(e.target.value) || 15))}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)] tabular-nums"
                />
                <p className="mt-1.5 text-[11px] text-[var(--text-muted)] tabular-nums">
                  Son geçerlilik tarihi: {formatDateTR(validUntilPreview)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-1">
              <label className="inline-flex items-center gap-2 text-xs text-[var(--text-primary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminderDay3Enabled}
                  onChange={(e) => setReminderDay3Enabled(e.target.checked)}
                />
                <span>Gönderim sonrası 3. gün otomatik takip hatırlatması</span>
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-[var(--text-primary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminderDay7Enabled}
                  onChange={(e) => setReminderDay7Enabled(e.target.checked)}
                />
                <span>Gönderim sonrası 7. gün otomatik takip hatırlatması</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="qb-terms" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Teklif Koşulları ve Notlar
                </label>
                <textarea
                  id="qb-terms"
                  rows={2}
                  value={termsNote}
                  onChange={(e) => setTermsNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label htmlFor="qb-changenote" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Sürüm Değişiklik Notu ({existingQuote ? `v${existingQuote.currentVersion + 1}` : 'v1'})
                </label>
                <textarea
                  id="qb-changenote"
                  rows={2}
                  value={changeNote}
                  onChange={(e) => setChangeNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)]"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Sağ Yapışkan Finans Özeti */}
        <aside className="xl:col-span-4 xl:sticky xl:top-20 space-y-4">
          <div className="p-5 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-3">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Finansal Özet</h2>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  {billingCycle === 'yillik'
                    ? 'Yıllık Plan (%20 İndirim · 12 Ay Peşin)'
                    : 'Aylık Ödeme Planı'}
                </div>
              </div>
              {existingQuote ? (
                <StatusText
                  label={existingQuote.status}
                  tone={existingQuote.status === 'Müşteri Onayladı' ? 'success' : 'info'}
                />
              ) : (
                <span
                  className={`px-2 py-0.5 rounded-[5px] text-[10px] font-bold ${
                    billingCycle === 'yillik'
                      ? 'bg-[var(--brand-lime)] text-[var(--brand-navy)]'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                  }`}
                >
                  {billingCycle === 'yillik' ? `%${pricing.effectiveTotalDiscountPercent} İndirim` : 'Aylık'}
                </span>
              )}
            </div>

            <dl className="space-y-2.5 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--text-secondary)]">
                  {selectedPkg
                    ? `Paket Bedeli (${billingCycle === 'yillik' ? '12 Ay' : 'Aylık'})`
                    : 'Ana Paket (Seçilmedi · Sadece Ek Modül)'}
                </dt>
                <dd className="tabular-nums font-medium text-[var(--text-primary)]">
                  {selectedPkg ? formatTRY(pricing.packageBaseAmount) : '—'}
                </dd>
              </div>
              {pricing.tierAdjustmentAmount > 0 && (
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--text-secondary)]">
                    Kapasite Farkı ({pricing.tier.label})
                  </dt>
                  <dd className="tabular-nums font-medium text-[var(--text-primary)]">
                    +{formatTRY(pricing.tierAdjustmentAmount)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--text-secondary)]">Ek Modüller (Aylık/Yıllık)</dt>
                <dd className="tabular-nums font-medium text-[var(--text-primary)]">
                  {pricing.recurringAddonsAmount > 0
                    ? `+${formatTRY(pricing.recurringAddonsAmount)}`
                    : '0,00 ₺'}
                </dd>
              </div>
              {pricing.labSelected && (
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--text-secondary)]">
                    SportsFly Lab ({pricing.labMode === 'analiz' ? 'Analiz' : 'Karne'} · {pricing.labAthleteCount} sp.)
                  </dt>
                  <dd className="tabular-nums font-medium text-[var(--text-primary)]">
                    +{formatTRY(pricing.labAmount)}
                  </dd>
                </div>
              )}
              {pricing.tournamentSelected && pricing.tournamentMode === 'single' && (
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--text-secondary)]">Tek Turnuva & Fikstür</dt>
                  <dd className="tabular-nums font-medium text-[var(--text-primary)]">
                    +{formatTRY(pricing.tournamentAmount)}
                  </dd>
                </div>
              )}

              {billingCycle === 'yillik' ? (
                <>
                  <div className="pt-2 border-t border-[var(--border-hairline)] flex justify-between gap-2">
                    <dt className="text-[var(--text-secondary)]">12 Aylık Liste Tutarı</dt>
                    <dd className="tabular-nums font-medium text-[var(--text-muted)] line-through">
                      {formatTRY(pricing.annualListTotal)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 text-[var(--status-success)]">
                    <dt>Yıllık Plan İndirimi (%{pricing.annualPlanDiscountPercent})</dt>
                    <dd className="tabular-nums font-semibold">
                      -{formatTRY(pricing.annualPlanSavingsAmount)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[var(--text-secondary)]">Yıllık Peşin Ara Toplam</dt>
                    <dd className="tabular-nums font-semibold text-[var(--text-primary)]">
                      {formatTRY(pricing.subtotal)}
                    </dd>
                  </div>
                </>
              ) : (
                <div className="pt-2 border-t border-[var(--border-hairline)] flex justify-between gap-2">
                  <dt className="text-[var(--text-secondary)]">Ara Toplam</dt>
                  <dd className="tabular-nums font-semibold text-[var(--text-primary)]">
                    {formatTRY(pricing.subtotal)}
                  </dd>
                </div>
              )}

              <div className="flex justify-between gap-2">
                <dt className="text-[var(--text-secondary)]">
                  Ek Kurumsal İndirim (%{pricing.discountPercent})
                </dt>
                <dd className="tabular-nums font-medium text-[var(--status-error)]">
                  -{formatTRY(pricing.discountAmount)}
                </dd>
              </div>

              {pricing.prepaidEnabled && pricing.prepaidDiscountPercent > 0 && (
                <div className="flex justify-between gap-2 text-[var(--status-success)]">
                  <dt className="font-medium">
                    Yıllık Peşin Ekstra İndirim (%{pricing.prepaidDiscountPercent})
                  </dt>
                  <dd className="tabular-nums font-semibold">
                    -{formatTRY(pricing.prepaidDiscountAmount)}
                  </dd>
                </div>
              )}

              <div className="flex justify-between gap-2">
                <dt className="text-[var(--text-secondary)] font-medium">Toplam İndirim Oranı</dt>
                <dd className="tabular-nums font-bold text-[var(--accent)]">
                  %{pricing.effectiveTotalDiscountPercent}
                </dd>
              </div>

              <div className="flex justify-between gap-2">
                <dt className="text-[var(--text-secondary)]">Net Tutar (KDV Hariç)</dt>
                <dd className="tabular-nums font-semibold text-[var(--text-primary)]">
                  {formatTRY(pricing.netTotal)}
                </dd>
              </div>

              <div className="flex justify-between gap-2">
                <dt className="text-[var(--text-secondary)]">KDV (%{pricing.vatRate})</dt>
                <dd className="tabular-nums font-medium text-[var(--text-primary)]">
                  +{formatTRY(pricing.vatAmount)}
                </dd>
              </div>

              <div className="pt-3 border-t border-[var(--border-strong)] space-y-2.5">
                {/* Toplam İndirimli Rakam + Yıllık Peşin Tutar Yan Yana */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="p-3 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      {billingCycle === 'yillik'
                        ? 'Toplam İndirimli (KDV Hariç)'
                        : 'Aylık İndirimli Toplam'}
                    </div>
                    <div className="text-base font-bold text-[var(--text-primary)] tabular-nums mt-1">
                      {billingCycle === 'yillik'
                        ? formatTRY(pricing.netTotal)
                        : `${formatTRY(pricing.grandTotal)} / ay`}
                    </div>
                    <div className="text-[10px] text-[var(--accent)] font-medium tabular-nums mt-0.5">
                      Toplam %{pricing.effectiveTotalDiscountPercent} indirimli
                    </div>
                  </div>

                  <div className="p-3 rounded-[8px] bg-[var(--brand-navy)] text-white">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--brand-lime)]">
                        Yıllık Peşin Tutar
                      </span>
                      <span className="px-1.5 py-0.5 rounded-[4px] bg-[var(--brand-lime)] text-[var(--brand-navy)] text-[9px] font-bold tabular-nums">
                        +%{pricing.simulatedPrepaidExtraPercent} Peşin
                      </span>
                    </div>
                    <div className="text-base font-bold text-white tabular-nums mt-1">
                      {formatTRY(pricing.annualPrepaidWithVat)}
                    </div>
                    <div className="text-[10px] text-slate-300 tabular-nums mt-0.5">
                      KDV Dahil · {formatTRY(Math.round(pricing.annualPrepaidAmount / 12), false)}/ay
                    </div>
                  </div>
                </div>

                {/* Net Genel Toplam Satırı */}
                <div className="flex justify-between items-baseline gap-2 pt-1">
                  <dt className="text-xs font-semibold text-[var(--text-secondary)]">
                    {billingCycle === 'yillik'
                      ? 'Teklif Genel Toplam (KDV Dahil)'
                      : '12 Aylık Normal Toplam (KDV Dahil)'}
                  </dt>
                  <dd className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                    {billingCycle === 'yillik'
                      ? formatTRY(pricing.grandTotal)
                      : formatTRY(pricing.grandTotal * 12)}
                  </dd>
                </div>
              </div>
            </dl>

            {/* Çift Onay Durumu Kutusu */}
            {pricing.requiresDualApproval && (
              <div className="p-3.5 rounded-[8px] border border-[var(--status-warning)] bg-[var(--status-warning-bg)] space-y-2.5 text-xs">
                <div className="flex items-start gap-2 font-semibold text-[var(--status-warning)]">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>%20 Üzeri Ek İndirim — Çift Onay Gerekli</span>
                </div>

                {existingQuote ? (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-primary)]">1. Yönetici Onayı</span>
                      {existingQuote.managerApproved ? (
                        <StatusText label="Onaylandı" tone="success" />
                      ) : currentUser.role === 'Yonetici' ? (
                        <button
                          type="button"
                          onClick={() => onApproveQuote(existingQuote.id, 'manager')}
                          className="px-2.5 py-1 rounded-[6px] bg-[var(--accent)] text-[var(--accent-fg)] font-medium text-[11px]"
                        >
                          Onayla
                        </button>
                      ) : (
                        <StatusText label="Bekliyor" tone="warning" />
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-primary)]">2. Finans Onayı</span>
                      {existingQuote.financeApproved ? (
                        <StatusText label="Onaylandı" tone="success" />
                      ) : currentUser.role === 'Finans' ? (
                        <button
                          type="button"
                          onClick={() => onApproveQuote(existingQuote.id, 'finance')}
                          className="px-2.5 py-1 rounded-[6px] bg-[var(--accent)] text-[var(--accent-fg)] font-medium text-[11px]"
                        >
                          Onayla
                        </button>
                      ) : (
                        <StatusText label="Bekliyor" tone="warning" />
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Teklif kaydedilip onaya gönderildiğinde Yönetici ve Finans rollerinin her ikisi de onay vermeden müşteriye iletilemez.
                  </p>
                )}
              </div>
            )}

            {/* Eylem Butonları */}
            {permission.canCreateOrEditQuotes && (
              <div className="space-y-2 pt-1 no-print">
                {isStandaloneAddonOnly && selectedModules.length === 0 && (
                  <div className="p-2.5 rounded-[8px] border border-[var(--status-warning)]/50 bg-[var(--status-warning-bg)] text-[11px] text-[var(--status-warning)] font-medium">
                    Paketsiz devam etmek için Adım 3&apos;ten en az bir ek modül seçmelisiniz.
                  </div>
                )}
                {canSendDirectly ? (
                  <button
                    type="button"
                    disabled={!clubId || (isStandaloneAddonOnly && selectedModules.length === 0)}
                    onClick={() => handleSave('send')}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[8px] text-xs font-semibold bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>
                      {existingQuote ? 'Yeni Sürümü Kaydet ve Müşteriye Gönder' : 'Teklifi Kaydet ve Gönder'}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!clubId || (isStandaloneAddonOnly && selectedModules.length === 0)}
                    onClick={() => handleSave('request_approval')}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[8px] text-xs font-semibold bg-[var(--status-warning)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Yönetici ve Finans Onayına Gönder</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={!clubId || (isStandaloneAddonOnly && selectedModules.length === 0)}
                  onClick={() => handleSave('draft')}
                  className="w-full px-4 py-2 rounded-[8px] text-xs font-medium border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {existingQuote ? 'Yeni Sürüm Taslağı Kaydet' : 'Taslak Olarak Kaydet'}
                </button>
              </div>
            )}

            {existingQuote && (
              <div className="pt-3 border-t border-[var(--border-hairline)] space-y-2 no-print">
                <div className="text-[11px] font-medium text-[var(--text-muted)]">
                  Dijital Müşteri Onay Bağlantısı
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-2.5 py-1.5 rounded-[6px] bg-[var(--bg-subtle)] text-[11px] font-mono-num text-[var(--text-secondary)] truncate">
                    /onay/{existingQuote.digitalApprovalToken}
                  </code>
                  <button
                    type="button"
                    onClick={copyApprovalUrl}
                    aria-label="Onay bağlantısını kopyala"
                    className="p-2 rounded-[6px] border border-[var(--border-hairline)] hover:bg-[var(--bg-subtle)] shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                {copiedLink && (
                  <div className="text-[11px] text-[var(--status-success)] font-medium">
                    Bağlantı panoya kopyalandı.
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
