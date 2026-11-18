import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  FileCheck2,
  Pencil,
  Plus,
  ShieldAlert,
} from 'lucide-react';
import type {
  Activity,
  AppRoute,
  Club,
  Contact,
  ProductModule,
  ProductPackage,
  Quote,
  QuoteStatus,
  RolePermission,
  Task,
  User,
} from '../types/crm';
import {
  formatDateTR,
  formatNumberTR,
  formatTRY,
  isDateOverdue,
  isDateWithinDays,
  NO_PACKAGE_ID,
} from '../utils/formatters';
import { TODAY_ISO } from '../data/mockData';
import { StatusText } from './ui';

interface DashboardViewProps {
  clubs: Club[];
  contacts: Contact[];
  activities: Activity[];
  tasks: Task[];
  quotes: Quote[];
  packages: ProductPackage[];
  modules: ProductModule[];
  users: User[];
  currentUser: User;
  permission: RolePermission;
  onNavigate: (route: AppRoute) => void;
  onNavigateQuotes: () => void;
  onNewQuote: () => void;
  onToggleTask: (taskId: string) => void;
  onApproveQuote: (quoteId: string, kind: 'manager' | 'finance') => void;
  onOpenQuoteBuilder: (quoteId?: string) => void;
  onOpenProposalPreview: (quoteId: string) => void;
}

const QUOTE_STATUS_ORDER: QuoteStatus[] = [
  'Taslak',
  'Onay Bekliyor',
  'Gönderildi',
  'Revizyon Talep Edildi',
  'Müşteri Onayladı',
  'Süresi Doldu',
];

const STATUS_BAR_COLOR: Record<QuoteStatus, string> = {
  Taslak: 'bg-slate-400',
  'Onay Bekliyor': 'bg-amber-500',
  Gönderildi: 'bg-[var(--accent)]',
  'Revizyon Talep Edildi': 'bg-orange-500',
  'Müşteri Onayladı': 'bg-emerald-600',
  'Süresi Doldu': 'bg-rose-500',
};

export function DashboardView({
  clubs,
  contacts,
  activities,
  tasks,
  quotes,
  packages,
  modules,
  users,
  currentUser,
  permission,
  onNavigate,
  onNavigateQuotes,
  onNewQuote,
  onToggleTask,
  onApproveQuote,
  onOpenQuoteBuilder,
  onOpenProposalPreview,
}: DashboardViewProps) {
  const [scopeFilter, setScopeFilter] = useState<'all' | 'mine'>('all');
  const [billingFilter, setBillingFilter] = useState<'all' | 'yillik' | 'aylik'>('all');
  const [analyticsTab, setAnalyticsTab] = useState<'funnel' | 'catalog' | 'team'>('funnel');
  const [opsTab, setOpsTab] = useState<'tasks' | 'activities'>('tasks');
  const [matrixTab, setMatrixTab] = useState<'quotes' | 'clubs'>('quotes');

  const getLatest = (q: Quote) => q.versions[q.versions.length - 1];
  const getClub = (clubId: string) => clubs.find((c) => c.id === clubId);
  const getClubName = (clubId: string) => getClub(clubId)?.name ?? 'Kulüp';
  const getUserName = (userId: string) => users.find((u) => u.id === userId)?.name ?? 'Atanmamış';

  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      if (scopeFilter === 'mine' && q.createdById !== currentUser.id) return false;
      if (billingFilter !== 'all' && getLatest(q).billingCycle !== billingFilter) return false;
      return true;
    });
  }, [quotes, scopeFilter, billingFilter, currentUser.id]);

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => !t.completed && (scopeFilter === 'all' || t.assigneeId === currentUser.id))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [tasks, scopeFilter, currentUser.id]);

  const recentActivities = useMemo(() => {
    return [...activities]
      .filter((a) => scopeFilter === 'all' || a.createdById === currentUser.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [activities, scopeFilter, currentUser.id]);

  // Temel KPI Hesaplamaları
  const activeQuotes = useMemo(
    () =>
      filteredQuotes.filter(
        (q) => q.status !== 'Müşteri Onayladı' && q.status !== 'Süresi Doldu'
      ),
    [filteredQuotes]
  );

  const approvedQuotes = useMemo(
    () => filteredQuotes.filter((q) => q.status === 'Müşteri Onayladı'),
    [filteredQuotes]
  );

  const revisionOrExpiredQuotes = useMemo(
    () =>
      filteredQuotes.filter(
        (q) => q.status === 'Revizyon Talep Edildi' || q.status === 'Süresi Doldu'
      ),
    [filteredQuotes]
  );

  const finalizedCount = approvedQuotes.length + revisionOrExpiredQuotes.length;
  const approvalRate =
    finalizedCount > 0 ? Math.round((approvedQuotes.length / finalizedCount) * 1000) / 10 : 0;

  const activeQuoteVolume = useMemo(
    () => activeQuotes.reduce((sum, q) => sum + getLatest(q).grandTotal, 0),
    [activeQuotes]
  );

  const activeAthleteVolume = useMemo(
    () => activeQuotes.reduce((sum, q) => sum + getLatest(q).athleteCount, 0),
    [activeQuotes]
  );

  const approvedQuoteVolume = useMemo(
    () => approvedQuotes.reduce((sum, q) => sum + getLatest(q).grandTotal, 0),
    [approvedQuotes]
  );

  const activeContractValueSum = useMemo(
    () =>
      clubs
        .filter((c) => c.contractStatus === 'Aktif Sözleşme' || c.contractStatus === 'Yenileme Bekliyor')
        .reduce((sum, c) => sum + (c.annualContractValue ?? 0), 0),
    [clubs]
  );

  const avgQuoteValue = useMemo(() => {
    if (filteredQuotes.length === 0) return 0;
    const total = filteredQuotes.reduce((s, q) => s + getLatest(q).grandTotal, 0);
    return Math.round(total / filteredQuotes.length);
  }, [filteredQuotes]);

  const avgDiscountRate = useMemo(() => {
    if (filteredQuotes.length === 0) return 0;
    const totalDiscount = filteredQuotes.reduce((s, q) => s + getLatest(q).discountPercent, 0);
    return Math.round((totalDiscount / filteredQuotes.length) * 10) / 10;
  }, [filteredQuotes]);

  const sentCount = filteredQuotes.filter((q) => q.status === 'Gönderildi').length;
  const awaitingApprovalCount = filteredQuotes.filter((q) => q.status === 'Onay Bekliyor').length;

  const totalClubAthletes = useMemo(
    () => clubs.reduce((s, c) => s + c.estimatedAthletes, 0),
    [clubs]
  );
  const activeOrPilotClubsCount = clubs.filter(
    (c) => c.sportsflyStatus === 'Aktif' || c.sportsflyStatus === 'Pilot'
  ).length;
  const renewalWaitingClubsCount = clubs.filter(
    (c) => c.contractStatus === 'Yenileme Bekliyor'
  ).length;
  const activeContractClubsCount = clubs.filter(
    (c) => c.contractStatus === 'Aktif Sözleşme'
  ).length;

  const kvkkConsentRate = useMemo(() => {
    if (contacts.length === 0) return 100;
    const consented = contacts.filter((c) => c.kvkkConsent).length;
    return Math.round((consented / contacts.length) * 100);
  }, [contacts]);

  // Analitik Sekmesi Hesaplamaları
  const maxStatusCount = Math.max(
    1,
    ...QUOTE_STATUS_ORDER.map((s) => filteredQuotes.filter((q) => q.status === s).length)
  );

  const packageDemand = useMemo(() => {
    const items = [
      ...packages.map((p) => ({ id: p.id, name: p.name })),
      { id: NO_PACKAGE_ID, name: 'Sadece Ek Modül (Paketsiz)' },
    ];
    return items
      .map((item) => {
        const matched = filteredQuotes.filter((q) => getLatest(q).packageId === item.id);
        const volume = matched.reduce((s, q) => s + getLatest(q).grandTotal, 0);
        const athletes = matched.reduce((s, q) => s + getLatest(q).athleteCount, 0);
        return { ...item, count: matched.length, volume, athletes };
      })
      .filter((x) => x.count > 0 || x.id !== NO_PACKAGE_ID)
      .sort((a, b) => b.count - a.count);
  }, [filteredQuotes, packages]);

  const moduleDemand = useMemo(() => {
    return modules
      .map((mod) => {
        const count = filteredQuotes.filter((q) =>
          getLatest(q).selectedModules.includes(mod.key)
        ).length;
        return { key: mod.key, name: mod.name, count };
      })
      .filter((m) => m.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [filteredQuotes, modules]);

  const teamPerformance = useMemo(() => {
    return users
      .map((u) => {
        const own = filteredQuotes.filter((q) => q.createdById === u.id);
        const approved = own.filter((q) => q.status === 'Müşteri Onayladı').length;
        const volume = own.reduce((s, q) => s + getLatest(q).grandTotal, 0);
        const openTasks = tasks.filter((t) => !t.completed && t.assigneeId === u.id).length;
        return { user: u, count: own.length, approved, volume, openTasks };
      })
      .filter((r) => r.count > 0 || r.openTasks > 0)
      .sort((a, b) => b.volume - a.volume);
  }, [users, filteredQuotes, tasks]);

  const cityBreakdown = useMemo(() => {
    const map = new Map<string, { city: string; clubs: number; athletes: number }>();
    clubs.forEach((c) => {
      const province = c.city.split('/')[0].trim();
      const prev = map.get(province) ?? { city: province, clubs: 0, athletes: 0 };
      prev.clubs += 1;
      prev.athletes += c.estimatedAthletes;
      map.set(province, prev);
    });
    return Array.from(map.values()).sort((a, b) => b.athletes - a.athletes).slice(0, 5);
  }, [clubs]);

  const quotesNeedingApproval = useMemo(
    () =>
      filteredQuotes.filter(
        (q) => q.requiresDualApproval && (!q.managerApproved || !q.financeApproved)
      ),
    [filteredQuotes]
  );

  const attentionQuotes = useMemo(
    () =>
      filteredQuotes.filter(
        (q) =>
          q.status === 'Taslak' ||
          q.status === 'Revizyon Talep Edildi' ||
          q.status === 'Onay Bekliyor' ||
          (q.status === 'Gönderildi' && isDateWithinDays(q.validUntil, 15, TODAY_ISO))
      ),
    [filteredQuotes]
  );

  const priorityClubs = useMemo(() => {
    const rank: Record<Club['contractStatus'], number> = {
      'Yenileme Bekliyor': 0,
      'Teklif Aşamasında': 1,
      'Aktif Sözleşme': 2,
      Sonlandırıldı: 3,
      Yok: 4,
    };
    return [...clubs].sort((a, b) => rank[a.contractStatus] - rank[b.contractStatus]);
  }, [clubs]);

  const getPackageLabel = (packageId: string) => {
    if (packageId === NO_PACKAGE_ID) return 'Sadece Ek Modül';
    return packages.find((p) => p.id === packageId)?.name ?? 'Özel Paket';
  };

  return (
    <div className="space-y-6">
      {!permission.canViewPricingAndContracts && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-xs text-[var(--text-secondary)]">
          <ShieldAlert className="w-4 h-4 text-[var(--status-warning)] shrink-0" aria-hidden="true" />
          <span>
            Rol bazlı erişim kontrolü aktif: <strong>{permission.label}</strong> rolü için fiyatlandırma ve sözleşme tutarları gizlenmiştir.
          </span>
        </div>
      )}

      {/* Üst Karşılama & Kapsam Filtre Çubuğu */}
      <section className="p-4 sm:p-5 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-muted)]">
            <span>{permission.label} Görünümü</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{formatDateTR(TODAY_ISO)}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{filteredQuotes.length} teklif</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{filteredTasks.length} açık görev</span>
          </div>
          <h2 className="mt-1 text-base sm:text-lg font-semibold text-[var(--text-primary)] tracking-tight">
            Hoş geldiniz, {currentUser.name}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Kapsam Seçici */}
          <div
            role="group"
            aria-label="Kayıt kapsamı filtresi"
            className="inline-flex items-center p-1 rounded-[8px] bg-[var(--bg-subtle)]"
          >
            <button
              type="button"
              onClick={() => setScopeFilter('all')}
              className={`px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                scopeFilter === 'all'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Tüm Ekip
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter('mine')}
              className={`px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                scopeFilter === 'mine'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Bana Ait Kayıtlar
            </button>
          </div>

          {/* Ödeme Planı Filtresi */}
          <div
            role="group"
            aria-label="Ödeme planı filtresi"
            className="inline-flex items-center p-1 rounded-[8px] bg-[var(--bg-subtle)]"
          >
            <button
              type="button"
              onClick={() => setBillingFilter('all')}
              className={`px-2.5 py-1.5 rounded-[6px] text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                billingFilter === 'all'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Tüm Planlar
            </button>
            <button
              type="button"
              onClick={() => setBillingFilter('yillik')}
              className={`px-2.5 py-1.5 rounded-[6px] text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                billingFilter === 'yillik'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Yıllık
            </button>
            <button
              type="button"
              onClick={() => setBillingFilter('aylik')}
              className={`px-2.5 py-1.5 rounded-[6px] text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                billingFilter === 'aylik'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Aylık
            </button>
          </div>

          {/* Hızlı Geçişler */}
          <button
            type="button"
            onClick={() => onNavigate('clubs')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors whitespace-nowrap shrink-0"
          >
            <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Kulüpler</span>
          </button>

          {permission.canCreateOrEditQuotes && (
            <button
              type="button"
              onClick={onNewQuote}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-xs font-semibold bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Teklif Hazırla</span>
            </button>
          )}
        </div>
      </section>

      {/* Üst KPI Satırı */}
      <section
        aria-label="Temel performans göstergeleri"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        <div className="p-5 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-col justify-between">
          <div>
            <div className="text-xs font-medium text-[var(--text-muted)]">Aktif Teklif Hattı</div>
            <div className="mt-2 text-2xl font-bold text-[var(--text-primary)] tabular-nums">
              {activeQuotes.length} Teklif
            </div>
            <div className="mt-1 text-xs text-[var(--text-secondary)] tabular-nums">
              {permission.canViewPricingAndContracts
                ? `Bekleyen hacim: ${formatTRY(activeQuoteVolume, false)}`
                : `Kapsam: ${formatNumberTR(activeAthleteVolume)} sporcu`}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--border-hairline)] flex items-center justify-between text-[11px] text-[var(--text-muted)] tabular-nums">
            <span>{sentCount} gönderildi</span>
            <span>{awaitingApprovalCount} onay bekliyor</span>
          </div>
        </div>

        <div className="p-5 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-col justify-between">
          <div>
            <div className="text-xs font-medium text-[var(--text-muted)]">
              Onaylanan &amp; Sözleşmeli Hacim
            </div>
            <div className="mt-2 text-2xl font-bold text-[var(--status-success)] tabular-nums">
              {permission.canViewPricingAndContracts
                ? formatTRY(approvedQuoteVolume + activeContractValueSum, false)
                : `${approvedQuotes.length} Onaylı`}
            </div>
            <div className="mt-1 text-xs text-[var(--text-secondary)] tabular-nums">
              {permission.canViewPricingAndContracts
                ? `Yeni onay: ${formatTRY(approvedQuoteVolume, false)} · Sözleşme: ${formatTRY(activeContractValueSum, false)}`
                : `${approvedQuotes.length} müşteri onayı · ${activeContractClubsCount} aktif sözleşme`}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--border-hairline)] flex items-center justify-between text-[11px] text-[var(--text-muted)] tabular-nums">
            <span>
              {permission.canViewPricingAndContracts
                ? `Ort. teklif: ${formatTRY(avgQuoteValue, false)}`
                : `${activeContractClubsCount} aktif sözleşme`}
            </span>
            <span>{renewalWaitingClubsCount} yenileme bekliyor</span>
          </div>
        </div>

        <div className="p-5 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-col justify-between">
          <div>
            <div className="text-xs font-medium text-[var(--text-muted)]">
              Teklif Dönüşüm Oranı
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                %{approvalRate.toFixed(1).replace('.', ',')}
              </span>
              <span className="text-xs text-[var(--text-muted)] tabular-nums">
                ({approvedQuotes.length}/{Math.max(1, finalizedCount)} sonuçlanan)
              </span>
            </div>
            <div className="mt-1 text-xs text-[var(--text-secondary)] tabular-nums">
              {approvedQuotes.length} müşteri onayı · {revisionOrExpiredQuotes.length} revizyon / süresi dolan
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--border-hairline)] flex items-center justify-between text-[11px] text-[var(--text-muted)] tabular-nums">
            <span>
              {permission.canViewPricingAndContracts
                ? `Ort. ek indirim: %${avgDiscountRate.toFixed(1).replace('.', ',')}`
                : `KVKK rıza: %${kvkkConsentRate}`}
            </span>
            <span>{quotesNeedingApproval.length} çift onayda</span>
          </div>
        </div>

        <div className="p-5 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-col justify-between">
          <div>
            <div className="text-xs font-medium text-[var(--text-muted)]">
              Sporcu Erişimi &amp; Kulüpler
            </div>
            <div className="mt-2 text-2xl font-bold text-[var(--text-primary)] tabular-nums">
              {formatNumberTR(totalClubAthletes)} Sporcu
            </div>
            <div className="mt-1 text-xs text-[var(--text-secondary)] tabular-nums">
              {clubs.length} kayıtlı kulüp · {activeOrPilotClubsCount} aktif / pilot hesap
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--border-hairline)] flex items-center justify-between text-[11px] text-[var(--text-muted)] tabular-nums">
            <span>{contacts.length} yetkili kişi</span>
            <span>%{kvkkConsentRate} KVKK onaylı</span>
          </div>
        </div>
      </section>

      {/* Orta Alan: Analitik Merkezi (7 sütun) + Operasyonel Öncelik Merkezi (5 sütun) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <section className="xl:col-span-7 p-4 sm:p-5 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Satış ve Ürün Analitiği
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {analyticsTab === 'funnel' &&
                  'Tekliflerin güncel durum dağılımı ve hacim kırılımı.'}
                {analyticsTab === 'catalog' &&
                  'Tercih edilen ana paketler ve tekliflere en sık eklenen akıllı modüller.'}
                {analyticsTab === 'team' &&
                  'Satış ekibi teklif performansı ve illere göre kulüp yoğunluğu.'}
              </p>
            </div>

            <div
              role="tablist"
              aria-label="Analitik görünümleri"
              className="inline-flex items-center p-1 rounded-[8px] bg-[var(--bg-subtle)]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={analyticsTab === 'funnel'}
                onClick={() => setAnalyticsTab('funnel')}
                className={`px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  analyticsTab === 'funnel'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Teklif Hunisi
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={analyticsTab === 'catalog'}
                onClick={() => setAnalyticsTab('catalog')}
                className={`px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  analyticsTab === 'catalog'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Paket &amp; Modüller
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={analyticsTab === 'team'}
                onClick={() => setAnalyticsTab('team')}
                className={`px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  analyticsTab === 'team'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Temsilci &amp; Şehir
              </button>
            </div>
          </div>

          {analyticsTab === 'funnel' && (
            <div className="space-y-4">
              {/* Oransal Özet Çubuğu */}
              {filteredQuotes.length > 0 && (
                <div>
                  <div className="h-2.5 w-full rounded-[4px] bg-[var(--bg-subtle)] overflow-hidden flex">
                    {QUOTE_STATUS_ORDER.map((status) => {
                      const count = filteredQuotes.filter((q) => q.status === status).length;
                      if (count === 0) return null;
                      const pct = (count / filteredQuotes.length) * 100;
                      return (
                        <div
                          key={status}
                          title={`${status}: ${count} teklif`}
                          className={`h-full ${STATUS_BAR_COLOR[status]}`}
                          style={{ width: `${pct}%` }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2.5">
                {QUOTE_STATUS_ORDER.map((status) => {
                  const items = filteredQuotes.filter((q) => q.status === status);
                  const statusSum = items.reduce((s, q) => s + getLatest(q).grandTotal, 0);
                  const widthPct = Math.max(8, Math.round((items.length / maxStatusCount) * 100));
                  const sharePct =
                    filteredQuotes.length > 0
                      ? Math.round((items.length / filteredQuotes.length) * 100)
                      : 0;

                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={onNavigateQuotes}
                      className="w-full text-left group p-2.5 -mx-2.5 rounded-[8px] hover:bg-[var(--bg-subtle)] transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                        <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                          {status}
                        </span>
                        <span className="text-[var(--text-secondary)] tabular-nums">
                          {items.length} teklif (%{sharePct})
                          {permission.canViewPricingAndContracts && items.length > 0
                            ? ` · ${formatTRY(statusSum, false)}`
                            : ''}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-[4px] bg-[var(--bg-subtle)] overflow-hidden">
                        <div
                          className={`h-full rounded-[4px] ${STATUS_BAR_COLOR[status]} transition-all`}
                          style={{ width: `${items.length === 0 ? 0 : widthPct}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-[var(--border-hairline)] flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => onNavigate('reports')}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline whitespace-nowrap"
                >
                  Detaylı Raporları İncele
                </button>
                <button
                  type="button"
                  onClick={onNavigateQuotes}
                  className="inline-flex items-center gap-1 font-medium text-[var(--accent)] hover:underline whitespace-nowrap"
                >
                  <span>Tüm Teklifleri Aç</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {analyticsTab === 'catalog' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xs font-semibold text-[var(--text-secondary)] mb-3">
                  Paket Tercih Dağılımı
                </h3>
                <div className="divide-y divide-[var(--border-hairline)]">
                  {packageDemand.map((item) => (
                    <div
                      key={item.id}
                      className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-[var(--text-primary)] truncate">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] tabular-nums">
                          {formatNumberTR(item.athletes)} sporcu kapsamı
                        </div>
                      </div>
                      <div className="text-right tabular-nums shrink-0">
                        <div className="font-semibold text-[var(--text-primary)]">
                          {item.count} teklif
                        </div>
                        {permission.canViewPricingAndContracts && (
                          <div className="text-[11px] text-[var(--text-muted)]">
                            {formatTRY(item.volume, false)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border-hairline)]">
                <h3 className="text-xs font-semibold text-[var(--text-secondary)] mb-3">
                  Tekliflerde En Sık Yer Alan Modüller
                </h3>
                {moduleDemand.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">
                    Seçili filtre için modül kaydı bulunmuyor.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {moduleDemand.map((mod) => {
                      const pct = Math.round((mod.count / Math.max(1, filteredQuotes.length)) * 100);
                      return (
                        <div key={mod.key} className="space-y-1 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-[var(--text-primary)]">{mod.name}</span>
                            <span className="text-[var(--text-secondary)] tabular-nums">
                              {mod.count} teklif (%{pct})
                            </span>
                          </div>
                          <div className="h-2 rounded-[4px] bg-[var(--bg-subtle)] overflow-hidden">
                            <div
                              className="h-full rounded-[4px] bg-[var(--accent)]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {analyticsTab === 'team' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xs font-semibold text-[var(--text-secondary)] mb-2.5">
                  Temsilci Bazlı Teklif ve Görev Yükü
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border-hairline)] text-[var(--text-muted)]">
                        <th className="py-2 pr-3 font-medium">Temsilci</th>
                        <th className="py-2 px-2 font-medium text-right">Teklif</th>
                        <th className="py-2 px-2 font-medium text-right">Onaylı</th>
                        <th className="py-2 px-2 font-medium text-right">Açık Görev</th>
                        {permission.canViewPricingAndContracts && (
                          <th className="py-2 pl-2 font-medium text-right">Hacim</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-hairline)]">
                      {teamPerformance.map((row) => (
                        <tr key={row.user.id} className="hover:bg-[var(--bg-subtle)]/40">
                          <td className="py-2.5 pr-3">
                            <div className="font-medium text-[var(--text-primary)]">
                              {row.user.name}
                            </div>
                            <div className="text-[11px] text-[var(--text-muted)]">
                              {row.user.title}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-right tabular-nums">{row.count}</td>
                          <td className="py-2.5 px-2 text-right tabular-nums text-[var(--status-success)] font-medium">
                            {row.approved}
                          </td>
                          <td className="py-2.5 px-2 text-right tabular-nums text-[var(--text-secondary)]">
                            {row.openTasks}
                          </td>
                          {permission.canViewPricingAndContracts && (
                            <td className="py-2.5 pl-2 text-right tabular-nums font-medium whitespace-nowrap">
                              {formatTRY(row.volume, false)}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border-hairline)]">
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-semibold text-[var(--text-secondary)]">
                    İllere Göre Kulüp &amp; Sporcu Yoğunluğu
                  </h3>
                  <button
                    type="button"
                    onClick={() => onNavigate('clubs')}
                    className="text-xs font-medium text-[var(--accent)] hover:underline whitespace-nowrap"
                  >
                    Tüm Kulüpler
                  </button>
                </div>
                <div className="divide-y divide-[var(--border-hairline)] text-xs">
                  {cityBreakdown.map((c) => (
                    <div
                      key={c.city}
                      className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2"
                    >
                      <span className="font-medium text-[var(--text-primary)]">{c.city}</span>
                      <span className="text-[var(--text-secondary)] tabular-nums">
                        {c.clubs} kulüp · {formatNumberTR(c.athletes)} sporcu
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Sağ Sütun: Onay Kuyruğu + Görevler / Aktiviteler */}
        <div className="xl:col-span-5 space-y-6">
          {/* %20 Üzeri İndirim Çift Onay Kuyruğu */}
          <section className="p-5 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                %20 Üzeri İndirim Onayı Bekleyenler
              </h2>
              <span className="text-xs text-[var(--text-muted)] tabular-nums">
                {quotesNeedingApproval.length} teklif
              </span>
            </div>

            {quotesNeedingApproval.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--status-success)] shrink-0" />
                <span>Onay bekleyen yüksek indirimli teklif yok.</span>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-hairline)]">
                {quotesNeedingApproval.map((quote) => {
                  const latest = getLatest(quote);
                  return (
                    <div key={quote.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-semibold text-[var(--text-primary)]">
                            {getClubName(quote.clubId)} ·{' '}
                            <span className="font-mono-num">{quote.quoteNumber}</span>
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 tabular-nums">
                            İndirim: %{latest.discountPercent}
                            {permission.canViewPricingAndContracts
                              ? ` · Genel Toplam: ${formatTRY(latest.grandTotal)}`
                              : ''}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenQuoteBuilder(quote.id)}
                          className="text-xs font-medium text-[var(--accent)] hover:underline whitespace-nowrap shrink-0"
                        >
                          İncele
                        </button>
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3 text-[11px]">
                          <StatusText
                            label={quote.managerApproved ? 'Yönetici Onaylı' : 'Yönetici Bekliyor'}
                            tone={quote.managerApproved ? 'success' : 'warning'}
                          />
                          <StatusText
                            label={quote.financeApproved ? 'Finans Onaylı' : 'Finans Bekliyor'}
                            tone={quote.financeApproved ? 'success' : 'warning'}
                          />
                        </div>

                        {currentUser.role === 'Yonetici' && !quote.managerApproved && (
                          <button
                            type="button"
                            onClick={() => onApproveQuote(quote.id, 'manager')}
                            className="px-2.5 py-1 rounded-[6px] text-[11px] font-medium bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] whitespace-nowrap"
                          >
                            Yönetici Onayı Ver
                          </button>
                        )}
                        {currentUser.role === 'Finans' && !quote.financeApproved && (
                          <button
                            type="button"
                            onClick={() => onApproveQuote(quote.id, 'finance')}
                            className="px-2.5 py-1 rounded-[6px] text-[11px] font-medium bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] whitespace-nowrap"
                          >
                            Finans Onayı Ver
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Görevler ve Son Aktiviteler */}
          <section className="p-5 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div
                role="tablist"
                aria-label="Operasyon akışı"
                className="inline-flex items-center p-1 rounded-[8px] bg-[var(--bg-subtle)]"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={opsTab === 'tasks'}
                  onClick={() => setOpsTab('tasks')}
                  className={`px-3 py-1 rounded-[6px] text-xs font-medium transition-colors whitespace-nowrap ${
                    opsTab === 'tasks'
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Açık Görevler ({filteredTasks.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={opsTab === 'activities'}
                  onClick={() => setOpsTab('activities')}
                  className={`px-3 py-1 rounded-[6px] text-xs font-medium transition-colors whitespace-nowrap ${
                    opsTab === 'activities'
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Son Aktiviteler ({recentActivities.length})
                </button>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('tasks')}
                className="text-xs font-medium text-[var(--accent)] hover:underline whitespace-nowrap"
              >
                Görevler &amp; Takvim
              </button>
            </div>

            {opsTab === 'tasks' ? (
              filteredTasks.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-4">
                  Bekleyen açık görev bulunmuyor.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--border-hairline)]">
                  {filteredTasks.slice(0, 5).map((task) => {
                    const overdue = isDateOverdue(task.dueDate, TODAY_ISO);
                    const soon = isDateWithinDays(task.dueDate, 1, TODAY_ISO);
                    return (
                      <li key={task.id} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => onToggleTask(task.id)}
                          aria-label={`Görevi tamamla: ${task.title}`}
                          className="mt-0.5 w-4 h-4 rounded-[4px] border border-[var(--border-strong)] hover:border-[var(--accent)] flex items-center justify-center shrink-0 transition-colors"
                        >
                          {task.completed && <Check className="w-3 h-3 text-[var(--status-success)]" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-[var(--text-primary)] leading-snug">
                            {task.title}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--text-muted)]">
                            <span>{getUserName(task.assigneeId)}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{formatDateTR(task.dueDate)}</span>
                            <span aria-hidden="true">·</span>
                            {overdue ? (
                              <span className="text-[var(--status-error)] font-medium">Gecikti</span>
                            ) : soon ? (
                              <span className="text-[var(--status-warning)] font-medium">Bugün / Yakın</span>
                            ) : (
                              <span>Planlı</span>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )
            ) : recentActivities.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-4">
                Seçili kapsamda aktivite kaydı bulunmuyor.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border-hairline)]">
                {recentActivities.slice(0, 5).map((act) => (
                  <li key={act.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--text-muted)]">
                      <span className="font-medium text-[var(--text-primary)]">
                        {act.type} · {getClubName(act.clubId)}
                      </span>
                      <span className="tabular-nums shrink-0">{formatDateTR(act.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                      {act.summary}
                    </p>
                    <div className="mt-1 text-[11px] text-[var(--text-muted)]">
                      Sorumlu: {getUserName(act.createdById)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* Alt İşlem Matrisi: Takip Gerektiren Teklifler / Kulüp & Sözleşme Takibi */}
      <section className="p-4 sm:p-5 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[var(--status-warning)] shrink-0" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Öncelikli Takip Matrisi
              </h2>
            </div>

            <div
              role="tablist"
              aria-label="Öncelikli takip görünümleri"
              className="inline-flex items-center p-1 rounded-[8px] bg-[var(--bg-subtle)]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={matrixTab === 'quotes'}
                onClick={() => setMatrixTab('quotes')}
                className={`px-3 py-1 rounded-[6px] text-xs font-medium transition-colors whitespace-nowrap ${
                  matrixTab === 'quotes'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Takip Gerektiren Teklifler ({attentionQuotes.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={matrixTab === 'clubs'}
                onClick={() => setMatrixTab('clubs')}
                className={`px-3 py-1 rounded-[6px] text-xs font-medium transition-colors whitespace-nowrap ${
                  matrixTab === 'clubs'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Kulüp &amp; Sözleşme Durumu ({priorityClubs.length})
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate(matrixTab === 'quotes' ? 'quotes' : 'clubs')}
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline whitespace-nowrap"
          >
            <span>{matrixTab === 'quotes' ? 'Teklif Listesine Git' : 'Kulüp Hesaplarına Git'}</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        {matrixTab === 'quotes' ? (
          attentionQuotes.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] py-3">
              Şu anda acil aksiyon veya takip bekleyen teklif bulunmuyor.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-hairline)] text-[var(--text-muted)]">
                    <th className="py-2.5 pr-4 font-medium">Kulüp ve Teklif</th>
                    <th className="py-2.5 px-3 font-medium">Paket &amp; Kapsam</th>
                    <th className="py-2.5 px-3 font-medium">Durum</th>
                    <th className="py-2.5 px-3 font-medium">Hazırlayan</th>
                    {permission.canViewPricingAndContracts && (
                      <th className="py-2.5 px-3 font-medium text-right">Genel Toplam</th>
                    )}
                    <th className="py-2.5 px-3 font-medium text-right">Geçerlilik Tarihi</th>
                    <th className="py-2.5 pl-3 font-medium text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-hairline)]">
                  {attentionQuotes.map((q) => {
                    const latest = getLatest(q);
                    const club = getClub(q.clubId);
                    const expiringSoon = isDateWithinDays(q.validUntil, 5, TODAY_ISO);
                    return (
                      <tr key={q.id} className="hover:bg-[var(--bg-subtle)]/50">
                        <td className="py-2.5 pr-4">
                          <div className="font-medium text-[var(--text-primary)]">
                            {club?.name ?? 'Kulüp'}
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)] font-mono-num">
                            {q.quoteNumber} · v{q.currentVersion}
                            {club ? ` · ${club.city}` : ''}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-[var(--text-secondary)]">
                          <div>{getPackageLabel(latest.packageId)}</div>
                          <div className="text-[11px] text-[var(--text-muted)] tabular-nums">
                            {formatNumberTR(latest.athleteCount)} sporcu ·{' '}
                            {latest.billingCycle === 'yillik' ? 'Yıllık Plan' : 'Aylık Plan'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <StatusText
                            label={q.status}
                            tone={
                              q.status === 'Onay Bekliyor' || q.status === 'Revizyon Talep Edildi'
                                ? 'warning'
                                : q.status === 'Gönderildi'
                                  ? 'info'
                                  : 'neutral'
                            }
                          />
                        </td>
                        <td className="py-2.5 px-3 text-[var(--text-secondary)] whitespace-nowrap">
                          {getUserName(q.createdById)}
                        </td>
                        {permission.canViewPricingAndContracts && (
                          <td className="py-2.5 px-3 text-right tabular-nums font-medium text-[var(--text-primary)] whitespace-nowrap">
                            {formatTRY(latest.grandTotal, false)}
                          </td>
                        )}
                        <td
                          className={`py-2.5 px-3 text-right tabular-nums font-medium whitespace-nowrap ${
                            expiringSoon
                              ? 'text-[var(--status-error)]'
                              : 'text-[var(--status-warning)]'
                          }`}
                        >
                          {formatDateTR(q.validUntil)}
                        </td>
                        <td className="py-2.5 pl-3 text-right">
                          <div className="inline-flex items-center justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => onOpenProposalPreview(q.id)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline whitespace-nowrap"
                            >
                              <FileCheck2 className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Önizle</span>
                            </button>
                            {permission.canCreateOrEditQuotes && (
                              <button
                                type="button"
                                onClick={() => onOpenQuoteBuilder(q.id)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline whitespace-nowrap"
                              >
                                <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Düzenle</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-hairline)] text-[var(--text-muted)]">
                  <th className="py-2.5 pr-4 font-medium">Kulüp ve Konum</th>
                  <th className="py-2.5 px-3 font-medium">Kurum &amp; Branşlar</th>
                  <th className="py-2.5 px-3 font-medium text-right">Sporcu</th>
                  <th className="py-2.5 px-3 font-medium">SportsFly Durumu</th>
                  <th className="py-2.5 px-3 font-medium">Sözleşme / Yenileme</th>
                  {permission.canViewPricingAndContracts && (
                    <th className="py-2.5 px-3 font-medium text-right">Yıllık Değer</th>
                  )}
                  <th className="py-2.5 pl-3 font-medium text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-hairline)]">
                {priorityClubs.slice(0, 6).map((club) => (
                  <tr key={club.id} className="hover:bg-[var(--bg-subtle)]/50">
                    <td className="py-2.5 pr-4">
                      <div className="font-medium text-[var(--text-primary)]">{club.name}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">{club.city}</div>
                    </td>
                    <td className="py-2.5 px-3 text-[var(--text-secondary)]">
                      <div>{club.type}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {club.branches.join(', ')}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-medium text-[var(--text-primary)]">
                      {formatNumberTR(club.estimatedAthletes)}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusText
                        label={club.sportsflyStatus}
                        tone={
                          club.sportsflyStatus === 'Aktif'
                            ? 'success'
                            : club.sportsflyStatus === 'Pilot'
                              ? 'info'
                              : club.sportsflyStatus === 'Geçmiş Müşteri'
                                ? 'warning'
                                : 'neutral'
                        }
                      />
                    </td>
                    <td className="py-2.5 px-3 text-[var(--text-secondary)]">
                      <div>{club.contractStatus}</div>
                      {club.contractRenewalDate && (
                        <div className="text-[11px] text-[var(--text-muted)] tabular-nums">
                          Yenileme: {formatDateTR(club.contractRenewalDate)}
                        </div>
                      )}
                    </td>
                    {permission.canViewPricingAndContracts && (
                      <td className="py-2.5 px-3 text-right tabular-nums font-medium text-[var(--text-primary)] whitespace-nowrap">
                        {club.annualContractValue
                          ? formatTRY(club.annualContractValue, false)
                          : '—'}
                      </td>
                    )}
                    <td className="py-2.5 pl-3 text-right">
                      {permission.canCreateOrEditQuotes ? (
                        <button
                          type="button"
                          onClick={onNewQuote}
                          className="text-xs font-medium text-[var(--accent)] hover:underline whitespace-nowrap"
                        >
                          Teklif Hazırla
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onNavigate('clubs')}
                          className="text-xs font-medium text-[var(--accent)] hover:underline whitespace-nowrap"
                        >
                          Kulübe Git
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
