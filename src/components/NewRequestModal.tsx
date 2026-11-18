import React, { useState } from 'react';
import { X } from 'lucide-react';
import type {
  Club,
  Contact,
  LeadSource,
  PriorityLevel,
  ProductModule,
  SportsFlyModuleKey,
  User,
} from '../types/crm';

interface NewRequestModalProps {
  clubs: Club[];
  contacts: Contact[];
  users: User[];
  modules: ProductModule[];
  currentUserId: string;
  onClose: () => void;
  onCreate: (payload: {
    title: string;
    clubId: string;
    primaryContactId: string;
    ownerId: string;
    source: LeadSource;
    requestedModules: SportsFlyModuleKey[];
    estimatedAthletes: number;
    budgetRange: string;
    targetStartDate: string;
    priority: PriorityLevel;
    nextStep: string;
    nextStepDate: string;
    autoDownloadPdf: boolean;
  }) => void;
}

export function NewRequestModal({
  clubs,
  contacts,
  users,
  modules,
  currentUserId,
  onClose,
  onCreate,
}: NewRequestModalProps) {
  const [clubId, setClubId] = useState(clubs[0]?.id ?? '');
  const clubContacts = contacts.filter((c) => c.clubId === clubId);
  const [contactId, setContactId] = useState(clubContacts[0]?.id ?? contacts[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [ownerId, setOwnerId] = useState(currentUserId);
  const [source, setSource] = useState<LeadSource>('Web Formu');
  const [selectedModules, setSelectedModules] = useState<SportsFlyModuleKey[]>(['Uyelik', 'Aidat']);
  const [athletes, setAthletes] = useState(clubs[0]?.estimatedAthletes ?? 250);
  const [budgetRange, setBudgetRange] = useState('60.000 ₺ – 90.000 ₺');
  const [targetStartDate, setTargetStartDate] = useState('2027-01-10');
  const [priority, setPriority] = useState<PriorityLevel>('Orta');
  const [nextStep, setNextStep] = useState('İlk ihtiyaç analizi görüşmesi');
  const [nextStepDate, setNextStepDate] = useState('2026-11-21');
  const [autoDownloadPdf, setAutoDownloadPdf] = useState(true);

  const handleClubChange = (nextClubId: string) => {
    setClubId(nextClubId);
    const club = clubs.find((c) => c.id === nextClubId);
    if (club) setAthletes(club.estimatedAthletes);
    const firstContact = contacts.find((c) => c.clubId === nextClubId);
    if (firstContact) setContactId(firstContact.id);
  };

  const toggleModule = (key: SportsFlyModuleKey) => {
    setSelectedModules((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || selectedModules.length === 0) return;
    onCreate({
      title: title.trim(),
      clubId,
      primaryContactId: contactId,
      ownerId,
      source,
      requestedModules: selectedModules,
      estimatedAthletes: Math.max(10, athletes),
      budgetRange,
      targetStartDate: `${targetStartDate}T09:00:00.000Z`,
      priority,
      nextStep,
      nextStepDate: `${nextStepDate}T10:00:00.000Z`,
      autoDownloadPdf,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-request-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 overflow-y-auto"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl p-4 sm:p-6 rounded-[12px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-[var(--shadow-md)] space-y-4 text-xs my-auto max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 id="new-request-title" className="text-sm font-semibold text-[var(--text-primary)]">
            Yeni Teklif Talebi Oluştur
          </h2>
          <button type="button" onClick={onClose} aria-label="Kapat" className="p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block font-medium mb-1">Talep Başlığı</label>
            <input
              required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn. 2027 Sezonu Aidat ve Antrenman Yönetimi"
              className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Kulüp / Hesap</label>
            <select
              value={clubId}
              onChange={(e) => handleClubChange(e.target.value)}
              className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
            >
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.city})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium mb-1">Yetkili Kişi</label>
            <select
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
            >
              {(clubContacts.length ? clubContacts : contacts).map((ct) => (
                <option key={ct.id} value={ct.id}>
                  {ct.fullName} · {ct.kvkkConsent ? 'KVKK Onaylı' : 'KVKK Bekliyor'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium mb-1">Talep Kaynağı</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as LeadSource)}
              className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
            >
              <option value="Web Formu">Web Formu</option>
              <option value="Telefon">Telefon</option>
              <option value="E-posta">E-posta</option>
              <option value="Fuar">Fuar</option>
              <option value="Yönlendirme">Yönlendirme</option>
            </select>
          </div>

          <div>
            <label className="block font-medium mb-1">Sorumlu</label>
            <select
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium mb-1">Tahmini Sporcu Sayısı</label>
            <input
              type="number"
              min={10}
              value={athletes}
              onChange={(e) => setAthletes(Number(e.target.value) || 100)}
              className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] tabular-nums"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Bütçe Aralığı</label>
            <input
              type="text"
              value={budgetRange}
              onChange={(e) => setBudgetRange(e.target.value)}
              className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Hedef Başlangıç Tarihi</label>
            <input
              type="date"
              value={targetStartDate}
              onChange={(e) => setTargetStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Öncelik</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as PriorityLevel)}
              className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
            >
              <option value="Düşük">Düşük</option>
              <option value="Orta">Orta</option>
              <option value="Yüksek">Yüksek</option>
              <option value="Kritik">Kritik</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <div className="font-medium mb-1.5">İstenen Modüller</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {modules.map((m) => (
                <label key={m.key} className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedModules.includes(m.key)}
                    onChange={() => toggleModule(m.key)}
                  />
                  <span>{m.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-medium mb-1">Sonraki Adım</label>
            <input
              type="text"
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Sonraki Adım Tarihi</label>
            <input
              type="date"
              value={nextStepDate}
              onChange={(e) => setNextStepDate(e.target.value)}
              className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
            />
          </div>

          <div className="sm:col-span-2 pt-1">
            <label className="inline-flex items-center gap-2 cursor-pointer text-[var(--text-primary)] font-medium">
              <input
                type="checkbox"
                checked={autoDownloadPdf}
                onChange={(e) => setAutoDownloadPdf(e.target.checked)}
              />
              <span>Talep oluşturulunca PDF belgesini otomatik indir ve talep/kulüp dosyalarına kaydet</span>
            </label>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-[8px] border border-[var(--border-hairline)]"
          >
            İptal
          </button>
          <button
            type="submit"
            className="w-full sm:w-auto px-4 py-2 font-medium rounded-[8px] bg-[var(--accent)] text-[var(--accent-fg)]"
          >
            Talebi Oluştur ve PDF Kaydet
          </button>
        </div>
      </form>
    </div>
  );
}
