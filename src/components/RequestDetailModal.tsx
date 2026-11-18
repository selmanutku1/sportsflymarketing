import React, { useState } from 'react';
import {
  Calendar,
  Download,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Users,
  X,
} from 'lucide-react';
import {
  DEAL_STAGES,
  type Activity,
  type ActivityType,
  type Club,
  type Contact,
  type DealStage,
  type ProductModule,
  type Quote,
  type QuoteRequest,
  type RolePermission,
  type StageHistoryEntry,
  type User,
} from '../types/crm';
import { formatDateTimeTR, formatDateTR, formatNumberTR, formatTRY } from '../utils/formatters';
import { downloadSavedAttachment } from '../utils/pdfGenerator';
import { StatusText } from './ui';

interface RequestDetailModalProps {
  request: QuoteRequest;
  club?: Club;
  contact?: Contact;
  owner?: User;
  users: User[];
  modules: ProductModule[];
  activities: Activity[];
  stageHistory: StageHistoryEntry[];
  quotes: Quote[];
  permission: RolePermission;
  onClose: () => void;
  onMoveStage: (requestId: string, targetStage: DealStage) => { ok: boolean; error?: string };
  onAddActivity: (requestId: string, clubId: string, type: ActivityType, summary: string) => void;
  onUpdateNextStep: (requestId: string, nextStep: string, nextStepDate: string) => void;
  onOpenQuoteBuilder: (quoteId?: string, requestId?: string) => void;
  onExportRequestPdf: (requestId: string) => void;
}

export function RequestDetailModal({
  request,
  club,
  contact,
  owner,
  users,
  modules,
  activities,
  stageHistory,
  quotes,
  permission,
  onClose,
  onMoveStage,
  onAddActivity,
  onUpdateNextStep,
  onOpenQuoteBuilder,
  onExportRequestPdf,
}: RequestDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'quotes' | 'notes'>('timeline');
  const [activityType, setActivityType] = useState<ActivityType>('Arama');
  const [activityText, setActivityText] = useState('');
  const [stageError, setStageError] = useState<string | null>(null);
  const [nextStepInput, setNextStepInput] = useState(request.nextStep);
  const [nextStepDateInput, setNextStepDateInput] = useState(request.nextStepDate.slice(0, 10));

  const reqActivities = activities
    .filter((a) => a.requestId === request.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const reqHistory = stageHistory
    .filter((h) => h.requestId === request.id)
    .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());

  const reqQuotes = quotes.filter((q) => q.requestId === request.id);

  const getUserName = (id: string) => users.find((u) => u.id === id)?.name ?? 'Sistem';

  const handleStageClick = (stage: DealStage) => {
    setStageError(null);
    const res = onMoveStage(request.id, stage);
    if (!res.ok && res.error) {
      setStageError(res.error);
    }
  };

  const submitActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityText.trim()) return;
    onAddActivity(request.id, request.clubId, activityType, activityText.trim());
    setActivityText('');
  };

  const saveNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nextStepInput.trim()) return;
    onUpdateNextStep(request.id, nextStepInput.trim(), `${nextStepDateInput}T10:00:00.000Z`);
  };

  const activityIcons: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
    Arama: Phone,
    'E-posta': Mail,
    Toplantı: Users,
    Demo: Calendar,
    Not: MessageSquare,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-detail-title"
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/50"
    >
      <div className="w-full max-w-4xl h-full bg-[var(--bg-canvas)] border-l border-[var(--border-hairline)] flex flex-col overflow-hidden shadow-[var(--shadow-md)]">
        {/* Üst Başlık */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[var(--bg-surface)] border-b border-[var(--border-hairline)] flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 shrink-0">
          <div className="flex items-start justify-between gap-3 min-w-0">
            <div className="min-w-0">
              <div className="text-xs text-[var(--text-muted)] truncate">
                {club?.name} · {club?.city} · {request.source}
              </div>
              <h2
                id="request-detail-title"
                className="text-sm sm:text-base font-semibold text-[var(--text-primary)] mt-0.5 truncate"
              >
                {request.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Talep detayını kapat"
              className="sm:hidden p-2 rounded-[8px] border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onExportRequestPdf(request.id)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-xs font-medium border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>PDF İndir ve Kaydet</span>
            </button>
            {permission.canCreateOrEditQuotes && (
              <button
                type="button"
                onClick={() => onOpenQuoteBuilder(undefined, request.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-xs font-medium bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Teklif Oluştur</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Talep detayını kapat"
              className="hidden sm:inline-flex p-2 rounded-[8px] border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Aşama İlerleme Çubuğu */}
        <div className="px-4 sm:px-6 py-3 bg-[var(--bg-surface)] border-b border-[var(--border-hairline)] overflow-x-auto shrink-0">
          <div className="flex items-center gap-1.5 min-w-max">
            {DEAL_STAGES.map((stage) => {
              const active = request.stage === stage;
              return (
                <button
                  key={stage}
                  type="button"
                  onClick={() => handleStageClick(stage)}
                  className={`px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {stage}
                </button>
              );
            })}
          </div>
          {stageError && (
            <div className="mt-2 text-xs text-[var(--status-error)] font-medium">{stageError}</div>
          )}
        </div>

        {/* Ana İki Sütun İçerik */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
          {/* Sol Bilgi Sütunu */}
          <div className="lg:col-span-5 space-y-5">
            <div className="p-4 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-3">
              <h3 className="text-xs font-semibold text-[var(--text-primary)]">Talep Özeti</h3>
              <dl className="grid grid-cols-2 gap-y-2.5 gap-x-3 text-xs">
                <dt className="text-[var(--text-muted)]">Sorumlu</dt>
                <dd className="text-[var(--text-primary)] font-medium">{owner?.name}</dd>

                <dt className="text-[var(--text-muted)]">Öncelik</dt>
                <dd className="text-[var(--text-primary)] font-medium">{request.priority}</dd>

                <dt className="text-[var(--text-muted)]">Tahmini Sporcu</dt>
                <dd className="text-[var(--text-primary)] font-medium tabular-nums">
                  {formatNumberTR(request.estimatedAthletes)} sporcu
                </dd>

                <dt className="text-[var(--text-muted)]">Bütçe Aralığı</dt>
                <dd className="text-[var(--text-primary)] font-medium tabular-nums">
                  {permission.canViewPricingAndContracts ? request.budgetRange : 'Yetki gerektirir'}
                </dd>

                <dt className="text-[var(--text-muted)]">Hedef Başlangıç</dt>
                <dd className="text-[var(--text-primary)] tabular-nums">
                  {formatDateTR(request.targetStartDate)}
                </dd>

                {request.demoDate && (
                  <>
                    <dt className="text-[var(--text-muted)]">Demo Tarihi</dt>
                    <dd className="text-[var(--text-primary)] tabular-nums">
                      {formatDateTimeTR(request.demoDate)}
                    </dd>
                  </>
                )}
              </dl>

              <div className="pt-3 border-t border-[var(--border-hairline)]">
                <div className="text-[11px] font-medium text-[var(--text-muted)] mb-1.5">
                  İstenen SportsFly Modülleri
                </div>
                <div className="text-xs text-[var(--text-primary)] leading-relaxed">
                  {request.requestedModules
                    .map((key) => modules.find((m) => m.key === key)?.name ?? key)
                    .join(' · ')}
                </div>
              </div>
            </div>

            {/* Yetkili Kişi ve KVKK */}
            <div className="p-4 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-2">
              <h3 className="text-xs font-semibold text-[var(--text-primary)]">Yetkili Kişi</h3>
              {contact ? (
                <>
                  <div className="text-xs font-medium text-[var(--text-primary)]">
                    {contact.fullName} · {contact.roleTitle}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">{contact.email}</div>
                  <div className="text-xs text-[var(--text-secondary)] tabular-nums">{contact.phone}</div>
                  <div className="pt-2">
                    <StatusText
                      label={
                        contact.kvkkConsent
                          ? `KVKK Onaylı (${formatDateTR(contact.kvkkConsentDate)})`
                          : 'KVKK Açık Rıza Bekliyor'
                      }
                      tone={contact.kvkkConsent ? 'success' : 'error'}
                    />
                  </div>
                </>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">Yetkili kişi atanmamış.</p>
              )}
            </div>

            {/* Sonraki Adım Güncelleme */}
            <form
              onSubmit={saveNextStep}
              className="p-4 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-3"
            >
              <h3 className="text-xs font-semibold text-[var(--text-primary)]">Sonraki Adım</h3>
              <input
                type="text"
                value={nextStepInput}
                onChange={(e) => setNextStepInput(e.target.value)}
                aria-label="Sonraki adım açıklaması"
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)]"
              />
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={nextStepDateInput}
                  onChange={(e) => setNextStepDateInput(e.target.value)}
                  aria-label="Sonraki adım tarihi"
                  className="flex-1 px-3 py-2 text-xs rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)]"
                />
                <button
                  type="submit"
                  className="px-3 py-2 text-xs font-medium rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] whitespace-nowrap"
                >
                  Güncelle
                </button>
              </div>
            </form>
          </div>

          {/* Sağ Çalışma Alanı */}
          <div className="lg:col-span-7 space-y-4 min-w-0">
            <div className="overflow-x-auto -mx-1 px-1">
              <div className="flex items-center gap-1 p-1 rounded-[8px] bg-[var(--bg-subtle)] w-max sm:w-fit">
              {(
                [
                  { id: 'timeline', label: 'Zaman Çizelgesi' },
                  { id: 'quotes', label: `Teklifler (${reqQuotes.length})` },
                  { id: 'notes', label: 'Dosyalar ve Aşama Geçmişi' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-[6px] text-xs font-medium whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
              </div>
            </div>

            {activeTab === 'timeline' && (
              <div className="space-y-4">
                <form
                  onSubmit={submitActivity}
                  className="p-4 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-3"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(['Arama', 'E-posta', 'Toplantı', 'Demo', 'Not'] as ActivityType[]).map(
                      (type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setActivityType(type)}
                          className={`px-2.5 py-1 rounded-[6px] text-xs font-medium whitespace-nowrap ${
                            activityType === type
                              ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                              : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                          }`}
                        >
                          {type}
                        </button>
                      )
                    )}
                  </div>
                  <textarea
                    rows={2}
                    value={activityText}
                    onChange={(e) => setActivityText(e.target.value)}
                    placeholder={`${activityType} kaydı veya görüşme notu ekleyin...`}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)]"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 rounded-[8px] text-xs font-medium bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]"
                    >
                      Aktivite Kaydet
                    </button>
                  </div>
                </form>

                <div className="p-4 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-3">
                  {reqActivities.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)]">Henüz aktivite kaydı yok.</p>
                  ) : (
                    <ul className="divide-y divide-[var(--border-hairline)]">
                      {reqActivities.map((act) => {
                        const Icon = activityIcons[act.type];
                        return (
                          <li key={act.id} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
                            <div className="w-7 h-7 rounded-[6px] bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-secondary)] shrink-0">
                              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
                                <span className="font-semibold text-[var(--text-primary)]">{act.type}</span>
                                <span aria-hidden="true">·</span>
                                <span>{getUserName(act.createdById)}</span>
                                <span aria-hidden="true">·</span>
                                <span className="tabular-nums">{formatDateTimeTR(act.createdAt)}</span>
                              </div>
                              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                                {act.summary}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'quotes' && (
              <div className="space-y-3">
                {reqQuotes.length === 0 ? (
                  <div className="p-6 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-center space-y-3">
                    <p className="text-xs text-[var(--text-secondary)]">
                      Bu talep için henüz teklif oluşturulmamış. Teklif Gönderildi aşamasına geçmek için teklif hazırlamanız gerekir.
                    </p>
                    {permission.canCreateOrEditQuotes && (
                      <button
                        type="button"
                        onClick={() => onOpenQuoteBuilder(undefined, request.id)}
                        className="px-4 py-2 rounded-[8px] text-xs font-medium bg-[var(--accent)] text-[var(--accent-fg)]"
                      >
                        İlk Teklifi Oluştur (v1)
                      </button>
                    )}
                  </div>
                ) : (
                  reqQuotes.map((quote) => {
                    const latest = quote.versions[quote.versions.length - 1];
                    return (
                      <div
                        key={quote.id}
                        className="p-4 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[var(--text-primary)]">
                            {quote.quoteNumber} · v{quote.currentVersion} · {quote.status}
                          </div>
                          <div className="text-xs text-[var(--text-secondary)] mt-1 tabular-nums">
                            {permission.canViewPricingAndContracts
                              ? `${formatTRY(latest.grandTotal)}${latest.billingCycle === 'aylik' ? '/ay' : ' (Yıllık Peşin)'} · Toplam %${latest.effectiveTotalDiscountPercent} indirim · KDV %${latest.vatRate}`
                              : 'Fiyat bilgisi rol gereği gizli'}
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)] mt-0.5 tabular-nums">
                            Geçerlilik: {formatDateTR(quote.validUntil)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenQuoteBuilder(quote.id, request.id)}
                          className="self-start sm:self-auto px-3 py-1.5 rounded-[8px] text-xs font-medium border border-[var(--border-hairline)] hover:bg-[var(--bg-subtle)] whitespace-nowrap"
                        >
                          Teklifi Aç
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-4">
                <div className="p-4 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-2.5">
                  <h4 className="text-xs font-semibold text-[var(--text-primary)]">Aşama Değişiklik Geçmişi</h4>
                  {reqHistory.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)]">Aşama geçmişi henüz oluşmadı.</p>
                  ) : (
                    <ul className="space-y-2 text-xs">
                      {reqHistory.map((item) => (
                        <li key={item.id} className="flex items-start justify-between gap-3 py-1.5 border-b border-[var(--border-hairline)] last:border-b-0">
                          <div>
                            <div className="font-medium text-[var(--text-primary)]">
                              {item.fromStage ? `${item.fromStage} → ` : ''}
                              {item.toStage}
                            </div>
                            {item.note && (
                              <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{item.note}</div>
                            )}
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)] text-right shrink-0 tabular-nums">
                            <div>{formatDateTimeTR(item.changedAt)}</div>
                            <div>{getUserName(item.changedById)}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="p-4 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs font-semibold text-[var(--text-primary)]">
                      Talep PDF Belgeleri ve Kulüp Dosyaları
                    </h4>
                    <button
                      type="button"
                      onClick={() => onExportRequestPdf(request.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>PDF Oluştur & Kaydet</span>
                    </button>
                  </div>

                  {request.files && request.files.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-medium text-[var(--text-muted)]">
                        Talep Dosyaları
                      </div>
                      {request.files.map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between gap-2 text-xs py-1.5 px-2.5 rounded-[6px] bg-[var(--bg-subtle)]/40"
                        >
                          <span className="inline-flex items-center gap-1.5 text-[var(--text-primary)] truncate">
                            <FileText className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                            <span className="truncate">{f.name}</span>
                          </span>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
                              {f.sizeLabel}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (!downloadSavedAttachment(f)) {
                                  onExportRequestPdf(request.id);
                                }
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--accent)] hover:underline"
                            >
                              <Download className="w-3 h-3" />
                              <span>İndir</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {club?.files.length ? (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-medium text-[var(--text-muted)]">
                        Kulüp Hesabı Dosyaları
                      </div>
                      {club.files.map((f) => (
                        <div key={f.id} className="flex items-center justify-between gap-2 text-xs py-1">
                          <span className="inline-flex items-center gap-1.5 text-[var(--text-primary)] truncate">
                            <FileText className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                            <span className="truncate">{f.name}</span>
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
                              {f.sizeLabel}
                            </span>
                            {f.dataUrl && (
                              <button
                                type="button"
                                onClick={() => downloadSavedAttachment(f)}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--accent)] hover:underline"
                              >
                                <Download className="w-3 h-3" />
                                <span>İndir</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    !request.files?.length && (
                      <p className="text-xs text-[var(--text-muted)]">
                        Henüz kaydedilmiş PDF veya dosya eki bulunmuyor.
                      </p>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
