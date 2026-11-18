import React, { useMemo, useState } from 'react';
import { ExternalLink, FileSpreadsheet, FileText, Plus, Search, ShieldAlert } from 'lucide-react';
import type {
  Club,
  ProductPackage,
  Quote,
  QuoteStatus,
  RolePermission,
  User,
} from '../types/crm';
import { formatDateTR, formatNumberTR, formatTRY, NO_PACKAGE_ID } from '../utils/formatters';
import { EmptyState, StatusText, type StatusTone } from './ui';

interface QuotesViewProps {
  quotes: Quote[];
  clubs: Club[];
  packages: ProductPackage[];
  users: User[];
  permission: RolePermission;
  onOpenQuoteBuilder: (quoteId?: string) => void;
  onOpenDigitalApproval: (quoteId: string) => void;
  onOpenProposalPreview: (quoteId: string) => void;
}

export function QuotesView({
  quotes,
  clubs,
  packages,
  users,
  permission,
  onOpenQuoteBuilder,
  onOpenDigitalApproval,
  onOpenProposalPreview,
}: QuotesViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const getClubName = (id: string) => clubs.find((c) => c.id === id)?.name ?? 'Kulüp';
  const getUserName = (id: string) => users.find((u) => u.id === id)?.name ?? '';
  const getScopeLabel = (quote: Quote) => {
    const latest = quote.versions[quote.versions.length - 1];
    const pkgName =
      latest.packageId === NO_PACKAGE_ID
        ? 'Sadece Ek Modüller'
        : packages.find((p) => p.id === latest.packageId)?.name ?? quote.templateName;
    return `${pkgName} · ${latest.selectedModules.length} modül`;
  };

  const statusTone = (status: QuoteStatus): StatusTone => {
    switch (status) {
      case 'Müşteri Onayladı':
        return 'success';
      case 'Onay Bekliyor':
      case 'Revizyon Talep Edildi':
        return 'warning';
      case 'Süresi Doldu':
        return 'error';
      case 'Gönderildi':
        return 'info';
      default:
        return 'neutral';
    }
  };

  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      if (statusFilter !== 'all' && q.status !== statusFilter) return false;
      const term = search.trim().toLowerCase();
      if (!term) return true;
      return (
        q.quoteNumber.toLowerCase().includes(term) ||
        getClubName(q.clubId).toLowerCase().includes(term) ||
        getScopeLabel(q).toLowerCase().includes(term)
      );
    });
  }, [quotes, statusFilter, search, clubs, packages]);

  return (
    <div className="space-y-4">
      {!permission.canViewPricingAndContracts && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-xs text-[var(--text-secondary)]">
          <ShieldAlert className="w-4 h-4 text-[var(--status-warning)] shrink-0" />
          <span>
            Rol bazlı erişim kontrolü aktif: Fiyatlandırma ve indirim oranları yetkiniz dışındadır.
          </span>
        </div>
      )}

      <div className="p-3 sm:p-4 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
          <div className="relative flex-1 min-w-0 sm:min-w-[200px] sm:max-w-md">
            <Search
              className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Teklif no veya kulüp ara..."
              aria-label="Tekliflerde ara"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)]"
            />
          </div>

          <select
            aria-label="Teklif durumuna göre filtrele"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)]"
          >
            <option value="all">Durum: Tümü</option>
            <option value="Taslak">Taslak</option>
            <option value="Onay Bekliyor">Onay Bekliyor</option>
            <option value="Gönderildi">Gönderildi</option>
            <option value="Müşteri Onayladı">Müşteri Onayladı</option>
            <option value="Revizyon Talep Edildi">Revizyon Talep Edildi</option>
            <option value="Süresi Doldu">Süresi Doldu</option>
          </select>
        </div>

        {permission.canCreateOrEditQuotes && (
          <button
            type="button"
            onClick={() => onOpenQuoteBuilder(undefined)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-[8px] text-xs font-medium bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Yeni Teklif Hazırla</span>
          </button>
        )}
      </div>

      {filteredQuotes.length === 0 ? (
        <EmptyState
          icon={FileSpreadsheet}
          title="Teklif bulunamadı"
          description="Seçilen kriterlere uygun teklif kaydı yok. Yeni bir teklif oluşturarak başlayabilirsiniz."
          actionLabel={permission.canCreateOrEditQuotes ? 'Yeni Teklif Hazırla' : undefined}
          onAction={
            permission.canCreateOrEditQuotes ? () => onOpenQuoteBuilder(undefined) : undefined
          }
        />
      ) : (
        <div className="rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-hidden">
          {/* Mobil Kart Görünümü */}
          <div className="md:hidden divide-y divide-[var(--border-hairline)]">
            {filteredQuotes.map((quote) => {
              const latest = quote.versions[quote.versions.length - 1];
              return (
                <div key={quote.id} className="p-4 space-y-2.5 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-[var(--text-primary)] font-mono-num">
                        {quote.quoteNumber} · v{quote.currentVersion}
                      </div>
                      <div className="font-medium text-[var(--text-primary)] mt-0.5">
                        {getClubName(quote.clubId)}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {getScopeLabel(quote)}
                      </div>
                    </div>
                    <StatusText label={quote.status} tone={statusTone(quote.status)} />
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--text-secondary)] tabular-nums">
                    <span>{formatNumberTR(latest.athleteCount)} sporcu</span>
                    <span aria-hidden="true">·</span>
                    <span>Geçerlilik: {formatDateTR(quote.validUntil)}</span>
                    {permission.canViewPricingAndContracts && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>
                          {latest.billingCycle === 'yillik' ? 'Yıllık Peşin' : 'Aylık'} (%{latest.effectiveTotalDiscountPercent} indirim)
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-[var(--text-primary)]">
                          {formatTRY(latest.grandTotal)}
                          {latest.billingCycle === 'aylik' ? ' / ay' : ''}
                        </span>
                      </>
                    )}
                  </div>

                  {quote.requiresDualApproval && (
                    <div className="text-[11px] text-[var(--text-muted)]">
                      Yönetici: {quote.managerApproved ? 'Tamam' : 'Bekliyor'} · Finans:{' '}
                      {quote.financeApproved ? 'Tamam' : 'Bekliyor'}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onOpenProposalPreview(quote.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-primary)]"
                    >
                      <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Teklif Formu (PDF)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenDigitalApproval(quote.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-secondary)]"
                    >
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Onay Linki</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenQuoteBuilder(quote.id)}
                      className="px-2.5 py-1.5 rounded-[6px] bg-[var(--accent-soft)] text-xs font-medium text-[var(--accent)]"
                    >
                      Düzenle / Detay
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Masaüstü Tablo Görünümü */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)]/50 text-[var(--text-muted)]">
                  <th className="py-3 px-4 font-medium">Teklif No & Sürüm</th>
                  <th className="py-3 px-3 font-medium">Kulüp ve Kapsam</th>
                  <th className="py-3 px-3 font-medium">Durum</th>
                  <th className="py-3 px-3 font-medium text-right">Sporcu</th>
                  {permission.canViewPricingAndContracts && (
                    <>
                      <th className="py-3 px-3 font-medium text-right">İndirim</th>
                      <th className="py-3 px-3 font-medium text-right">Genel Toplam (KDV %20)</th>
                    </>
                  )}
                  <th className="py-3 px-3 font-medium">Geçerlilik</th>
                  <th className="py-3 px-4 font-medium text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-hairline)]">
                {filteredQuotes.map((quote) => {
                  const latest = quote.versions[quote.versions.length - 1];
                  return (
                    <tr key={quote.id} className="hover:bg-[var(--bg-subtle)]/40">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[var(--text-primary)] font-mono-num">
                          {quote.quoteNumber}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                          v{quote.currentVersion} · {getUserName(quote.createdById)}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-[var(--text-primary)]">
                          {getClubName(quote.clubId)}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                          {getScopeLabel(quote)}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <StatusText label={quote.status} tone={statusTone(quote.status)} />
                        {quote.requiresDualApproval && (
                          <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                            Yönetici: {quote.managerApproved ? 'Tamam' : 'Bekliyor'} · Finans:{' '}
                            {quote.financeApproved ? 'Tamam' : 'Bekliyor'}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-[var(--text-secondary)]">
                        {formatNumberTR(latest.athleteCount)}
                      </td>
                      {permission.canViewPricingAndContracts && (
                        <>
                          <td className="py-3 px-3 text-right tabular-nums">
                            <span
                              className={
                                latest.discountPercent > 20
                                  ? 'text-[var(--status-warning)] font-semibold'
                                  : 'text-[var(--text-secondary)]'
                              }
                            >
                              %{latest.effectiveTotalDiscountPercent}
                            </span>
                            {latest.annualPlanDiscountPercent > 0 && (
                              <div className="text-[10px] text-[var(--text-muted)]">
                                %20 Yıllık{latest.discountPercent > 0 ? ` + %${latest.discountPercent} Ek` : ''}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right tabular-nums font-semibold text-[var(--text-primary)]">
                            <div>
                              {formatTRY(latest.grandTotal)}
                              {latest.billingCycle === 'aylik' ? ' / ay' : ''}
                            </div>
                            <div className="text-[10px] font-normal text-[var(--text-muted)]">
                              {latest.billingCycle === 'yillik'
                                ? `Yıllık Peşin (${formatTRY(Math.round(latest.netTotal / 12), false)}/ay net)`
                                : 'Aylık Ödeme'}
                            </div>
                          </td>
                        </>
                      )}
                      <td className="py-3 px-3 tabular-nums text-[var(--text-secondary)]">
                        {formatDateTR(quote.validUntil)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => onOpenProposalPreview(quote.id)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-primary)] hover:text-[var(--accent)] whitespace-nowrap"
                          >
                            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Teklif Formu (PDF)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenDigitalApproval(quote.id)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] whitespace-nowrap"
                          >
                            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Onay Linki</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenQuoteBuilder(quote.id)}
                            className="text-xs font-medium text-[var(--accent)] hover:underline whitespace-nowrap"
                          >
                            Düzenle / Detay
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
