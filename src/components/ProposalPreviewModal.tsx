import React, { useState } from 'react';
import { Check, Download, ExternalLink, FileCheck2, X } from 'lucide-react';
import type {
  AthleteTier,
  Club,
  Contact,
  ProductModule,
  ProductPackage,
  Quote,
  QuoteRequest,
  User,
} from '../types/crm';
import { formatDateTR, formatNumberTR, formatTRY } from '../utils/formatters';
import {
  PROPOSAL_FORMAT_OPTIONS,
  SPORTSFLY_LOGO_URL,
  type ProposalFormat,
} from '../utils/proposalPdfGenerator';

interface ProposalPreviewModalProps {
  quote: Quote;
  request?: QuoteRequest;
  club?: Club;
  contact?: Contact;
  owner?: User;
  pkg?: ProductPackage;
  tier?: AthleteTier;
  modules: ProductModule[];
  selectedFormat: ProposalFormat;
  onFormatChange: (format: ProposalFormat) => void;
  onClose: () => void;
  onDownloadAndSavePdf: (quote: Quote, format: ProposalFormat) => Promise<void>;
  onOpenDigitalApproval: (quoteId: string) => void;
}

export function ProposalPreviewModal({
  quote,
  request,
  club,
  contact,
  owner,
  pkg,
  tier,
  modules,
  selectedFormat,
  onFormatChange,
  onClose,
  onDownloadAndSavePdf,
  onOpenDigitalApproval,
}: ProposalPreviewModalProps) {
  const [activePage, setActivePage] = useState<'all' | 1 | 2 | 3>('all');
  const [isExporting, setIsExporting] = useState(false);

  const latest = quote.versions[quote.versions.length - 1];
  const isYearly = latest.billingCycle === 'yillik';
  const annualPrepaidWithVat = Math.round(
    latest.annualPrepaidAmount * (1 + latest.vatRate / 100)
  );
  const dateStr = formatDateTR(latest.createdAt);
  const validUntilStr = formatDateTR(quote.validUntil);
  const clubName = club?.name ?? 'Spor Kulübü';

  const currentFormatMeta =
    PROPOSAL_FORMAT_OPTIONS.find((f) => f.id === selectedFormat) ?? PROPOSAL_FORMAT_OPTIONS[1];
  const totalPages = currentFormatMeta.pageCount;

  const handleSelectFormat = (nextFormat: ProposalFormat) => {
    onFormatChange(nextFormat);
    setActivePage('all');
  };

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      await onDownloadAndSavePdf(quote, selectedFormat);
    } finally {
      setIsExporting(false);
    }
  };

  const showPage = (pageNum: 1 | 2 | 3) => activePage === 'all' || activePage === pageNum;

  const formatSelectedModuleName = (k: typeof latest.selectedModules[number]) => {
    const baseName = modules.find((m) => m.key === k)?.name ?? k;
    if (k === 'SportsFlyLab' && !pkg?.includedModules.includes(k)) {
      const count = latest.labAthleteCount ?? latest.athleteCount;
      const modeLabel = latest.labMode === 'analiz' ? 'Karne + Analiz' : 'Sadece Karne';
      return `${baseName} (${formatNumberTR(count)} sporcu · ${modeLabel})`;
    }
    if (k === 'TurnuvaFikstur' && !pkg?.includedModules.includes(k)) {
      return `${baseName} (${
        latest.tournamentMode === 'single' ? 'Tek Turnuva 5.000 ₺' : 'Aylık +399 ₺'
      })`;
    }
    return baseName;
  };

  const includedModulesList = latest.selectedModules
    .filter((k) => pkg?.includedModules.includes(k))
    .map((k) => modules.find((m) => m.key === k)?.name ?? k);
  const addonModulesList = latest.selectedModules
    .filter((k) => !pkg?.includedModules.includes(k))
    .map(formatSelectedModuleName);

  const TopColorBand = () => (
    <div className="h-2 -mx-5 sm:-mx-12 -mt-5 sm:-mt-12 mb-6 sm:mb-8 flex rounded-t-[10px] overflow-hidden">
      <div className="w-[82%] bg-[#091124]" />
      <div className="w-[18%] bg-[#b9f33d]" />
    </div>
  );

  const PageHeader = () => (
    <div className="flex items-center justify-between gap-4 pb-4 mb-6 border-b border-[#e4e9f2]">
      <div className="flex items-center gap-3 min-w-0">
        <img
          src={SPORTSFLY_LOGO_URL}
          alt="SportsFly Logo"
          className="w-10 h-10 sm:w-11 sm:h-11 object-contain rounded-[8px] border border-[#e4e9f2] bg-white shrink-0"
        />
        <div className="text-lg font-bold tracking-tight leading-none">
          <span className="text-[#091124]">Sports</span>
          <span className="text-[#0b5fff]">Fly</span>
        </div>
      </div>

      <div className="text-right min-w-0 max-w-[58%]">
        <div className="text-xs sm:text-sm font-bold text-[#091124] truncate">{clubName}</div>
        <div className="text-[11px] font-medium text-slate-500 tabular-nums mt-0.5">
          Teklif Geçerlilik Tarihi:{' '}
          <span className="text-[#091124] font-semibold">{validUntilStr}</span>
        </div>
      </div>
    </div>
  );

  const PageFooter = () => (
    <div className="mt-8 pt-4 border-t border-[#e4e9f2] flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
      <span>
        SportsFly Bilişim Teknolojileri · {clubName} için özel hazırlanmıştır · {dateStr}
      </span>
      <span className="text-[#091124] font-semibold tabular-nums">
        0216 850 19 07 · www.sportsfly.com.tr
      </span>
    </div>
  );

  const SummaryAndRulesSection = () => (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
      <div className="md:col-span-6 rounded-[10px] border border-[#e4e9f2] bg-white overflow-hidden text-xs">
        <div className="h-1.5 bg-[#b9f33d]" />
        <div className="p-4 space-y-2">
          <div className="font-bold text-[#091124]">Koşullar ve Güvence</div>
          <ul className="space-y-1.5 text-slate-600">
            <li className="flex items-start gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#091124] mt-0.5 shrink-0" />
              <span>
                Ödeme Planı:{' '}
                <strong>
                  {isYearly ? 'Yıllık Peşin (%20 İndirim Aktif)' : 'Aylık Ödeme'}
                </strong>{' '}
                · Toplam <strong>%{latest.effectiveTotalDiscountPercent}</strong> indirim
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#091124] mt-0.5 shrink-0" />
              <span>Geçerlilik: {quote.validityDays} gün ({validUntilStr} tarihine kadar)</span>
            </li>
            <li className="flex items-start gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#091124] mt-0.5 shrink-0" />
              <span>
                Standart %{latest.vatRate} KDV ·{' '}
                {quote.requiresDualApproval
                  ? `%${latest.discountPercent} ek kurumsal indirim (Yönetici & Finans onaylı)`
                  : 'Mevcut Excel listenizle ek cihaz gerekmeden hızlı kurulum'}
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#091124] mt-0.5 shrink-0" />
              <span>KVKK güvencesi: Tüm veriler rol yetkili ve şifreli altyapıda saklanır</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="md:col-span-6 rounded-[10px] border border-[#091124] bg-[#f7f9fc] overflow-hidden text-xs">
        <div className="p-5 space-y-2">
          {latest.annualPlanDiscountPercent > 0 ? (
            <>
              <div className="flex justify-between text-slate-500">
                <span>12 Aylık Liste Tutarı</span>
                <span className="tabular-nums line-through">
                  {formatTRY(latest.annualListTotal ?? latest.monthlyListAmount * 12)}
                </span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Yıllık Plan İndirimi (%{latest.annualPlanDiscountPercent})</span>
                <span className="tabular-nums font-semibold">
                  -{formatTRY(latest.annualPlanSavingsAmount)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Yıllık Peşin Ara Toplam</span>
                <span className="tabular-nums font-medium text-[#091124]">
                  {formatTRY(latest.subtotal)}
                </span>
              </div>
            </>
          ) : (
            <div className="flex justify-between text-slate-600">
              <span>Ara Toplam</span>
              <span className="tabular-nums font-medium text-[#091124]">
                {formatTRY(latest.subtotal)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-red-700">
            <span>Ek Kurumsal İndirim (%{latest.discountPercent})</span>
            <span className="tabular-nums font-medium">
              -{formatTRY(latest.discountAmount)}
            </span>
          </div>
          {latest.prepaidEnabled && (latest.prepaidDiscountPercent ?? 0) > 0 && (
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Yıllık Peşin Ekstra İndirim (%{latest.prepaidDiscountPercent})</span>
              <span className="tabular-nums">
                -{formatTRY(latest.prepaidDiscountAmount ?? 0)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-[#0b5fff] font-semibold">
            <span>Toplam İndirim Oranı</span>
            <span className="tabular-nums">%{latest.effectiveTotalDiscountPercent}</span>
          </div>
          <div className="flex justify-between text-slate-600 pt-1 border-t border-[#e4e9f2]">
            <span>Net Tutar (KDV Hariç)</span>
            <span className="tabular-nums font-semibold text-[#091124]">
              {formatTRY(latest.netTotal)}
            </span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>KDV (%{latest.vatRate})</span>
            <span className="tabular-nums font-medium text-[#091124]">
              +{formatTRY(latest.vatAmount)}
            </span>
          </div>
        </div>
        <div className="px-5 py-3.5 bg-[#091124] space-y-1.5">
          <div className="flex flex-wrap justify-between items-baseline gap-2">
            <span className="text-sm font-bold text-white">
              {isYearly ? 'YILLIK PEŞİN TOPLAM (KDV DAHİL)' : 'AYLIK TOPLAM (KDV DAHİL)'}
            </span>
            <span className="text-lg font-bold text-[#b9f33d] tabular-nums">
              {formatTRY(latest.grandTotal)}
              {!isYearly ? ' / ay' : ''}
            </span>
          </div>
          <div className="flex flex-wrap justify-between items-center gap-2 text-[11px] text-slate-300 border-t border-white/10 pt-1.5">
            <span>
              {isYearly
                ? 'Aylık Net Karşılık (KDV Hariç)'
                : 'Yıllık Peşin Seçilirse (%20 Avantaj)'}
            </span>
            <span className="tabular-nums font-semibold text-white">
              {isYearly
                ? `${formatTRY(Math.round(latest.netTotal / 12), false)} / ay`
                : formatTRY(annualPrepaidWithVat)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const ApprovalAndSignatureSection = () => (
    <>
      <div className="mt-5 rounded-[10px] bg-[#091124] overflow-hidden flex text-xs">
        <div className="w-1.5 bg-[#b9f33d] shrink-0" />
        <div className="p-4">
          <div className="font-bold text-[#b9f33d] font-mono-num">
            Dijital Onay Bağlantısı: /onay/{quote.digitalApprovalToken}
          </div>
          <div className="text-slate-200 mt-1">
            Kulüp yetkilisi bu bağlantı üzerinden teklifi tek tıkla onaylayabilir veya revizyon talep edebilir.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6 text-xs">
        <div className="rounded-[10px] border border-[#e4e9f2] overflow-hidden">
          <div className="h-1.5 bg-[#091124]" />
          <div className="p-4">
            <div className="font-bold text-[#091124]">SportsFly Bilişim Teknolojileri</div>
            <div className="text-slate-600 mt-1">{owner?.name ?? 'SportsFly Satış Ekibi'}</div>
            <div className="text-slate-500">{owner?.title ?? 'Kurumsal Satış Temsilcisi'}</div>
            <div className="mt-8 pt-2 border-t border-slate-300 text-slate-400">
              Kaşe / İmza / Tarih
            </div>
          </div>
        </div>

        <div className="rounded-[10px] border border-[#e4e9f2] overflow-hidden">
          <div className="h-1.5 bg-[#b9f33d]" />
          <div className="p-4">
            <div className="font-bold text-[#091124]">{clubName}</div>
            <div className="text-slate-600 mt-1">{contact?.fullName ?? 'Kulüp Yetkilisi'}</div>
            <div className="text-slate-500">{contact?.roleTitle ?? 'Yetkili İmza'}</div>
            <div className="mt-8 pt-2 border-t border-slate-300 text-slate-400">
              Kaşe / İmza / Tarih
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const pageFilterItems: Array<'all' | 1 | 2 | 3> =
    totalPages === 1 ? [1] : totalPages === 2 ? ['all', 1, 2] : ['all', 1, 2, 3];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="proposal-preview-title"
      className="fixed inset-0 z-50 flex flex-col bg-slate-900/70"
    >
      {/* Üst Kontrol Çubuğu */}
      <div className="px-4 sm:px-6 py-3 bg-[var(--bg-surface)] border-b border-[var(--border-hairline)] space-y-2.5 shrink-0 no-print">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <FileCheck2 className="w-4 h-4 text-[var(--accent)] shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <h2
                id="proposal-preview-title"
                className="text-sm font-semibold text-[var(--text-primary)] truncate"
              >
                {currentFormatMeta.label} — {clubName}
              </h2>
              <p className="text-[11px] text-[var(--text-muted)] truncate">
                {currentFormatMeta.description}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenDigitalApproval(quote.id);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-xs font-medium border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Müşteri Onay Ekranı</span>
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-xs font-semibold bg-[var(--brand-lime)] text-[var(--brand-lime-fg)] hover:bg-[var(--brand-lime-hover)] disabled:opacity-60 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>
                {isExporting
                  ? 'PDF Oluşturuluyor...'
                  : `${totalPages} Sayfalık PDF İndir ve Kaydet`}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="p-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Teklif Formatı Seçici & Sayfa Filtresi */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--border-hairline)]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-[var(--text-muted)] mr-1">
              Teklif Formatı:
            </span>
            <div className="flex flex-wrap items-center gap-1 p-1 rounded-[8px] bg-[var(--bg-subtle)] text-xs">
              {PROPOSAL_FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectFormat(opt.id)}
                  className={`px-2.5 py-1 rounded-[6px] font-medium whitespace-nowrap transition-colors ${
                    selectedFormat === opt.id
                      ? 'bg-[var(--brand-navy)] text-[var(--brand-lime)] shadow-[var(--shadow-sm)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {opt.shortLabel}
                </button>
              ))}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1 p-1 rounded-[8px] bg-[var(--bg-subtle)] text-xs overflow-x-auto">
              {pageFilterItems.map((p) => (
                <button
                  key={String(p)}
                  type="button"
                  onClick={() => setActivePage(p)}
                  className={`px-2.5 py-1 rounded-[6px] font-medium whitespace-nowrap ${
                    activePage === p
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {p === 'all' ? `Tüm ${totalPages} Sayfa` : `Sayfa ${p}`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* A4 Sayfalar Alanı */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 bg-[#eff3f9] dark:bg-[#070d19]">
        {/* ==================== FORMAT 1: 1 SAYFA (HIZLI TEKLİF) ==================== */}
        {selectedFormat === '1-sayfa' && (
          <article className="max-w-[820px] mx-auto bg-white text-[#091124] p-5 sm:p-12 rounded-[10px] shadow-[var(--shadow-md)] border border-[#e4e9f2]">
            <TopColorBand />
            <PageHeader />

            <div className="rounded-[12px] bg-[#091124] p-5 sm:p-6 text-white">
              <div className="w-10 h-1 bg-[#b9f33d] mb-3" />
              <h3 className="text-2xl font-bold text-white leading-tight">{clubName}</h3>
              <div className="text-base font-bold text-[#b9f33d] mt-1">{quote.templateName}</div>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                Aidat takibini otomatikleştirin; yoklama, dijital karne ve veli iletişimini tek panelden yönetin.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-[10px] border border-[#e4e9f2] bg-white space-y-2">
                <div className="font-bold text-[#091124] text-sm">Kulüp ve Teklif Özeti</div>
                <dl className="space-y-1.5">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Kulüp</dt>
                    <dd className="font-semibold text-right">{clubName} ({club?.city ?? '—'})</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Ölçek</dt>
                    <dd className="font-semibold text-right tabular-nums">
                      {formatNumberTR(latest.athleteCount)} sporcu · {club?.branches.join(', ') ?? '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Yetkili</dt>
                    <dd className="font-semibold text-right">{contact?.fullName ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Geçerlilik</dt>
                    <dd className="font-semibold text-right tabular-nums">
                      {dateStr} → {validUntilStr}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Paket & Plan</dt>
                    <dd className="font-semibold text-right">
                      {pkg?.name ?? 'Sadece Ek Modüller'} ({isYearly ? 'Yıllık Peşin' : 'Aylık'})
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="p-4 rounded-[10px] border border-[#e4e9f2] bg-[#f7f9fc] space-y-2.5">
                <div className="font-bold text-[#091124] text-sm">Kulübünüze 3 Somut Katkısı</div>
                {[
                  ['1. Otomatik Aidat', 'Velilere WhatsApp/SMS ödeme linki gider; gecikmeler azalır.'],
                  ['2. Cepten Yoklama & Karne', 'Antrenör sahadan yoklama alır, veliye gelişim karnesi ulaşır.'],
                  ['3. Aynı Hafta Kurulum', 'Mevcut Excel listenizle ek cihaz olmadan hemen başlarsınız.'],
                ].map(([t, d]) => (
                  <div key={t} className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#0b5fff] mt-1.5 shrink-0" />
                    <div>
                      <div className="font-bold text-[#091124]">{t}</div>
                      <div className="text-slate-600 text-[11px]">{d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 overflow-x-auto border border-[#e4e9f2] rounded-[8px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#091124] text-white">
                    <th className="py-2.5 px-4 font-semibold">Kapsam Kalemi</th>
                    <th className="py-2.5 px-3 font-semibold">Detay</th>
                    <th className="py-2.5 px-4 font-semibold text-right text-[#b9f33d]">
                      {isYearly ? 'Yıllık Peşin (KDV Hariç)' : 'Aylık Tutar (KDV Hariç)'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e4e9f2]">
                  {pkg ? (
                    <>
                      <tr>
                        <td className="py-2.5 px-4 font-semibold">{pkg.name}</td>
                        <td className="py-2.5 px-3 text-slate-600">Temel kulüp yönetim ve tahsilat altyapısı</td>
                        <td className="py-2.5 px-4 text-right tabular-nums font-semibold">
                          {formatTRY(latest.packageBaseAmount)}
                        </td>
                      </tr>
                      <tr className="bg-[#f7f9fc]">
                        <td className="py-2.5 px-4 font-semibold">
                          Sporcu Kapasite Kademesi ({tier?.label})
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {formatNumberTR(latest.athleteCount)} aktif sporcu ölçeği
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums font-semibold">
                          +{formatTRY(latest.tierAdjustmentAmount)}
                        </td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td className="py-2.5 px-4 font-semibold">Ana Paket Durumu</td>
                      <td className="py-2.5 px-3 text-slate-600">
                        Paket seçilmedi (Modül bazlı teklif · {formatNumberTR(latest.athleteCount)} sporcu)
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-slate-500">—</td>
                    </tr>
                  )}
                  <tr>
                    <td className="py-2.5 px-4 font-semibold">
                      Seçili Modüller ({latest.selectedModules.length} modül)
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {latest.selectedModules.map(formatSelectedModuleName).join(', ')}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums font-semibold">
                      {latest.addonModulesAmount > 0
                        ? `+${formatTRY(latest.addonModulesAmount)}`
                        : 'Pakete Dahil'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <SummaryAndRulesSection />
            <ApprovalAndSignatureSection />
            <PageFooter />
          </article>
        )}

        {/* ==================== FORMAT 2: 2 SAYFA (YÖNETİCİ ÖZETİ - ÖNERİLEN) ==================== */}
        {selectedFormat === '2-sayfa' && (
          <>
            {showPage(1) && (
              <article className="max-w-[820px] mx-auto bg-white text-[#091124] p-5 sm:p-12 rounded-[10px] shadow-[var(--shadow-md)] border border-[#e4e9f2]">
                <TopColorBand />
                <PageHeader />

                <div className="rounded-[12px] bg-[#091124] p-6 sm:p-7 text-white">
                  <div className="w-10 h-1 bg-[#b9f33d] mb-3" />
                  <h3 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                    {clubName}
                  </h3>
                  <div className="text-lg font-bold text-[#b9f33d] mt-1">{quote.templateName}</div>
                  <p className="mt-2.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Aidat takibini otomatikleştirin; yoklama, sporcu gelişim karnesi ve veli iletişimini tek uygulamada toplayın.
                  </p>
                </div>

                {/* Kulüp ve Talep Bilgileri (4 temiz satır) */}
                <div className="mt-6">
                  <div className="text-sm font-bold text-[#091124] mb-2.5">
                    Kulüp ve Teklif Bilgileri
                  </div>
                  <dl className="rounded-[10px] border border-[#e4e9f2] divide-y divide-[#e4e9f2] text-xs bg-white">
                    {[
                      ['Teklif Sunulan Kurum', `${clubName} (${club?.type ?? 'Spor Kulübü'} · ${club?.city ?? '—'})`],
                      ['Branşlar ve Sporcu Ölçeği', `${club?.branches.join(', ') ?? '—'} · ${formatNumberTR(latest.athleteCount)} tahmini sporcu`],
                      ['Kulüp Yetkilisi & Kapsam', `${contact?.fullName ?? '—'} (${contact?.roleTitle ?? 'Yetkili'}) · ${request?.title ?? pkg?.name ?? 'Sadece Ek Modüller'}`],
                      ['Hazırlayan & Geçerlilik', `${owner?.name ?? 'SportsFly Ekibi'} · ${dateStr} — Son Geçerlilik: ${validUntilStr}`],
                    ].map(([k, v]) => (
                      <div key={k} className="px-4 py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                        <dt className="text-slate-500 font-medium">{k}</dt>
                        <dd className="sm:col-span-2 text-[#091124] font-semibold">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                {/* SportsFly ile Neler Değişir? */}
                <div className="mt-6">
                  <div className="text-sm font-bold text-[#091124] mb-3">
                    SportsFly ile Kulübünüzde Neler Değişir?
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {[
                      {
                        tag: 'OTOMATİK AİDAT',
                        title: 'Geciken Aidat Takibi Biter',
                        desc: 'Velilere WhatsApp ve SMS ile tek tık ödeme linki gönderilir. Tahsilatlar otomatik işlenir, hatırlatmalar sistem tarafından yapılır.',
                        lime: true,
                      },
                      {
                        tag: 'SAHA & VELİ',
                        title: 'Cepten Yoklama ve Karne',
                        desc: 'Antrenörler sahadan saniyeler içinde yoklama alır. Devamlılık ve gelişim karneleri velilerin telefonuna düzenli iletilir.',
                        lime: false,
                      },
                      {
                        tag: 'HIZLI KURULUM',
                        title: 'Ek Cihaz Gerektirmez',
                        desc: 'Mevcut Excel üye listeniz 3 dakikada aktarılır. Turnike, kart okuyucu veya ek sunucu kurulumu olmadan aynı hafta yayına geçersiniz.',
                        lime: true,
                      },
                    ].map((b) => (
                      <div
                        key={b.title}
                        className="rounded-[10px] border border-[#e4e9f2] bg-[#f7f9fc] p-4"
                      >
                        <span
                          className={`inline-block px-2 py-0.5 rounded-[4px] text-[10px] font-bold tracking-wide ${
                            b.lime
                              ? 'bg-[#b9f33d] text-[#091124]'
                              : 'bg-[#091124] text-[#b9f33d]'
                          }`}
                        >
                          {b.tag}
                        </span>
                        <div className="text-sm font-bold text-[#091124] mt-2">{b.title}</div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{b.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Seçilen Paket Kapsamı ve Ek Modüller */}
                <div className="mt-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-bold text-[#091124]">
                      Seçilen Kapsam: {pkg?.name ?? 'Sadece Ek Modüller'}
                    </div>
                    <span className="px-2.5 py-0.5 rounded-[5px] bg-[#b9f33d] text-[#091124] text-[10px] font-bold">
                      {isYearly ? 'Yıllık %20 Avantajlı Plan' : 'Aylık Ödeme Planı'}
                    </span>
                  </div>

                  {pkg && (
                    <div className="p-4 rounded-[10px] border border-[#e4e9f2] bg-[#f7f9fc] space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-[#091124]">
                            {pkg.name} — Paket Kapsamındaki Özellikler
                          </div>
                          {pkg.description && (
                            <p className="text-[11px] text-slate-600 mt-0.5">{pkg.description}</p>
                          )}
                        </div>
                        <span className="px-2 py-0.5 rounded-[4px] bg-[#b9f33d] text-[#091124] text-[10px] font-bold shrink-0">
                          PAKETE DAHİL
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#e4e9f2]">
                        {pkg.features.map((feat) => (
                          <div key={feat} className="flex items-start gap-2 text-xs text-[#091124]">
                            <Check className="w-3.5 h-3.5 text-[#0b5fff] shrink-0 mt-0.5" />
                            <span className="font-medium leading-snug">{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(() => {
                    const addonKeys = latest.selectedModules.filter(
                      (key) => !pkg?.includedModules.includes(key)
                    );
                    if (addonKeys.length === 0) return null;
                    return (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-[#091124]">
                          Eklenen Akıllı Modüller ({addonKeys.length})
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {addonKeys.map((key) => {
                            const mod = modules.find((m) => m.key === key);
                            return (
                              <div
                                key={key}
                                className="p-3.5 rounded-[10px] border border-[#e4e9f2] bg-white"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded-[4px] bg-[#091124] text-[#b9f33d] text-[10px] font-bold">
                                    EK MODÜL
                                  </span>
                                  <span className="text-xs font-bold text-[#091124]">
                                    {formatSelectedModuleName(key)}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                                  {mod?.description ?? 'Kulüp operasyonlarını kolaylaştıran aktif SportsFly modülü.'}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <PageFooter />
              </article>
            )}

            {showPage(2) && (
              <article className="max-w-[820px] mx-auto bg-white text-[#091124] p-5 sm:p-12 rounded-[10px] shadow-[var(--shadow-md)] border border-[#e4e9f2]">
                <TopColorBand />
                <PageHeader />

                <h3 className="text-xl font-bold text-[#091124]">
                  Fiyat Özeti, Başlangıç Planı ve Onay
                </h3>
                <p className="text-xs text-slate-600 mt-1 tabular-nums">
                  Kapsam: <strong>{pkg?.name ?? 'Sadece Ek Modüller'}</strong> · Plan:{' '}
                  <strong>{isYearly ? 'Yıllık Peşin (%20 İndirim)' : 'Aylık Ödeme'}</strong> · Kapasite:{' '}
                  <strong>{tier?.label ?? '—'}</strong> ({formatNumberTR(latest.athleteCount)} sporcu)
                </p>

                <div className="mt-5 overflow-x-auto border border-[#e4e9f2] rounded-[8px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#091124] text-white">
                        <th className="py-3 px-4 font-semibold">Hizmet / Modül Kalemi</th>
                        <th className="py-3 px-3 font-semibold">Kapsam</th>
                        <th className="py-3 px-4 font-semibold text-right text-[#b9f33d]">
                          {isYearly ? 'Yıllık Peşin (KDV Hariç)' : 'Aylık Tutar (KDV Hariç)'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e4e9f2]">
                      {pkg ? (
                        <>
                          <tr>
                            <td className="py-3 px-4 font-semibold">{pkg.name}</td>
                            <td className="py-3 px-3 text-slate-600">
                              Temel kulüp yönetim ve tahsilat altyapısı
                            </td>
                            <td className="py-3 px-4 text-right tabular-nums font-semibold">
                              {formatTRY(latest.packageBaseAmount)}
                            </td>
                          </tr>
                          <tr className="bg-[#f7f9fc]">
                            <td className="py-3 px-4 font-semibold">
                              Sporcu Kapasite Kademesi ({tier?.label})
                            </td>
                            <td className="py-3 px-3 text-slate-600">
                              {formatNumberTR(latest.athleteCount)} aktif sporcu kapasitesi
                            </td>
                            <td className="py-3 px-4 text-right tabular-nums font-semibold">
                              +{formatTRY(latest.tierAdjustmentAmount)}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-semibold">
                              Paket Kapsamındaki Özellikler
                            </td>
                            <td className="py-3 px-3 text-slate-600">
                              {pkg.features.slice(0, 4).join(' · ') || includedModulesList.join(', ') || 'Standart modüller'}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold">Dahil</td>
                          </tr>
                        </>
                      ) : (
                        <tr>
                          <td className="py-3 px-4 font-semibold">Ana Paket Durumu</td>
                          <td className="py-3 px-3 text-slate-600">
                            Paket seçilmedi (Modül bazlı teklif · {formatNumberTR(latest.athleteCount)} sporcu)
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-500">—</td>
                        </tr>
                      )}
                      {(addonModulesList.length > 0 || latest.addonModulesAmount > 0) && (
                        <tr className="bg-[#f7f9fc]">
                          <td className="py-3 px-4 font-semibold">
                            Ek Modüller ({addonModulesList.length})
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {addonModulesList.join(', ') || 'Ek modül paketi'}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums font-semibold">
                            +{formatTRY(latest.addonModulesAmount)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <SummaryAndRulesSection />

                <div className="mt-6">
                  <div className="text-sm font-bold text-[#091124] mb-2.5">
                    3 Adımda Hızlı Başlangıç
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {[
                      [
                        '1. ADIM · 1. GÜN',
                        'Liste Aktarımı',
                        'Mevcut Excel sporcu ve grup listenizi 3 dakikada sisteme aktarırız.',
                      ],
                      [
                        '2. ADIM · 2-3. GÜN',
                        'Ödeme & Panel Ayarı',
                        'Online tahsilat linkleri ve kulüp yönetim/veli panelleri açılır.',
                      ],
                      [
                        '3. ADIM · 4-5. GÜN',
                        'Kısa Eğitim & Yayın',
                        'Antrenör ve yöneticilere 45 dk eğitim verilir; velilere açılır.',
                      ],
                    ].map(([badge, t, d]) => (
                      <div
                        key={badge}
                        className="p-3.5 rounded-[10px] border border-[#e4e9f2] bg-[#f7f9fc]"
                      >
                        <span className="inline-block px-2 py-0.5 rounded-[5px] bg-[#091124] text-[#b9f33d] text-[10px] font-bold">
                          {badge}
                        </span>
                        <div className="font-bold text-[#091124] mt-2">{t}</div>
                        <div className="text-slate-600 mt-1 leading-relaxed">{d}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <ApprovalAndSignatureSection />
                <PageFooter />
              </article>
            )}
          </>
        )}

        {/* ==================== FORMAT 3: 3 SAYFA (SADELEŞTİRİLMİŞ KURUMSAL TEKLİF) ==================== */}
        {selectedFormat === '3-sayfa' && (
          <>
            {showPage(1) && (
              <article className="max-w-[820px] mx-auto bg-white text-[#091124] p-5 sm:p-12 rounded-[10px] shadow-[var(--shadow-md)] border border-[#e4e9f2]">
                <TopColorBand />
                <PageHeader />

                <div className="rounded-[12px] bg-[#091124] p-6 sm:p-7 text-white">
                  <div className="w-10 h-1 bg-[#b9f33d] mb-3" />
                  <h3 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                    {clubName}
                  </h3>
                  <div className="text-lg font-bold text-[#b9f33d] mt-1">{quote.templateName}</div>
                  <p className="mt-2.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Aidat takibini otomatikleştirin; Sporpuan ve Dijital Sporcu Karnesi ile sporcu devamlılığını ve kulüp bağlılığını artırın.
                  </p>
                </div>

                <div className="mt-6">
                  <div className="text-sm font-bold text-[#091124] mb-3">
                    Temel Avantajlar ve Kulübünüze Katkısı
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {[
                      {
                        tag: 'TAHSİLAT GÜCÜ',
                        title: '%98 Otomatik Aidat Tahsilatı',
                        desc: 'Velilere WhatsApp ve SMS üzerinden akıllı ödeme linki gönderilir; geciken ödemeler ve manuel takip ortadan kalkar.',
                        limeTag: true,
                      },
                      {
                        tag: 'HIZLI BAŞLANGIÇ',
                        title: '3 Dakikada Kurulum, Ek Cihaz Yok',
                        desc: 'Mevcut Excel üye ve grup listeniz dakikalar içinde aktarılır; turnike, kart okuyucu veya ek sunucu maliyeti gerekmez.',
                        limeTag: false,
                      },
                      {
                        tag: 'SADAKAT & GELİŞİM',
                        title: 'Sporpuan ve Dijital Karne',
                        desc: 'Antrenman devamlılığını ödüllendiren puan sistemi ve gelişim karneleri ile sporcu kayıt yenileme oranı artar.',
                        limeTag: false,
                      },
                      {
                        tag: 'HER YERDEN ERİŞİM',
                        title: 'Yönetici, Antrenör ve Veli Panelleri',
                        desc: 'Her rol kendi ekranını kullanır: antrenör sahadan yoklama alır, yönetici tahsilatı izler, veli karneleri görür.',
                        limeTag: true,
                      },
                    ].map((card) => (
                      <div
                        key={card.title}
                        className="rounded-[10px] border border-[#e4e9f2] bg-white p-4"
                      >
                        <span
                          className={`inline-block px-2 py-0.5 rounded-[4px] text-[10px] font-bold tracking-wide ${
                            card.limeTag
                              ? 'bg-[#b9f33d] text-[#091124]'
                              : 'bg-[#091124] text-[#b9f33d]'
                          }`}
                        >
                          {card.tag}
                        </span>
                        <div className="text-sm font-bold text-[#091124] mt-2">{card.title}</div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{card.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <div className="text-sm font-bold text-[#091124] pb-2 border-b-2 border-[#091124]">
                    Teklif Tarafları ve Talep Bilgileri
                  </div>
                  <dl className="mt-2 divide-y divide-[#e4e9f2] text-xs">
                    {[
                      ['Teklif Sunulan Kurum', `${clubName} (${club?.type ?? 'Spor Kulübü'} · ${club?.city ?? '—'})`],
                      ['Branşlar ve Ölçek', `${club?.branches.join(', ') ?? '—'} · ${formatNumberTR(latest.athleteCount)} tahmini sporcu`],
                      ['Kulüp Yetkilisi', `${contact?.fullName ?? '—'} (${contact?.roleTitle ?? 'Yetkili'}) · ${contact?.email ?? ''}`],
                      ['Teklif Kapsamı', request?.title ?? pkg?.name ?? 'Sadece Ek Modüller'],
                      ['Teklifi Hazırlayan', `${owner?.name ?? 'SportsFly Satış Ekibi'} (${owner?.title ?? 'Satış'})`],
                      ['Düzenleme / Geçerlilik', `${dateStr} — Son Geçerlilik: ${validUntilStr} (${quote.validityDays} gün)`],
                    ].map(([k, v]) => (
                      <div key={k} className="py-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <dt className="text-slate-500 font-medium">{k}</dt>
                        <dd className="sm:col-span-2 text-[#091124] font-semibold">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    ['%98', 'Otomatik Aidat Tahsilat Oranı'],
                    ['3 Dakika', 'Excel Üye Listesi ile Kurulum'],
                    ['5 Gün', 'Uçtan Uca Canlıya Geçiş'],
                  ].map(([val, lbl]) => (
                    <div key={lbl} className="rounded-[10px] bg-[#091124] px-4 py-3">
                      <div className="text-lg font-bold text-[#b9f33d] tabular-nums">{val}</div>
                      <div className="text-[11px] text-slate-300 mt-0.5">{lbl}</div>
                    </div>
                  ))}
                </div>

                <PageFooter />
              </article>
            )}

            {showPage(2) && (
              <article className="max-w-[820px] mx-auto bg-white text-[#091124] p-5 sm:p-12 rounded-[10px] shadow-[var(--shadow-md)] border border-[#e4e9f2]">
                <TopColorBand />
                <PageHeader />

                <h3 className="text-xl font-bold text-[#091124]">
                  SportsFly Paketleri ve{' '}
                  <span className="text-[#0b5fff]">Öne Çıkan Özellikler</span>
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Kulübünüzün büyüklüğüne göre ölçeklenen lisans seçenekleri ve günlük operasyonu kolaylaştıran modüller.
                </p>

                <div className="mt-5">
                  <div className="text-xs font-bold text-[#091124] mb-2.5">
                    1. Kulübünüz İçin Öne Çıkan Modüller
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        badge: 'PERFORMANS',
                        title: 'SportsFly Lab',
                        desc: 'Sporcuların boy, kilo, esneklik ve hız ölçümlerini kaydeder; dönemlik gelişim grafiklerini otomatik çıkarır.',
                      },
                      {
                        badge: 'VELİ & SADAKAT',
                        title: 'Sporpuan & Dijital Karne',
                        desc: 'Devamlılık ve gelişim puanlaması sunar. Hazırlanan dijital karneler velilere otomatik WhatsApp üzerinden iletilir.',
                      },
                      {
                        badge: 'ORGANİZASYON',
                        title: 'Turnuva & Fikstür Yönetimi',
                        desc: 'Lig ve kupa takvimi oluşturma, anlık maç skoru girişi ve otomatik güncellenen puan durumu cetveli.',
                      },
                    ].map((m) => (
                      <div
                        key={m.title}
                        className="p-3.5 rounded-[10px] border border-[#e4e9f2] bg-[#f7f9fc]"
                      >
                        <span className="inline-block px-2 py-0.5 rounded-[4px] bg-[#091124] text-[#b9f33d] text-[10px] font-bold">
                          {m.badge}
                        </span>
                        <div className="text-xs font-bold text-[#091124] mt-2">{m.title}</div>
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{m.desc}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    {[
                      {
                        badge: 'DİJİTAL VİTRİN',
                        title: 'Kulüp Web Sitesi Portalı',
                        desc: '[kulup].sportsfly.com.tr adresli kulüp web siteniz; branşlar, antrenör kadrosu ve online ön kayıt formuyla hazır açılır.',
                      },
                      {
                        badge: 'BÜYÜME ASİSTANI',
                        title: 'Kayıt Yenileme Takibi',
                        desc: 'Dönem bitiminde yenilemeleri öngörür, devamsızlığı artan sporcuları erken fark edip kayıt kaybını önlemeye yardımcı olur.',
                      },
                    ].map((m) => (
                      <div
                        key={m.title}
                        className="p-3.5 rounded-[10px] border border-[#e4e9f2] bg-[#f7f9fc]"
                      >
                        <span className="inline-block px-2 py-0.5 rounded-[4px] bg-[#b9f33d] text-[#091124] text-[10px] font-bold">
                          {m.badge}
                        </span>
                        <div className="text-xs font-bold text-[#091124] mt-2">{m.title}</div>
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{m.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <div className="text-xs font-bold text-[#091124] mb-2.5">
                    2. SportsFly Lisans Paketleri (Yıllık Planlarda %20 İndirim Avantajı)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      {
                        badge: 'TEK ŞUBE & BUTİK OKUL',
                        name: 'Başlangıç Kulübü',
                        monthly: '2.199 ₺ / ay',
                        annual: 'Yıllık: 1.759 ₺/ay · Peşin: 21.108 ₺',
                        featured: false,
                        features: [
                          '100 Aktif Sporcuya Kadar',
                          'Mobil Uyumlu Hızlı Yoklama',
                          'Temel Veli Bildirimleri (SMS & Mail)',
                          'Standart Sporpuan Altyapısı',
                          '2 Antrenör & 1 Yönetici Hesabı',
                        ],
                      },
                      {
                        badge: 'EN ÇOK TERCİH EDİLEN',
                        name: 'Kulüp & Akademi',
                        monthly: '3.699 ₺ / ay',
                        annual: 'Yıllık: 2.959 ₺/ay · Peşin: 35.508 ₺',
                        featured: true,
                        features: [
                          '350 Aktif Sporcuya Kadar',
                          'Gelişmiş Sporpuan & Ödül Kataloğu',
                          '100 Sporcuya Kadar Dijital Karne',
                          'Otomatik WhatsApp Karne Gönderimi',
                          'Gelişim Grafikleri & Aidat Takibi',
                          'Sınırsız Antrenör & 7/24 Destek',
                        ],
                      },
                      {
                        badge: 'ÇOKLU ŞUBE & BÜYÜK KULÜP',
                        name: 'Pro Akademi & Çoklu Şube',
                        monthly: 'Kurumsal Teklif',
                        annual: 'Kulübünüze Özel Kapsam & Fiyat',
                        featured: false,
                        features: [
                          'Sınırsız Sporcu & Sınırsız Şube',
                          'Kulübe Özel Alan Adı ve Web Portalı',
                          'Sanal POS ile Online Kart Tahsilatı',
                          'Kulübe Özel Mobil Uygulama (iOS/Android)',
                          'Gelişmiş Finans, Kasa & Muhasebe',
                          'Özel Müşteri Başarı Yöneticisi',
                        ],
                      },
                    ].map((plan) => (
                      <div
                        key={plan.name}
                        className={`rounded-[10px] p-4 border ${
                          plan.featured
                            ? 'bg-[#091124] border-[#b9f33d] border-2 text-white'
                            : 'bg-white border-[#e4e9f2] text-[#091124]'
                        }`}
                      >
                        <div
                          className={`px-2 py-1 rounded-[5px] text-[10px] font-bold tracking-wide ${
                            plan.featured
                              ? 'bg-[#b9f33d] text-[#091124]'
                              : 'bg-[#f7f9fc] text-[#0b5fff]'
                          }`}
                        >
                          {plan.badge}
                        </div>
                        <div className="text-sm font-bold mt-2.5">{plan.name}</div>
                        <div
                          className={`text-lg font-bold mt-1 tabular-nums ${
                            plan.featured ? 'text-[#b9f33d]' : 'text-[#091124]'
                          }`}
                        >
                          {plan.monthly}
                        </div>
                        <div
                          className={`text-[11px] font-semibold pb-2.5 border-b ${
                            plan.featured
                              ? 'text-slate-300 border-[#253559]'
                              : 'text-[#0b5fff] border-[#e4e9f2]'
                          }`}
                        >
                          {plan.annual}
                        </div>
                        <ul className="mt-2.5 space-y-1.5 text-[11px]">
                          {plan.features.map((f) => (
                            <li key={f} className="flex items-start gap-1.5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                                  plan.featured ? 'bg-[#b9f33d]' : 'bg-[#0b5fff]'
                                }`}
                              />
                              <span className={plan.featured ? 'text-slate-200' : 'text-slate-600'}>
                                {f}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <div className="text-xs font-bold text-[#091124] mb-2.5">
                    3. Geleneksel Takip Yöntemleri vs. SportsFly
                  </div>
                  <div className="overflow-x-auto border border-[#e4e9f2] rounded-[8px]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#091124] text-white">
                          <th className="py-2.5 px-3 font-semibold">Operasyon Alanı</th>
                          <th className="py-2.5 px-3 font-semibold">Excel & WhatsApp</th>
                          <th className="py-2.5 px-3 font-semibold text-[#b9f33d]">
                            SportsFly Platformu
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e4e9f2]">
                        {[
                          ['Aidat Tahsilatı', 'Manuel takip, geciken ödemeler', 'WhatsApp/SMS ödeme linki, %98 tahsilat'],
                          ['Antrenman Yoklaması', 'Kağıt listeler ve kaybolan formlar', 'Telefonla sahadan anlık yoklama'],
                          ['Veli İletişimi', 'Dağınık grup mesajları', 'Veli paneli ve otomatik dijital karne'],
                          ['Kurulum & Güvenlik', 'Dağınık dosyalar, haftalarca hazırlık', '3 dakikada Excel aktarımı, KVKK uyumlu'],
                        ].map(([area, oldWay, newWay]) => (
                          <tr key={area} className="even:bg-[#f7f9fc]">
                            <td className="py-2 px-3 font-semibold text-[#091124]">{area}</td>
                            <td className="py-2 px-3 text-slate-500">{oldWay}</td>
                            <td className="py-2 px-3 font-semibold text-[#0b5fff]">{newWay}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <PageFooter />
              </article>
            )}

            {showPage(3) && (
              <article className="max-w-[820px] mx-auto bg-white text-[#091124] p-5 sm:p-12 rounded-[10px] shadow-[var(--shadow-md)] border border-[#e4e9f2]">
                <TopColorBand />
                <PageHeader />

                <h3 className="text-xl font-bold text-[#091124]">
                  Seçilen Kapsam, Fiyatlandırma ve Onay
                </h3>
                <p className="text-xs text-slate-600 mt-1 tabular-nums">
                  Kapsam: <strong>{pkg?.name ?? 'Sadece Ek Modüller'}</strong> · Plan:{' '}
                  <strong>{isYearly ? 'Yıllık Peşin (%20 İndirim)' : 'Aylık Ödeme'}</strong> · Kademe:{' '}
                  <strong>{tier?.label ?? '—'}</strong> ({formatNumberTR(latest.athleteCount)} sporcu)
                </p>

                <div className="mt-5 overflow-x-auto border border-[#e4e9f2] rounded-[8px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#091124] text-white">
                        <th className="py-3 px-4 font-semibold">Hizmet / Modül Kalemi</th>
                        <th className="py-3 px-3 font-semibold">Kapsam</th>
                        <th className="py-3 px-4 font-semibold text-right text-[#b9f33d]">
                          {isYearly ? 'Yıllık Peşin (KDV Hariç)' : 'Aylık Tutar (KDV Hariç)'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e4e9f2]">
                      {pkg ? (
                        <>
                          <tr>
                            <td className="py-3 px-4 font-semibold">{pkg.name}</td>
                            <td className="py-3 px-3 text-slate-600">Temel kulüp yönetim altyapısı</td>
                            <td className="py-3 px-4 text-right tabular-nums font-semibold">
                              {formatTRY(latest.packageBaseAmount)}
                            </td>
                          </tr>
                          <tr className="bg-[#f7f9fc]">
                            <td className="py-3 px-4 font-semibold">
                              Sporcu Kapasite Kademesi ({tier?.label})
                            </td>
                            <td className="py-3 px-3 text-slate-600">
                              {formatNumberTR(latest.athleteCount)} sporcu ölçeği
                            </td>
                            <td className="py-3 px-4 text-right tabular-nums font-semibold">
                              +{formatTRY(latest.tierAdjustmentAmount)}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-semibold">
                              Paket Kapsamındaki Özellikler
                            </td>
                            <td className="py-3 px-3 text-slate-600">
                              {pkg.features.slice(0, 4).join(' · ') || includedModulesList.join(', ') || 'Temel modüller'}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold">Dahil</td>
                          </tr>
                        </>
                      ) : (
                        <tr>
                          <td className="py-3 px-4 font-semibold">Ana Paket Durumu</td>
                          <td className="py-3 px-3 text-slate-600">
                            Paket seçilmedi (Modül bazlı teklif · {formatNumberTR(latest.athleteCount)} sporcu)
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-500">—</td>
                        </tr>
                      )}
                      {(addonModulesList.length > 0 || latest.addonModulesAmount > 0) && (
                        <tr className="bg-[#f7f9fc]">
                          <td className="py-3 px-4 font-semibold">
                            Ek Modüller ({addonModulesList.length})
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {addonModulesList.join(', ') || 'Ek modüller'}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums font-semibold">
                            +{formatTRY(latest.addonModulesAmount)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <SummaryAndRulesSection />

                <div className="mt-6">
                  <div className="text-sm font-bold text-[#091124] mb-2.5">
                    5 Günde Canlıya Geçiş Takvimi
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {[
                      [
                        '1. GÜN',
                        'Veri Aktarımı & Kurulum',
                        'Mevcut Excel sporcu ve grup listeniz 3 dakikada aktarılır; şubeleriniz tanımlanır.',
                      ],
                      [
                        '2–3. GÜN',
                        'Ödeme & Veli Portalı',
                        'PayTR sanal POS, WhatsApp/SMS ödeme linkleri ve kulüp web portalı hazırlanır.',
                      ],
                      [
                        '4. GÜN',
                        'Kısa Ekip Eğitimi',
                        'Yöneticilere ve antrenörlere 45 dakikalık uygulamalı panel ve yoklama eğitimi verilir.',
                      ],
                      [
                        '5. GÜN',
                        'Canlı Yayın',
                        'Velilere dijital giriş bağlantısı gönderilir; aidat, yoklama ve karne akışı başlar.',
                      ],
                    ].map(([dayBadge, t, d]) => (
                      <div
                        key={dayBadge}
                        className="p-3.5 rounded-[10px] border border-[#e4e9f2] bg-[#f7f9fc] flex items-start gap-3"
                      >
                        <span className="px-2.5 py-1 rounded-[6px] bg-[#091124] text-[#b9f33d] font-bold text-[11px] shrink-0">
                          {dayBadge}
                        </span>
                        <div>
                          <div className="font-bold text-[#091124]">{t}</div>
                          <div className="text-slate-600 mt-0.5 leading-relaxed">{d}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="mt-4 text-xs text-slate-600 leading-relaxed">
                  {latest.termsNote} Tüm iletişim ve kulüp kayıtları 6698 sayılı KVKK kapsamında açık rıza ve rol bazlı yetkilendirme ile güvenle saklanır.
                </p>

                <ApprovalAndSignatureSection />
                <PageFooter />
              </article>
            )}
          </>
        )}
      </div>
    </div>
  );
}
