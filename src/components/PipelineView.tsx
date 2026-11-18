import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Columns3,
  Filter,
  List,
  Plus,
  Search,
  X,
} from 'lucide-react';
import {
  DEAL_STAGES,
  type Club,
  type Contact,
  type DealStage,
  type LeadSource,
  type LossReason,
  type Quote,
  type QuoteRequest,
  type RolePermission,
  type User,
} from '../types/crm';
import {
  daysSince,
  formatDateTR,
  formatNumberTR,
  formatTRY,
  isDateWithinDays,
} from '../utils/formatters';
import { TODAY_ISO } from '../data/mockData';
import { EmptyState } from './ui';

type SavedViewKey = 'all' | 'this-week' | 'inactive' | 'mine';

interface PipelineViewProps {
  requests: QuoteRequest[];
  clubs: Club[];
  contacts: Contact[];
  quotes: Quote[];
  users: User[];
  currentUser: User;
  permission: RolePermission;
  initialStageFilter?: DealStage;
  onMoveStage: (
    requestId: string,
    targetStage: DealStage,
    extra?: { lossReason?: LossReason; lossNote?: string }
  ) => { ok: boolean; error?: string };
  onOpenRequest: (requestId: string) => void;
  onOpenNewRequest: () => void;
  onOpenQuoteBuilder: (quoteId?: string, requestId?: string) => void;
}

const LOSS_REASONS: LossReason[] = [
  'Fiyat',
  'Rakip',
  'Zamanlama',
  'Ürün Uyumsuzluğu',
  'Bütçe İptali',
];

const SOURCES: LeadSource[] = ['Web Formu', 'Telefon', 'E-posta', 'Fuar', 'Yönlendirme'];

export function PipelineView({
  requests,
  clubs,
  contacts,
  quotes,
  users,
  currentUser,
  permission,
  initialStageFilter,
  onMoveStage,
  onOpenRequest,
  onOpenNewRequest,
  onOpenQuoteBuilder,
}: PipelineViewProps) {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [savedView, setSavedView] = useState<SavedViewKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>(initialStageFilter ?? 'all');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);

  const [lossPrompt, setLossPrompt] = useState<{
    requestId: string;
    reason: LossReason;
    note: string;
  } | null>(null);

  const [ruleError, setRuleError] = useState<{
    message: string;
    requestId: string;
  } | null>(null);

  const getClub = (clubId: string) => clubs.find((c) => c.id === clubId);
  const getUser = (userId: string) => users.find((u) => u.id === userId);
  const getContact = (contactId: string) => contacts.find((c) => c.id === contactId);

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const club = getClub(req.clubId);
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matchesTitle = req.title.toLowerCase().includes(q);
        const matchesClub = club?.name.toLowerCase().includes(q) ?? false;
        const matchesCity = club?.city.toLowerCase().includes(q) ?? false;
        const matchesBranch = club?.branches.some((b) => b.toLowerCase().includes(q)) ?? false;
        if (!matchesTitle && !matchesClub && !matchesCity && !matchesBranch) return false;
      }

      if (sourceFilter !== 'all' && req.source !== sourceFilter) return false;
      if (ownerFilter !== 'all' && req.ownerId !== ownerFilter) return false;
      if (stageFilter !== 'all' && req.stage !== stageFilter) return false;

      if (savedView === 'this-week') {
        const open = req.stage !== 'Kazanıldı' && req.stage !== 'Kaybedildi';
        if (!open || !isDateWithinDays(req.nextStepDate, 7, TODAY_ISO)) return false;
      } else if (savedView === 'inactive') {
        const open = req.stage !== 'Kazanıldı' && req.stage !== 'Kaybedildi';
        if (!open || daysSince(req.lastActivityAt, TODAY_ISO) < 7) return false;
      } else if (savedView === 'mine') {
        if (req.ownerId !== currentUser.id) return false;
      }

      return true;
    });
  }, [requests, clubs, searchQuery, sourceFilter, ownerFilter, stageFilter, savedView, currentUser.id]);

  const handleAttemptMove = (requestId: string, targetStage: DealStage) => {
    setRuleError(null);
    if (targetStage === 'Kaybedildi') {
      setLossPrompt({ requestId, reason: 'Fiyat', note: '' });
      return;
    }
    const res = onMoveStage(requestId, targetStage);
    if (!res.ok && res.error) {
      setRuleError({ message: res.error, requestId });
    }
  };

  const confirmLoss = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lossPrompt) return;
    const res = onMoveStage(lossPrompt.requestId, 'Kaybedildi', {
      lossReason: lossPrompt.reason,
      lossNote: lossPrompt.note,
    });
    if (!res.ok && res.error) {
      setRuleError({ message: res.error, requestId: lossPrompt.requestId });
    }
    setLossPrompt(null);
  };

  return (
    <div className="space-y-4">
      {/* Kayıtlı Görünümler ve Araç Çubuğu */}
      <div className="p-3 sm:p-4 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Kayıtlı Görünümler */}
          <div className="max-w-full overflow-x-auto">
            <div
              role="tablist"
              aria-label="Kayıtlı görünümler"
              className="flex items-center gap-1 p-1 rounded-[8px] bg-[var(--bg-subtle)] w-max sm:w-auto sm:flex-wrap"
            >
              {(
                [
                  { key: 'all', label: 'Tüm Talepler' },
                  { key: 'this-week', label: 'Bu Hafta Takip Edilecekler' },
                  { key: 'inactive', label: 'Hareketsiz (>7 Gün)' },
                  { key: 'mine', label: 'Bana Atananlar' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={savedView === tab.key}
                  onClick={() => setSavedView(tab.key)}
                  className={`px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    savedView === tab.key
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Kanban / Liste Geçişi */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 p-1 rounded-[8px] bg-[var(--bg-subtle)]">
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-medium whitespace-nowrap ${
                  viewMode === 'kanban'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                <Columns3 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Kanban</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-medium whitespace-nowrap ${
                  viewMode === 'list'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                <List className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Liste</span>
              </button>
            </div>
          </div>
        </div>

        {/* Arama ve Filtre Satırı */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2.5 sm:gap-3">
          <div className="relative flex-1 min-w-0 sm:min-w-[220px]">
            <Search
              className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Kulüp adı, talep başlığı, şehir veya branş ara..."
              aria-label="Taleplerde ara"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[var(--text-muted)] hidden sm:block" aria-hidden="true" />
            <select
              aria-label="Talep kaynağına göre filtrele"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="flex-1 sm:flex-initial px-3 py-2 text-xs rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)]"
            >
              <option value="all">Kaynak: Tümü</option>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              aria-label="Sorumluya göre filtrele"
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="flex-1 sm:flex-initial px-3 py-2 text-xs rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)]"
            >
              <option value="all">Sorumlu: Tümü</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>

            {stageFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setStageFilter('all')}
                className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium rounded-[8px] bg-[var(--accent-soft)] text-[var(--accent)]"
              >
                <span>Aşama: {stageFilter}</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Zorunlu Aşama Geçiş Kuralı Uyarı Kutusu */}
      {ruleError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-[10px] border border-[var(--status-error)] bg-[var(--status-error-bg)] text-[var(--status-error)] text-xs"
        >
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{ruleError.message}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenQuoteBuilder(undefined, ruleError.requestId)}
              className="px-3 py-1.5 rounded-[6px] bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-hairline)] font-medium hover:bg-[var(--bg-subtle)] whitespace-nowrap"
            >
              Teklif Oluştur
            </button>
            <button
              type="button"
              onClick={() => setRuleError(null)}
              aria-label="Uyarıyı kapat"
              className="p-1 rounded hover:opacity-75"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {filteredRequests.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Eşleşen teklif talebi bulunamadı"
          description="Arama metnini veya aktif filtreleri temizleyerek tüm kulüp taleplerini görüntüleyebilirsiniz."
          actionLabel="Yeni Teklif Talebi Ekle"
          onAction={onOpenNewRequest}
        />
      ) : viewMode === 'kanban' ? (
        /* Kanban Görünümü */
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-3 min-w-max items-start">
            {DEAL_STAGES.filter((s) => stageFilter === 'all' || s === stageFilter).map((stage) => {
              const stageItems = filteredRequests.filter((r) => r.stage === stage);
              const stageValue = stageItems.reduce((sum, r) => sum + r.estimatedValue, 0);
              const isDropTarget = dragOverStage === stage;

              return (
                <div
                  key={stage}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverStage(stage);
                  }}
                  onDragLeave={() => setDragOverStage(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverStage(null);
                    if (draggedId) {
                      handleAttemptMove(draggedId, stage);
                      setDraggedId(null);
                    }
                  }}
                  className={`w-[82vw] max-w-[300px] sm:w-[288px] shrink-0 rounded-[10px] border transition-colors ${
                    isDropTarget
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)]/30'
                      : 'border-[var(--border-hairline)] bg-[var(--bg-subtle)]/40'
                  }`}
                >
                  {/* Kolon Başlığı */}
                  <div className="px-3.5 py-3 border-b border-[var(--border-hairline)] flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                        {stage}
                      </div>
                      {permission.canViewPricingAndContracts && (
                        <div className="text-[11px] text-[var(--text-muted)] tabular-nums mt-0.5">
                          {formatTRY(stageValue, false)}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-mono-num font-medium text-[var(--text-secondary)]">
                      {stageItems.length}
                    </span>
                  </div>

                  {/* Kolon Kartları */}
                  <div className="p-2.5 space-y-2.5 min-h-[200px]">
                    {stageItems.map((req) => {
                      const club = getClub(req.clubId);
                      const owner = getUser(req.ownerId);
                      const contact = getContact(req.primaryContactId);
                      const idleDays = daysSince(req.lastActivityAt, TODAY_ISO);
                      const isOpen = req.stage !== 'Kazanıldı' && req.stage !== 'Kaybedildi';
                      const reqQuotes = quotes.filter((q) => q.requestId === req.id);

                      return (
                        <article
                          key={req.id}
                          draggable
                          onDragStart={() => setDraggedId(req.id)}
                          onDragEnd={() => {
                            setDraggedId(null);
                            setDragOverStage(null);
                          }}
                          className="p-3.5 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] hover:border-[var(--border-strong)] transition-colors cursor-grab active:cursor-grabbing"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => onOpenRequest(req.id)}
                              className="text-left text-xs font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] leading-snug"
                            >
                              {club?.name ?? 'Kulüp'}
                            </button>
                            <span className="text-[11px] font-medium text-[var(--text-muted)] shrink-0">
                              {req.priority}
                            </span>
                          </div>

                          <div className="mt-1 text-xs text-[var(--text-secondary)] line-clamp-1">
                            {req.title}
                          </div>

                          <div className="mt-2 text-[11px] text-[var(--text-muted)] flex flex-wrap items-center gap-x-1.5 gap-y-0.5 tabular-nums">
                            <span>{club?.branches.join(', ')}</span>
                            <span aria-hidden="true">·</span>
                            <span>{formatNumberTR(req.estimatedAthletes)} sporcu</span>
                            <span aria-hidden="true">·</span>
                            <span>{req.source}</span>
                          </div>

                          {permission.canViewPricingAndContracts && (
                            <div className="mt-2.5 flex items-center justify-between text-xs">
                              <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                                {formatTRY(req.estimatedValue, false)}
                              </span>
                              {reqQuotes.length > 0 && (
                                <span className="text-[11px] text-[var(--accent)] font-medium">
                                  Teklif v{reqQuotes[0].currentVersion}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="mt-2.5 pt-2 border-t border-[var(--border-hairline)] flex items-center justify-between gap-2 text-[11px] text-[var(--text-muted)]">
                            <span className="truncate">{owner?.name}</span>
                            <span className="tabular-nums shrink-0">
                              {isOpen && idleDays >= 7 ? (
                                <span className="text-[var(--status-warning)] font-medium">
                                  {idleDays}g hareketsiz
                                </span>
                              ) : (
                                formatDateTR(req.nextStepDate)
                              )}
                            </span>
                          </div>

                          {contact && !contact.kvkkConsent && (
                            <div className="mt-1.5 text-[11px] text-[var(--status-error)] font-medium">
                              KVKK rızası eksik
                            </div>
                          )}

                          {/* Dokunmatik cihazlar için hızlı aşama değiştirici */}
                          <div className="mt-2.5 pt-2 border-t border-[var(--border-hairline)] lg:hidden">
                            <select
                              aria-label={`${club?.name} aşamasını değiştir`}
                              value={req.stage}
                              onChange={(e) =>
                                handleAttemptMove(req.id, e.target.value as DealStage)
                              }
                              className="w-full px-2 py-1.5 text-[11px] rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)]"
                            >
                              {DEAL_STAGES.map((st) => (
                                <option key={st} value={st}>
                                  Aşama: {st}
                                </option>
                              ))}
                            </select>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Liste Görünümü */
        <div className="rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-hidden">
          {/* Mobil Kart Listesi */}
          <div className="md:hidden divide-y divide-[var(--border-hairline)]">
            {filteredRequests.map((req) => {
              const club = getClub(req.clubId);
              const owner = getUser(req.ownerId);
              return (
                <div key={req.id} className="p-4 space-y-2.5 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onOpenRequest(req.id)}
                        className="font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] text-left"
                      >
                        {club?.name}
                      </button>
                      <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{req.title}</div>
                    </div>
                    {permission.canViewPricingAndContracts && (
                      <span className="tabular-nums font-semibold text-[var(--text-primary)] shrink-0">
                        {formatTRY(req.estimatedValue, false)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--text-secondary)] tabular-nums">
                    <span>{req.source}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatNumberTR(req.estimatedAthletes)} sporcu</span>
                    <span aria-hidden="true">·</span>
                    <span>{owner?.name}</span>
                    <span aria-hidden="true">·</span>
                    <span>Sonraki: {formatDateTR(req.nextStepDate)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <select
                      aria-label={`${club?.name} aşamasını değiştir`}
                      value={req.stage}
                      onChange={(e) => handleAttemptMove(req.id, e.target.value as DealStage)}
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)]"
                    >
                      {DEAL_STAGES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => onOpenRequest(req.id)}
                      className="px-3 py-1.5 rounded-[6px] border border-[var(--border-hairline)] text-xs font-medium text-[var(--accent)] whitespace-nowrap"
                    >
                      Detay
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
                  <th className="py-3 px-4 font-medium">Kulüp ve Talep</th>
                  <th className="py-3 px-3 font-medium">Aşama</th>
                  <th className="py-3 px-3 font-medium">Kaynak</th>
                  <th className="py-3 px-3 font-medium text-right">Sporcu</th>
                  {permission.canViewPricingAndContracts && (
                    <th className="py-3 px-3 font-medium text-right">Tahmini Tutar</th>
                  )}
                  <th className="py-3 px-3 font-medium">Sorumlu</th>
                  <th className="py-3 px-3 font-medium text-right">Sonraki Adım</th>
                  <th className="py-3 px-4 font-medium text-right">Hızlı Geçiş</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-hairline)]">
                {filteredRequests.map((req) => {
                  const club = getClub(req.clubId);
                  const owner = getUser(req.ownerId);
                  return (
                    <tr key={req.id} className="hover:bg-[var(--bg-subtle)]/40">
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => onOpenRequest(req.id)}
                          className="font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] text-left"
                        >
                          {club?.name}
                        </button>
                        <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{req.title}</div>
                      </td>
                      <td className="py-3 px-3 font-medium text-[var(--text-primary)]">{req.stage}</td>
                      <td className="py-3 px-3 text-[var(--text-secondary)]">{req.source}</td>
                      <td className="py-3 px-3 text-right tabular-nums text-[var(--text-secondary)]">
                        {formatNumberTR(req.estimatedAthletes)}
                      </td>
                      {permission.canViewPricingAndContracts && (
                        <td className="py-3 px-3 text-right tabular-nums font-semibold text-[var(--text-primary)]">
                          {formatTRY(req.estimatedValue, false)}
                        </td>
                      )}
                      <td className="py-3 px-3 text-[var(--text-secondary)]">{owner?.name}</td>
                      <td className="py-3 px-3 text-right tabular-nums text-[var(--text-secondary)]">
                        {formatDateTR(req.nextStepDate)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <select
                          aria-label={`${club?.name} aşamasını değiştir`}
                          value={req.stage}
                          onChange={(e) => handleAttemptMove(req.id, e.target.value as DealStage)}
                          className="px-2 py-1 text-xs rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)]"
                        >
                          {DEAL_STAGES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Kaybedildi Nedeni Modalı */}
      {lossPrompt && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="loss-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
        >
          <form
            onSubmit={confirmLoss}
            className="w-full max-w-md p-6 rounded-[12px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-[var(--shadow-md)] space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 id="loss-modal-title" className="text-sm font-semibold text-[var(--text-primary)]">
                Kayıp Nedenini Belirtin
              </h2>
              <button
                type="button"
                onClick={() => setLossPrompt(null)}
                aria-label="Kapat"
                className="p-1 rounded hover:bg-[var(--bg-subtle)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Raporlama ve kayıp analizi için talebi "Kaybedildi" aşamasına alırken kayıp nedeni seçilmesi zorunludur.
            </p>
            <div>
              <label htmlFor="loss-reason-select" className="block text-xs font-medium text-[var(--text-primary)] mb-1.5">
                Kayıp Nedeni
              </label>
              <select
                id="loss-reason-select"
                value={lossPrompt.reason}
                onChange={(e) =>
                  setLossPrompt({ ...lossPrompt, reason: e.target.value as LossReason })
                }
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)]"
              >
                {LOSS_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="loss-note-input" className="block text-xs font-medium text-[var(--text-primary)] mb-1.5">
                Kayıp Notu
              </label>
              <textarea
                id="loss-note-input"
                rows={3}
                required
                value={lossPrompt.note}
                onChange={(e) => setLossPrompt({ ...lossPrompt, note: e.target.value })}
                placeholder="Örn. Rakip çözüm fiyatı veya yeni dönem bütçe ertelemesi..."
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)]"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLossPrompt(null)}
                className="px-4 py-2 text-xs font-medium rounded-[8px] border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
              >
                İptal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium rounded-[8px] bg-[var(--status-error)] text-white hover:opacity-90"
              >
                Kaybedildi Olarak İşaretle
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
