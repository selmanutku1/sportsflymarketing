import React, { useState } from 'react';
import { CheckCircle2, Printer, RefreshCw, X } from 'lucide-react';
import type {
  AthleteTier,
  Club,
  Contact,
  ProductModule,
  ProductPackage,
  Quote,
} from '../types/crm';
import { formatDateTR, formatNumberTR, formatTRY } from '../utils/formatters';

interface DigitalApprovalModalProps {
  quote: Quote;
  club?: Club;
  contact?: Contact;
  packages: ProductPackage[];
  modules: ProductModule[];
  tiers: AthleteTier[];
  onClose: () => void;
  onCustomerDecision: (quoteId: string, decision: 'approve' | 'revise', feedback: string) => void;
}

export function DigitalApprovalModal({
  quote,
  club,
  contact,
  packages,
  modules,
  tiers,
  onClose,
  onCustomerDecision,
}: DigitalApprovalModalProps) {
  const [feedback, setFeedback] = useState(quote.customerFeedback ?? '');
  const [showRevisionForm, setShowRevisionForm] = useState(false);

  const latest = quote.versions[quote.versions.length - 1];
  const pkg = packages.find((p) => p.id === latest.packageId);
  const tier = tiers.find((t) => t.id === latest.tierId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="digital-approval-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 overflow-y-auto"
    >
      <div className="w-full max-w-2xl rounded-[12px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-[var(--shadow-md)] overflow-hidden my-auto max-h-[92vh] overflow-y-auto">
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[var(--bg-subtle)]/60 border-b border-[var(--border-hairline)] flex flex-wrap items-center justify-between gap-3 sm:gap-4 no-print">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium text-[var(--text-muted)] truncate">
              Harici Müşteri Onay Bağlantısı Önizlemesi · /onay/{quote.digitalApprovalToken}
            </div>
            <h2 id="digital-approval-title" className="text-sm font-semibold text-[var(--text-primary)]">
              SportsFly Dijital Teklif Onay Ekranı
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-medium border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="p-1.5 rounded-[8px] hover:bg-[var(--bg-subtle)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-5 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[var(--border-hairline)] pb-4">
            <div className="flex items-start gap-3">
              <img
                src="/assets/aistudio/images__1__e22ba1d6.jpg"
                alt="SportsFly Logo"
                className="w-10 h-10 object-contain rounded-[6px] border border-[var(--border-hairline)] bg-white shrink-0"
              />
              <div>
                <div className="text-base font-bold text-[var(--accent)]">SportsFly</div>
                <div className="text-[var(--text-secondary)] mt-0.5">{quote.templateName}</div>
                <div className="font-mono-num text-[11px] text-[var(--text-muted)] mt-0.5">
                  Teklif No: {quote.quoteNumber} · Sürüm v{quote.currentVersion}
                </div>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="font-semibold text-[var(--text-primary)]">{club?.name}</div>
              <div className="text-[var(--text-secondary)]">
                Sayın {contact?.fullName} ({contact?.roleTitle})
              </div>
              <div className="text-[11px] text-[var(--text-muted)] tabular-nums mt-0.5">
                Son Geçerlilik: {formatDateTR(quote.validUntil)} ({quote.validityDays} gün)
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-[var(--text-primary)]">
                Teklif Kapsamı ve Fiyatlandırma
              </span>
              <span className="px-2 py-0.5 rounded-[5px] bg-[var(--brand-lime)] text-[var(--brand-navy)] text-[10px] font-bold">
                {latest.billingCycle === 'yillik'
                  ? `Yıllık Peşin Plan · Toplam %${latest.effectiveTotalDiscountPercent} İndirim`
                  : `Aylık Ödeme Planı · %${latest.effectiveTotalDiscountPercent} İndirim`}
              </span>
            </div>
            <div className="rounded-[8px] border border-[var(--border-hairline)] divide-y divide-[var(--border-hairline)]">
              <div className="p-3 flex flex-wrap justify-between gap-2">
                <div>
                  <div className="font-medium text-[var(--text-primary)]">
                    {pkg?.name ?? 'Ana Paket Seçilmedi (Sadece Ek Modüller)'}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    {pkg
                      ? `Kademe: ${tier?.label} (${formatNumberTR(latest.athleteCount)} tahmini sporcu) · ${
                          latest.billingCycle === 'yillik' ? '12 Ay Peşin' : 'Aylık'
                        }`
                      : `Modül Bazlı Teklif (${formatNumberTR(latest.athleteCount)} sporcu ölçeği) · ${
                          latest.billingCycle === 'yillik' ? 'Yıllık Plan' : 'Aylık Plan'
                        }`}
                  </div>
                </div>
                <div className="font-semibold tabular-nums shrink-0">
                  {pkg ? formatTRY(latest.packageBaseAmount + latest.tierAdjustmentAmount) : '—'}
                </div>
              </div>

              <div className="p-3 flex flex-wrap justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-[var(--text-primary)]">Seçili Modüller</div>
                  <div className="text-[11px] text-[var(--text-muted)] break-words">
                    {latest.selectedModules
                      .map((k) => {
                        const baseName = modules.find((m) => m.key === k)?.name ?? k;
                        if (k === 'SportsFlyLab' && (latest.labAmount ?? 0) > 0) {
                          return `${baseName} (${formatNumberTR(
                            latest.labAthleteCount ?? latest.athleteCount
                          )} sporcu · ${
                            latest.labMode === 'analiz' ? 'Karne + Analiz' : 'Sadece Karne'
                          })`;
                        }
                        if (k === 'TurnuvaFikstur' && latest.tournamentMode === 'single') {
                          return `${baseName} (Tek Turnuva 5.000 ₺)`;
                        }
                        return baseName;
                      })
                      .join(', ')}
                  </div>
                </div>
                <div className="font-semibold tabular-nums shrink-0">
                  {latest.addonModulesAmount > 0
                    ? `+${formatTRY(latest.addonModulesAmount)}`
                    : 'Pakete Dahil'}
                </div>
              </div>

              <div className="p-3 space-y-1.5 bg-[var(--bg-subtle)]/30">
                {latest.annualPlanDiscountPercent > 0 ? (
                  <>
                    <div className="flex justify-between text-[var(--text-muted)]">
                      <span>12 Aylık Liste Tutarı</span>
                      <span className="tabular-nums line-through">
                        {formatTRY(latest.annualListTotal ?? latest.monthlyListAmount * 12)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[var(--status-success)]">
                      <span>Yıllık Plan İndirimi (%{latest.annualPlanDiscountPercent})</span>
                      <span className="tabular-nums font-medium">
                        -{formatTRY(latest.annualPlanSavingsAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[var(--text-secondary)] font-medium">
                      <span>Yıllık Peşin Ara Toplam</span>
                      <span className="tabular-nums">{formatTRY(latest.subtotal)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>Ara Toplam</span>
                    <span className="tabular-nums">{formatTRY(latest.subtotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[var(--status-error)]">
                  <span>Ek Kurumsal İndirim (%{latest.discountPercent})</span>
                  <span className="tabular-nums">-{formatTRY(latest.discountAmount)}</span>
                </div>
                {latest.prepaidEnabled && (latest.prepaidDiscountPercent ?? 0) > 0 && (
                  <div className="flex justify-between text-[var(--status-success)] font-medium">
                    <span>Yıllık Peşin Ekstra İndirim (%{latest.prepaidDiscountPercent})</span>
                    <span className="tabular-nums">
                      -{formatTRY(latest.prepaidDiscountAmount ?? 0)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-medium text-[var(--accent)]">
                  <span>Toplam İndirim Oranı</span>
                  <span className="tabular-nums">%{latest.effectiveTotalDiscountPercent}</span>
                </div>
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>KDV (%{latest.vatRate})</span>
                  <span className="tabular-nums">+{formatTRY(latest.vatAmount)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[var(--border-hairline)] text-sm font-bold text-[var(--text-primary)]">
                  <span>
                    {latest.billingCycle === 'yillik'
                      ? 'Yıllık Peşin Genel Toplam (KDV Dahil)'
                      : 'Aylık Genel Toplam (KDV Dahil)'}
                  </span>
                  <span className="tabular-nums">
                    {formatTRY(latest.grandTotal)}
                    {latest.billingCycle === 'aylik' ? ' / ay' : ''}
                  </span>
                </div>
                {latest.billingCycle === 'yillik' && (
                  <div className="flex justify-between text-[11px] text-[var(--text-muted)]">
                    <span>Aylık Net Karşılık (KDV Hariç)</span>
                    <span className="tabular-nums font-semibold">
                      {formatTRY(Math.round(latest.netTotal / 12), false)} / ay
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-[8px] bg-[var(--bg-subtle)]/50 text-[var(--text-secondary)] leading-relaxed">
            <strong>Koşullar:</strong> {latest.termsNote}
          </div>

          {quote.status === 'Müşteri Onayladı' ? (
            <div className="p-4 rounded-[8px] border border-[var(--status-success)] bg-[var(--status-success-bg)] text-[var(--status-success)] flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Bu teklif kulüp yetkilisi tarafından dijital olarak onaylanmıştır.</span>
            </div>
          ) : (
            <div className="space-y-3 pt-2 border-t border-[var(--border-hairline)] no-print">
              {showRevisionForm && (
                <div className="space-y-2">
                  <label htmlFor="revision-feedback" className="block font-medium text-[var(--text-primary)]">
                    Revizyon Talebi Notunuz
                  </label>
                  <textarea
                    id="revision-feedback"
                    rows={2}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Örn. İkinci şube sporcu sayısının güncellenmesini talep ediyoruz..."
                    className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2">
                {!showRevisionForm ? (
                  <button
                    type="button"
                    onClick={() => setShowRevisionForm(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] border border-[var(--border-hairline)] text-[var(--text-primary)] font-medium hover:bg-[var(--bg-subtle)]"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Revizyon Talep Et</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onCustomerDecision(
                        quote.id,
                        'revise',
                        feedback.trim() || 'Müşteri tarafından revizyon talep edildi.'
                      );
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-[var(--status-warning)] text-white font-medium"
                  >
                    <span>Revizyon Talebini Gönder</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={quote.requiresDualApproval && (!quote.managerApproved || !quote.financeApproved)}
                  onClick={() => {
                    onCustomerDecision(
                      quote.id,
                      'approve',
                      'Dijital onay bağlantısı üzerinden müşteri tarafından onaylandı.'
                    );
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-[var(--status-success)] text-white font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Teklifi Onayla</span>
                </button>
              </div>
              {quote.requiresDualApproval && (!quote.managerApproved || !quote.financeApproved) && (
                <div className="text-[11px] text-[var(--status-warning)] text-right">
                  Not: %20 üzeri indirim içeren bu teklif Yönetici ve Finans onayı tamamlanmadan müşteri onayına açılamaz.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
