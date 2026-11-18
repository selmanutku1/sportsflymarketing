import React, { useMemo, useState } from 'react';
import {
  Building2,
  Download,
  FileText,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { downloadSavedAttachment } from '../utils/pdfGenerator';
import type {
  Activity,
  Club,
  ClubType,
  CommunicationChannel,
  Contact,
  ContactRoleTitle,
  Quote,
  RolePermission,
  SportsflyUsageStatus,
} from '../types/crm';
import { formatDateTR, formatNumberTR, formatTRY } from '../utils/formatters';
import {
  TURKEY_PROVINCES,
  formatProvinceDistrict,
  getDistrictsForProvince,
} from '../data/turkeyLocations';
import { EmptyState, StatusText } from './ui';

interface ClubsViewProps {
  clubs: Club[];
  contacts: Contact[];
  quotes: Quote[];
  activities: Activity[];
  permission: RolePermission;
  onAddClub: (club: {
    name: string;
    type: ClubType;
    city: string;
    branches: string[];
    estimatedAthletes: number;
    sportsflyStatus: SportsflyUsageStatus;
  }) => void;
  onAddClubNote: (clubId: string, content: string) => void;
  onAddClubFile: (clubId: string, fileName: string) => void;
  onOpenQuoteBuilder: (quoteId?: string) => void;
}

export function ClubsView({
  clubs,
  contacts,
  quotes,
  activities,
  permission,
  onAddClub,
  onAddClubNote,
  onAddClubFile,
  onOpenQuoteBuilder,
}: ClubsViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<ClubType>('Spor Kulübü');
  const [newProvince, setNewProvince] = useState('İstanbul');
  const [newDistrict, setNewDistrict] = useState('Kadıköy');
  const [newBranches, setNewBranches] = useState('Basketbol, Voleybol');
  const [newAthletes, setNewAthletes] = useState(250);
  const [newStatus, setNewStatus] = useState<SportsflyUsageStatus>('Kullanmıyor');

  const availableDistricts = useMemo(
    () => getDistrictsForProvince(newProvince),
    [newProvince],
  );

  const [noteDraft, setNoteDraft] = useState('');
  const [fileDraft, setFileDraft] = useState('');

  const filteredClubs = useMemo(() => {
    return clubs.filter((c) => {
      if (statusFilter !== 'all' && c.sportsflyStatus !== statusFilter) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.branches.some((b) => b.toLowerCase().includes(q))
      );
    });
  }, [clubs, statusFilter, search]);

  const selectedClub = clubs.find((c) => c.id === selectedClubId);

  const handleProvinceChange = (province: string) => {
    setNewProvince(province);
    const districts = getDistrictsForProvince(province);
    setNewDistrict(districts[0] ?? 'Merkez');
  };

  const handleCreateClub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddClub({
      name: newName.trim(),
      type: newType,
      city: formatProvinceDistrict(newProvince, newDistrict),
      branches: newBranches
        .split(',')
        .map((b) => b.trim())
        .filter(Boolean),
      estimatedAthletes: Math.max(10, newAthletes),
      sportsflyStatus: newStatus,
    });
    setNewName('');
    setNewProvince('İstanbul');
    setNewDistrict('Kadıköy');
    setShowNewModal(false);
  };

  return (
    <div className="space-y-4">
      <div className="p-3 sm:p-4 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
          <div className="relative flex-1 min-w-0 sm:min-w-[200px] sm:max-w-md">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kulüp adı, şehir veya branş ara..."
              aria-label="Kulüplerde ara"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)]"
            />
          </div>
          <select
            aria-label="Kullanım durumuna göre filtrele"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)]"
          >
            <option value="all">SportsFly Durumu: Tümü</option>
            <option value="Aktif">Aktif</option>
            <option value="Pilot">Pilot</option>
            <option value="Kullanmıyor">Kullanmıyor</option>
            <option value="Geçmiş Müşteri">Geçmiş Müşteri</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => setShowNewModal(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-[8px] text-xs font-medium bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Yeni Kulüp Hesabı</span>
        </button>
      </div>

      {filteredClubs.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Kulüp hesabı bulunamadı"
          description="Arama ölçütlerine uyan kulüp yok. Yeni kulüp hesabı ekleyebilirsiniz."
          actionLabel="Yeni Kulüp Hesabı"
          onAction={() => setShowNewModal(true)}
        />
      ) : (
        <div className="rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-hidden">
          {/* Mobil Kart Görünümü */}
          <div className="md:hidden divide-y divide-[var(--border-hairline)]">
            {filteredClubs.map((club) => (
              <div key={club.id} className="p-4 space-y-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-[var(--text-primary)]">{club.name}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {club.type} · {club.city}
                    </div>
                  </div>
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
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--text-secondary)] tabular-nums">
                  <span>{club.branches.join(', ')}</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatNumberTR(club.estimatedAthletes)} sporcu</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {permission.canViewPricingAndContracts
                      ? club.annualContractValue
                        ? `${club.contractStatus} (${formatTRY(club.annualContractValue, false)})`
                        : club.contractStatus
                      : 'Yetki gerektirir'}
                  </span>
                </div>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedClubId(club.id)}
                    className="text-xs font-medium text-[var(--accent)] hover:underline"
                  >
                    Hesabı Aç
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Masaüstü Tablo Görünümü */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)]/50 text-[var(--text-muted)]">
                  <th className="py-3 px-4 font-medium">Kulüp / Kurum Adı</th>
                  <th className="py-3 px-3 font-medium">Tür & Şehir</th>
                  <th className="py-3 px-3 font-medium">Branşlar</th>
                  <th className="py-3 px-3 font-medium text-right">Tahmini Sporcu</th>
                  <th className="py-3 px-3 font-medium">SportsFly Durumu</th>
                  <th className="py-3 px-3 font-medium">Sözleşme</th>
                  <th className="py-3 px-4 font-medium text-right">Detay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-hairline)]">
                {filteredClubs.map((club) => (
                  <tr key={club.id} className="hover:bg-[var(--bg-subtle)]/40">
                    <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">
                      {club.name}
                    </td>
                    <td className="py-3 px-3 text-[var(--text-secondary)]">
                      {club.type} · {club.city}
                    </td>
                    <td className="py-3 px-3 text-[var(--text-secondary)]">
                      {club.branches.join(', ')}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-[var(--text-primary)] font-medium">
                      {formatNumberTR(club.estimatedAthletes)}
                    </td>
                    <td className="py-3 px-3">
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
                    <td className="py-3 px-3 text-[var(--text-secondary)] tabular-nums">
                      {permission.canViewPricingAndContracts
                        ? club.annualContractValue
                          ? `${club.contractStatus} (${formatTRY(club.annualContractValue, false)})`
                          : club.contractStatus
                        : 'Yetki gerektirir'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedClubId(club.id)}
                        className="text-xs font-medium text-[var(--accent)] hover:underline whitespace-nowrap"
                      >
                        Hesabı Aç
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Kulüp Detay Çekmecesi */}
      {selectedClub && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/50"
        >
          <div className="w-full max-w-2xl h-full bg-[var(--bg-canvas)] border-l border-[var(--border-hairline)] flex flex-col overflow-hidden">
            <div className="px-4 sm:px-6 py-4 bg-[var(--bg-surface)] border-b border-[var(--border-hairline)] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-[var(--text-muted)] truncate">
                  {selectedClub.type} · {selectedClub.city} · {selectedClub.branches.join(', ')}
                </div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] truncate">
                  {selectedClub.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClubId(null)}
                aria-label="Kapat"
                className="p-2 rounded-[8px] border border-[var(--border-hairline)] hover:bg-[var(--bg-subtle)] shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              <div className="p-4 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <div className="text-[var(--text-muted)]">SportsFly Kullanımı</div>
                  <div className="font-semibold text-[var(--text-primary)] mt-1">
                    {selectedClub.sportsflyStatus}
                  </div>
                </div>
                <div>
                  <div className="text-[var(--text-muted)]">Tahmini Sporcu</div>
                  <div className="font-semibold text-[var(--text-primary)] mt-1 tabular-nums">
                    {formatNumberTR(selectedClub.estimatedAthletes)} (Kişisel veri tutulmaz)
                  </div>
                </div>
                <div>
                  <div className="text-[var(--text-muted)]">Sözleşme Durumu</div>
                  <div className="font-semibold text-[var(--text-primary)] mt-1">
                    {selectedClub.contractStatus}
                  </div>
                </div>
              </div>

              {/* Yetkili Kişiler */}
              <div className="p-4 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-2.5">
                <h3 className="text-xs font-semibold text-[var(--text-primary)]">Yetkili Kişiler</h3>
                {contacts.filter((ct) => ct.clubId === selectedClub.id).length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">Yetkili kişi kaydı yok.</p>
                ) : (
                  contacts
                    .filter((ct) => ct.clubId === selectedClub.id)
                    .map((ct) => (
                      <div key={ct.id} className="flex items-center justify-between text-xs py-1.5 border-b border-[var(--border-hairline)] last:border-b-0">
                        <div>
                          <div className="font-medium text-[var(--text-primary)]">
                            {ct.fullName} · {ct.roleTitle}
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)]">
                            {ct.email} · {ct.phone}
                          </div>
                        </div>
                        <StatusText
                          label={ct.kvkkConsent ? 'KVKK Onaylı' : 'KVKK Bekliyor'}
                          tone={ct.kvkkConsent ? 'success' : 'error'}
                        />
                      </div>
                    ))
                )}
              </div>

              {/* Bağlı Teklifler */}
              <div className="p-4 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-2.5">
                <h3 className="text-xs font-semibold text-[var(--text-primary)]">
                  Bağlı Teklifler
                </h3>
                {quotes.filter((q) => q.clubId === selectedClub.id).length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">
                    Bu kulüp için hazırlanmış teklif henüz bulunmuyor.
                  </p>
                ) : (
                  quotes
                    .filter((q) => q.clubId === selectedClub.id)
                    .map((q) => {
                      const latest = q.versions[q.versions.length - 1];
                      return (
                        <div
                          key={q.id}
                          className="flex items-center justify-between text-xs py-1.5 border-b border-[var(--border-hairline)] last:border-b-0"
                        >
                          <div>
                            <div className="font-medium text-[var(--text-primary)] font-mono-num">
                              {q.quoteNumber} (v{q.currentVersion}) · {q.status}
                            </div>
                            <div className="text-[11px] text-[var(--text-muted)] tabular-nums">
                              {formatDateTR(q.createdAt)}
                              {permission.canViewPricingAndContracts
                                ? ` · ${formatTRY(latest.grandTotal)}`
                                : ''}
                            </div>
                          </div>
                          {permission.canCreateOrEditQuotes && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedClubId(null);
                                onOpenQuoteBuilder(q.id);
                              }}
                              className="text-xs font-medium text-[var(--accent)] hover:underline"
                            >
                              Teklife Git
                            </button>
                          )}
                        </div>
                      );
                    })
                )}
              </div>

              {/* Hesap Notları ve Dosyalar */}
              <div className="p-4 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-3">
                <h3 className="text-xs font-semibold text-[var(--text-primary)]">Hesap Notları</h3>
                <div className="space-y-2">
                  {selectedClub.notes.map((n) => (
                    <div key={n.id} className="p-2.5 rounded-[8px] bg-[var(--bg-subtle)]/50 text-xs">
                      <p className="text-[var(--text-primary)]">{n.content}</p>
                      <div className="text-[11px] text-[var(--text-muted)] mt-1 tabular-nums">
                        {formatDateTR(n.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Kulüp hesabına not ekle..."
                    className="flex-1 px-3 py-2 text-xs rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!noteDraft.trim()) return;
                      onAddClubNote(selectedClub.id, noteDraft.trim());
                      setNoteDraft('');
                    }}
                    className="px-3 py-2 text-xs font-medium rounded-[8px] bg-[var(--accent)] text-[var(--accent-fg)] shrink-0"
                  >
                    Ekle
                  </button>
                </div>

                <div className="pt-3 border-t border-[var(--border-hairline)] space-y-2">
                  <h4 className="text-xs font-semibold text-[var(--text-primary)]">Dosya Ekleri</h4>
                  {selectedClub.files.map((f) => (
                    <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 text-xs py-1">
                      <span className="inline-flex items-center gap-1.5 text-[var(--text-primary)] min-w-0">
                        <FileText className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                        <span className="truncate">{f.name}</span>
                      </span>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
                          {f.sizeLabel} · {formatDateTR(f.uploadedAt)}
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
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={fileDraft}
                      onChange={(e) => setFileDraft(e.target.value)}
                      placeholder="Dosya adı (ör. Sozlesme_Taslagi.pdf)"
                      className="flex-1 px-3 py-2 text-xs rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!fileDraft.trim()) return;
                        onAddClubFile(selectedClub.id, fileDraft.trim());
                        setFileDraft('');
                      }}
                      className="px-3 py-2 text-xs font-medium rounded-[8px] border border-[var(--border-hairline)] hover:bg-[var(--bg-subtle)] shrink-0"
                    >
                      Dosya Ekle
                    </button>
                  </div>
                </div>
              </div>

              {/* Etkinlik Geçmişi */}
              <div className="p-4 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-2">
                <h3 className="text-xs font-semibold text-[var(--text-primary)]">Etkinlik Geçmişi</h3>
                {activities.filter((a) => a.clubId === selectedClub.id).length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">Henüz etkinlik kaydı yok.</p>
                ) : (
                  activities
                    .filter((a) => a.clubId === selectedClub.id)
                    .map((a) => (
                      <div key={a.id} className="text-xs py-1.5 border-b border-[var(--border-hairline)] last:border-b-0">
                        <span className="font-medium text-[var(--text-primary)]">{a.type}:</span>{' '}
                        <span className="text-[var(--text-secondary)]">{a.summary}</span>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Yeni Kulüp Modalı */}
      {showNewModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
        >
          <form
            onSubmit={handleCreateClub}
            className="w-full max-w-lg p-4 sm:p-6 rounded-[12px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Yeni Kulüp Hesabı</h2>
              <button type="button" onClick={() => setShowNewModal(false)} className="p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">Kulüp / Kurum Adı</label>
                <input
                  required
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Örn. Beşiktaş Jimnastik Akademisi"
                  className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Kurum Türü</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as ClubType)}
                  className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
                >
                  <option value="Spor Kulübü">Spor Kulübü</option>
                  <option value="Spor Okulu">Spor Okulu</option>
                  <option value="Federasyon Bağlantılı Kurum">Federasyon Bağlantılı Kurum</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Şehir (İl)</label>
                  <select
                    required
                    aria-label="Şehir (İl)"
                    value={newProvince}
                    onChange={(e) => handleProvinceChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
                  >
                    {TURKEY_PROVINCES.map((province) => (
                      <option key={province} value={province}>
                        {province}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">İlçe</label>
                  <select
                    required
                    aria-label="İlçe"
                    value={newDistrict}
                    onChange={(e) => setNewDistrict(e.target.value)}
                    className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
                  >
                    {availableDistricts.map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-medium mb-1">Branşlar (virgülle ayırın)</label>
                <input
                  required
                  type="text"
                  value={newBranches}
                  onChange={(e) => setNewBranches(e.target.value)}
                  className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Tahmini Sporcu Sayısı</label>
                  <input
                    required
                    type="number"
                    min={10}
                    value={newAthletes}
                    onChange={(e) => setNewAthletes(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Mevcut SportsFly Durumu</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as SportsflyUsageStatus)}
                    className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
                  >
                    <option value="Kullanmıyor">Kullanmıyor</option>
                    <option value="Pilot">Pilot</option>
                    <option value="Aktif">Aktif</option>
                    <option value="Geçmiş Müşteri">Geçmiş Müşteri</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 text-xs rounded-[8px] border border-[var(--border-hairline)]"
              >
                İptal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium rounded-[8px] bg-[var(--accent)] text-[var(--accent-fg)]"
              >
                Kulübü Kaydet
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

interface ContactsViewProps {
  contacts: Contact[];
  clubs: Club[];
  onAddContact: (contact: Omit<Contact, 'id' | 'deletionRequested'>) => void;
  onToggleKvkkConsent: (contactId: string) => void;
  onRequestDeletion: (contactId: string) => void;
}

export function ContactsView({
  contacts,
  clubs,
  onAddContact,
  onToggleKvkkConsent,
  onRequestDeletion,
}: ContactsViewProps) {
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);

  const [clubId, setClubId] = useState(clubs[0]?.id ?? '');
  const [fullName, setFullName] = useState('');
  const [roleTitle, setRoleTitle] = useState<ContactRoleTitle>('Kulüp Yöneticisi');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [kvkkConsent, setKvkkConsent] = useState(true);
  const [channels, setChannels] = useState<CommunicationChannel[]>(['E-posta']);
  const [formError, setFormError] = useState<string | null>(null);

  const getClubName = (id: string) => clubs.find((c) => c.id === id)?.name ?? 'Kulüp';

  const filtered = contacts.filter((ct) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      ct.fullName.toLowerCase().includes(q) ||
      ct.email.toLowerCase().includes(q) ||
      getClubName(ct.clubId).toLowerCase().includes(q)
    );
  });

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kvkkConsent) {
      setFormError('KVKK uyarınca açık rıza onayı işaretlenmeden veya iletişim tercihi seçilmeden kişi kaydı oluşturulamaz.');
      return;
    }
    if (channels.length === 0) {
      setFormError('En az bir iletişim tercihi (E-posta / Telefon / WhatsApp) seçilmesi zorunludur.');
      return;
    }
    setFormError(null);
    onAddContact({
      clubId,
      fullName: fullName.trim(),
      roleTitle,
      email: email.trim(),
      phone: phone.trim(),
      kvkkConsent,
      kvkkConsentDate: new Date().toISOString(),
      kvkkRetentionYears: 3,
      communicationPrefs: channels,
    });
    setFullName('');
    setEmail('');
    setPhone('');
    setShowNew(false);
  };

  const toggleChannel = (ch: CommunicationChannel) => {
    setChannels((prev) => (prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-xs text-[var(--text-secondary)]">
        <ShieldCheck className="w-4 h-4 text-[var(--accent)] shrink-0" aria-hidden="true" />
        <span>
          KVKK Uyum İlkesi: Sistemde sporcu kişisel verisi tutulmaz. Yalnızca açık rıza ve iletişim tercihi tanımlı kulüp yetkilileri işlenir.
        </span>
      </div>

      <div className="p-3 sm:p-4 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-0 sm:min-w-[220px] sm:max-w-md">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Yetkili adı, e-posta veya kulüp ara..."
            aria-label="Kişilerde ara"
            className="w-full pl-9 pr-3 py-2 text-xs rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-[8px] text-xs font-medium bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Yeni Kişi Ekle</span>
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="İletişim kaydı bulunamadı"
          description="Arama kriterlerine uyan yetkili kişi yok."
        />
      ) : (
        <div className="rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-hidden">
          {/* Mobil Kart Görünümü */}
          <div className="md:hidden divide-y divide-[var(--border-hairline)]">
            {filtered.map((ct) => (
              <div key={ct.id} className="p-4 space-y-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-[var(--text-primary)]">{ct.fullName}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {getClubName(ct.clubId)} · {ct.roleTitle}
                    </div>
                  </div>
                  <StatusText
                    label={ct.kvkkConsent ? 'KVKK Onaylı' : 'Rıza Bekliyor'}
                    tone={ct.kvkkConsent ? 'success' : 'error'}
                  />
                </div>
                <div className="text-[11px] text-[var(--text-secondary)] break-all">
                  {ct.email} · {ct.phone}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-muted)] pt-1">
                  <span>
                    {ct.communicationPrefs.join(' · ')} · {ct.kvkkRetentionYears} yıl
                  </span>
                  <div className="flex items-center gap-3">
                    {!ct.kvkkConsent && (
                      <button
                        type="button"
                        onClick={() => onToggleKvkkConsent(ct.id)}
                        className="text-xs font-medium text-[var(--accent)] hover:underline"
                      >
                        Rızayı Onayla
                      </button>
                    )}
                    {ct.deletionRequested ? (
                      <StatusText label="Silme Talebi Aktif" tone="warning" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => onRequestDeletion(ct.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--status-error)] hover:underline"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Silme Talebi</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Masaüstü Tablo Görünümü */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)]/50 text-[var(--text-muted)]">
                  <th className="py-3 px-4 font-medium">Yetkili Kişi</th>
                  <th className="py-3 px-3 font-medium">Kulüp & Görev</th>
                  <th className="py-3 px-3 font-medium">İletişim Tercihleri</th>
                  <th className="py-3 px-3 font-medium">KVKK Açık Rıza</th>
                  <th className="py-3 px-3 font-medium">Saklama</th>
                  <th className="py-3 px-4 font-medium text-right">KVKK İşlemleri</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-hairline)]">
                {filtered.map((ct) => (
                  <tr key={ct.id} className="hover:bg-[var(--bg-subtle)]/40">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[var(--text-primary)]">{ct.fullName}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {ct.email} · {ct.phone}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-[var(--text-primary)]">{getClubName(ct.clubId)}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">{ct.roleTitle}</div>
                    </td>
                    <td className="py-3 px-3 text-[var(--text-secondary)]">
                      {ct.communicationPrefs.join(' · ')}
                    </td>
                    <td className="py-3 px-3">
                      <StatusText
                        label={
                          ct.kvkkConsent
                            ? `Onaylı (${formatDateTR(ct.kvkkConsentDate)})`
                            : 'Rıza Bekliyor'
                        }
                        tone={ct.kvkkConsent ? 'success' : 'error'}
                      />
                    </td>
                    <td className="py-3 px-3 tabular-nums text-[var(--text-secondary)]">
                      {ct.kvkkRetentionYears} yıl
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-3">
                        {!ct.kvkkConsent && (
                          <button
                            type="button"
                            onClick={() => onToggleKvkkConsent(ct.id)}
                            className="text-xs font-medium text-[var(--accent)] hover:underline whitespace-nowrap"
                          >
                            Rızayı Onayla
                          </button>
                        )}
                        {ct.deletionRequested ? (
                          <StatusText label="Silme Talebi Aktif" tone="warning" />
                        ) : (
                          <button
                            type="button"
                            onClick={() => onRequestDeletion(ct.id)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--status-error)] hover:underline whitespace-nowrap"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Silme Talebi</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Yeni Kişi Modalı */}
      {showNew && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
        >
          <form
            onSubmit={handleSaveContact}
            className="w-full max-w-md p-4 sm:p-6 rounded-[12px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-4 text-xs max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Yeni Yetkili Kişi Kaydı
              </h2>
              <button type="button" onClick={() => setShowNew(false)} className="p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-[8px] border border-[var(--status-error)] bg-[var(--status-error-bg)] text-[var(--status-error)]">
                {formError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block font-medium mb-1">Bağlı Kulüp</label>
                <select
                  value={clubId}
                  onChange={(e) => setClubId(e.target.value)}
                  className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
                >
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Ad Soyad</label>
                  <input
                    required
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Rol</label>
                  <select
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value as ContactRoleTitle)}
                    className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
                  >
                    <option value="Kulüp Yöneticisi">Kulüp Yöneticisi</option>
                    <option value="Antrenör Sorumlusu">Antrenör Sorumlusu</option>
                    <option value="Mali İşler">Mali İşler</option>
                    <option value="Genel Koordinatör">Genel Koordinatör</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">E-posta</label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Telefon</label>
                  <input
                    required
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+90 5XX XXX XX XX"
                    className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
                  />
                </div>
              </div>

              <div>
                <div className="font-medium mb-1.5">İletişim Tercihleri (Zorunlu)</div>
                <div className="flex flex-wrap gap-4">
                  {(['E-posta', 'Telefon', 'WhatsApp'] as CommunicationChannel[]).map((ch) => (
                    <label key={ch} className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={channels.includes(ch)}
                        onChange={() => toggleChannel(ch)}
                      />
                      <span>{ch}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-start gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={kvkkConsent}
                  onChange={(e) => setKvkkConsent(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  <strong>KVKK Açık Rıza Onayı (Zorunlu):</strong> Kişisel verilerin ticari iletişim amacıyla işlenmesine açık rıza verilmiştir.
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNew(false)}
                className="px-4 py-2 rounded-[8px] border border-[var(--border-hairline)]"
              >
                İptal
              </button>
              <button
                type="submit"
                className="px-4 py-2 font-medium rounded-[8px] bg-[var(--accent)] text-[var(--accent-fg)]"
              >
                Kaydet
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
