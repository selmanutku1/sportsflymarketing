import React, { useState } from 'react';
import { Check, KeyRound, Plus, Shield, Trash2, Workflow } from 'lucide-react';
import type {
  AthleteTier,
  AuditLog,
  AutomationRule,
  Contact,
  ProductModule,
  ProductPackage,
  RolePermission,
  RoleType,
  User,
} from '../types/crm';
import {
  DEFAULT_VALIDITY_DAYS,
  DISCOUNT_APPROVAL_THRESHOLD,
  VAT_RATE,
  formatDateTimeTR,
  formatTRY,
} from '../utils/formatters';
import { StatusText } from './ui';

interface AutomationViewProps {
  rules: AutomationRule[];
  onToggleRule: (ruleId: string) => void;
  canEdit: boolean;
}

export function AutomationView({ rules, onToggleRule, canEdit }: AutomationViewProps) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Süreç Otomasyonu Kuralları
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Aşama değişiklikleri, 3. ve 7. gün teklif takipleri ve hareketsiz talep uyarıları otomatik çalışır.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="p-4 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-wrap items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3 max-w-2xl">
              <div className="w-8 h-8 rounded-[8px] bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--accent)] shrink-0">
                <Workflow className="w-4 h-4" aria-hidden="true" />
              </div>
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">{rule.name}</div>
                <div className="text-[11px] text-[var(--text-secondary)] mt-1">
                  <strong>Tetikleyici:</strong> {rule.trigger}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  <strong>Eylem:</strong> {rule.actionDescription}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
                {rule.executionCount} kez çalıştı
              </span>
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => onToggleRule(rule.id)}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-medium border transition-colors ${
                  rule.active
                    ? 'border-[var(--status-success)] bg-[var(--status-success-bg)] text-[var(--status-success)]'
                    : 'border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                } disabled:opacity-60`}
              >
                {rule.active ? 'Aktif' : 'Pasif'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface SettingsViewProps {
  rolePermissions: RolePermission[];
  packages: ProductPackage[];
  modules: ProductModule[];
  tiers: AthleteTier[];
  contacts: Contact[];
  auditLogs: AuditLog[];
  users: User[];
  currentUser: User;
  currentPermission: RolePermission;
  onUpdatePackagePrice: (pkgId: string, nextPrice: number) => void;
  onExecuteKvkkDeletion: (contactId: string) => void;
  onUpdateUserPasscode: (userId: string, nextPasscode: string) => void;
  onAddUser: (payload: {
    name: string;
    email: string;
    role: RoleType;
    title: string;
    passcode: string;
  }) => void;
}

export function SettingsView({
  rolePermissions,
  packages,
  modules,
  tiers,
  contacts,
  auditLogs,
  users,
  currentUser,
  currentPermission,
  onUpdatePackagePrice,
  onExecuteKvkkDeletion,
  onUpdateUserPasscode,
  onAddUser,
}: SettingsViewProps) {
  const [tab, setTab] = useState<'roles' | 'team' | 'approval' | 'catalog' | 'kvkk' | 'audit'>('roles');
  const [editingPrice, setEditingPrice] = useState<Record<string, number>>({});
  const [editingPasscodes, setEditingPasscodes] = useState<Record<string, string>>({});
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<RoleType>('SatisTemsilcisi');
  const [newUserTitle, setNewUserTitle] = useState('Satış Temsilcisi');
  const [newUserPasscode, setNewUserPasscode] = useState('');

  const canManageTeam = Boolean(currentUser.isSuperAdmin || currentUser.role === 'Yonetici');
  const getUserName = (id: string) => users.find((u) => u.id === id)?.name ?? 'Sistem';
  const deletionRequests = contacts.filter((c) => c.deletionRequested);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserPasscode.trim()) return;
    onAddUser({
      name: newUserName.trim(),
      email: newUserEmail.trim() || `${newUserName.trim().toLowerCase().replace(/\s+/g, '.')}@sportsfly.com.tr`,
      role: newUserRole,
      title: newUserTitle.trim() || 'Satış Temsilcisi',
      passcode: newUserPasscode.trim(),
    });
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPasscode('');
  };

  return (
    <div className="space-y-5">
      <div className="max-w-full overflow-x-auto">
        <div className="flex items-center gap-1 p-1 rounded-[8px] bg-[var(--bg-subtle)] w-max sm:w-fit">
          {(
            [
              { id: 'roles', label: 'Rol ve Yetki Matrisi' },
              ...(canManageTeam ? [{ id: 'team' as const, label: `Ekip & Geçiş Kodları (${users.length})` }] : []),
              { id: 'approval', label: 'Teklif Onay Akışı' },
              { id: 'catalog', label: 'Ürün Kataloğu' },
              { id: 'kvkk', label: `KVKK Talepleri (${deletionRequests.length})` },
              { id: 'audit', label: 'Denetim Kaydı' },
            ] satisfies Array<{ id: typeof tab; label: string }>
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-[6px] text-xs font-medium whitespace-nowrap ${
                tab === t.id
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'roles' && (
        <div className="rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border-hairline)] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Rol ve Yetki Matrisi (Aktif Rol: {currentPermission.label})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)]/50 text-[var(--text-muted)]">
                  <th className="py-3 px-4 font-medium">Rol</th>
                  <th className="py-3 px-3 font-medium text-center">Fiyat & Sözleşme</th>
                  <th className="py-3 px-3 font-medium text-center">Teklif Yazma</th>
                  <th className="py-3 px-3 font-medium text-center">&gt;%20 İndirim Onayı</th>
                  <th className="py-3 px-3 font-medium text-center">Katalog & Otomasyon</th>
                  <th className="py-3 px-4 font-medium text-center">KVKK & Denetim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-hairline)]">
                {rolePermissions.map((rp) => (
                  <tr key={rp.role}>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[var(--text-primary)]">{rp.label}</div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-0.5 max-w-md">
                        {rp.description}
                      </div>
                    </td>
                    {[
                      rp.canViewPricingAndContracts,
                      rp.canCreateOrEditQuotes,
                      rp.canApproveOver20Discount,
                      rp.canManageCatalogAndAutomation,
                      rp.canManageKvkkAndAudit,
                    ].map((allowed, i) => (
                      <td key={i} className="py-3 px-3 text-center">
                        {allowed ? (
                          <Check className="w-4 h-4 mx-auto text-[var(--status-success)]" />
                        ) : (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'team' && canManageTeam && (
        <div className="space-y-4">
          <form
            onSubmit={handleCreateUser}
            className="p-4 sm:p-5 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-3 text-xs"
          >
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Yeni Satış Temsilcisi / Kullanıcı Ekle
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block font-medium text-[var(--text-secondary)] mb-1">Ad Soyad</label>
                <input
                  required
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Örn. Arda Kaya"
                  className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
                />
              </div>
              <div>
                <label className="block font-medium text-[var(--text-secondary)] mb-1">E-posta</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="arda@sportsfly.com.tr"
                  className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
                />
              </div>
              <div>
                <label className="block font-medium text-[var(--text-secondary)] mb-1">Rol</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as RoleType)}
                  className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
                >
                  <option value="SatisTemsilcisi">Satış Temsilcisi</option>
                  <option value="MusteriBasari">Müşteri Başarı</option>
                  <option value="Finans">Finans</option>
                  <option value="Yonetici">Yönetici</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-[var(--text-secondary)] mb-1">Ünvan</label>
                <input
                  type="text"
                  value={newUserTitle}
                  onChange={(e) => setNewUserTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block font-medium text-[var(--text-secondary)] mb-1">
                    Geçiş Kodu
                  </label>
                  <input
                    required
                    type="text"
                    inputMode="numeric"
                    value={newUserPasscode}
                    onChange={(e) => setNewUserPasscode(e.target.value)}
                    placeholder="Örn. 5120"
                    className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] font-mono-num"
                  />
                </div>
                <button
                  type="submit"
                  className="self-end inline-flex items-center gap-1 px-3 py-2 rounded-[8px] bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] font-medium whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Ekle</span>
                </button>
              </div>
            </div>
          </form>

          <div className="rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-hidden">
            <div className="p-4 border-b border-[var(--border-hairline)] flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Ekip Üyeleri ve Giriş Geçiş Kodları
              </h2>
            </div>
            <div className="divide-y divide-[var(--border-hairline)] text-xs">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="p-4 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-[var(--text-primary)]">
                      {u.name}
                      {u.isSuperAdmin ? ' · Süper Admin' : ''}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {u.title} · {u.email}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      aria-label={`${u.name} geçiş kodu`}
                      value={editingPasscodes[u.id] ?? u.passcode}
                      onChange={(e) =>
                        setEditingPasscodes({ ...editingPasscodes, [u.id]: e.target.value })
                      }
                      className="w-24 px-2.5 py-1.5 rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] font-mono-num text-center"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateUserPasscode(u.id, (editingPasscodes[u.id] ?? u.passcode).trim())
                      }
                      className="px-3 py-1.5 rounded-[6px] bg-[var(--accent)] text-[var(--accent-fg)] font-medium hover:bg-[var(--accent-hover)] whitespace-nowrap"
                    >
                      Kodu Güncelle
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'approval' && (
        <div className="p-5 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-4 text-xs">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Teklif Onay ve Fiyatlandırma Politikası
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-[8px] border border-[var(--border-hairline)]">
              <dt className="text-[var(--text-muted)]">Satış Temsilcisi İndirim Limiti</dt>
              <dd className="text-base font-bold text-[var(--text-primary)] mt-1 tabular-nums">
                %{DISCOUNT_APPROVAL_THRESHOLD}
              </dd>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                %20 üzeri indirimlerde Yönetici ve Finans rollerinin çift onayı zorunludur.
              </p>
            </div>
            <div className="p-4 rounded-[8px] border border-[var(--border-hairline)]">
              <dt className="text-[var(--text-muted)]">Standart KDV Oranı ve Geçerlilik</dt>
              <dd className="text-base font-bold text-[var(--text-primary)] mt-1 tabular-nums">
                %{VAT_RATE} KDV · {DEFAULT_VALIDITY_DAYS} Gün
              </dd>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                Teklif gönderimi sonrası 3. ve 7. günde otomatik takip hatırlatması tetiklenir.
              </p>
            </div>
          </dl>
        </div>
      )}

      {tab === 'catalog' && (
        <div className="space-y-4">
          <div className="p-5 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-3">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              SportsFly Ana Paketleri
            </h2>
            <div className="divide-y divide-[var(--border-hairline)] text-xs">
              {packages.map((pkg) => (
                <div key={pkg.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[var(--text-primary)]">{pkg.name}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {pkg.description} · Aylık: {formatTRY(pkg.monthlyPrice, false)}/ay · Yıllık (%20 indirim): {formatTRY(pkg.yearlyMonthlyPrice, false)}/ay
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      disabled={!currentPermission.canManageCatalogAndAutomation}
                      value={editingPrice[pkg.id] ?? pkg.baseAnnualPrice}
                      onChange={(e) =>
                        setEditingPrice({ ...editingPrice, [pkg.id]: Number(e.target.value) })
                      }
                      aria-label={`${pkg.name} yıllık peşin baz fiyatı`}
                      className="w-28 px-2.5 py-1.5 rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] tabular-nums text-right"
                    />
                    {currentPermission.canManageCatalogAndAutomation && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdatePackagePrice(pkg.id, editingPrice[pkg.id] ?? pkg.baseAnnualPrice)
                        }
                        className="px-3 py-1.5 rounded-[6px] bg-[var(--accent)] text-[var(--accent-fg)] font-medium"
                      >
                        Güncelle
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-2 text-xs">
              <h3 className="font-semibold text-[var(--text-primary)]">Sporcu Sayısı Kademeleri</h3>
              {tiers.map((t) => (
                <div key={t.id} className="flex justify-between py-1 border-b border-[var(--border-hairline)] last:border-b-0">
                  <span>{t.label}</span>
                  <span className="tabular-nums font-medium">×{t.multiplier.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="p-4 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-2 text-xs">
              <h3 className="font-semibold text-[var(--text-primary)]">Ek Modül Fiyatları (Aylık / Özel)</h3>
              {modules.map((m) => (
                <div key={m.key} className="flex justify-between gap-2 py-1 border-b border-[var(--border-hairline)] last:border-b-0">
                  <span className="truncate">{m.name}</span>
                  <span className="tabular-nums font-medium shrink-0 text-right">
                    {m.pricingNote
                      ? m.pricingNote
                      : `${formatTRY(m.monthlyAddonPrice, false)}/ay · ${formatTRY(m.annualAddonPrice, false)}/yıl`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'kvkk' && (
        <div className="p-5 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-3 text-xs">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            KVKK Veri Saklama ve Silme Talepleri
          </h2>
          {deletionRequests.length === 0 ? (
            <p className="text-[var(--text-muted)]">Bekleyen KVKK silme talebi yok.</p>
          ) : (
            <div className="divide-y divide-[var(--border-hairline)]">
              {deletionRequests.map((ct) => (
                <div key={ct.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[var(--text-primary)]">{ct.fullName}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {ct.email} · Talep Tarihi: {formatDateTimeTR(ct.deletionRequestedAt)}
                    </div>
                  </div>
                  {currentPermission.canManageKvkkAndAudit ? (
                    <button
                      type="button"
                      onClick={() => onExecuteKvkkDeletion(ct.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[var(--status-error)] text-white font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Kişisel Veriyi Anonimleştir / Sil</span>
                    </button>
                  ) : (
                    <StatusText label="Yetkili Onayı Bekliyor" tone="warning" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'audit' && (
        <div className="rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border-hairline)]">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Denetim Kaydı (Kim, Ne Zaman, Neyi Değiştirdi)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)]/50 text-[var(--text-muted)]">
                  <th className="py-2.5 px-4 font-medium">Tarih</th>
                  <th className="py-2.5 px-3 font-medium">Kullanıcı</th>
                  <th className="py-2.5 px-3 font-medium">İşlem</th>
                  <th className="py-2.5 px-3 font-medium">Kayıt</th>
                  <th className="py-2.5 px-4 font-medium">Detay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-hairline)]">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-2.5 px-4 tabular-nums text-[var(--text-muted)] whitespace-nowrap">
                      {formatDateTimeTR(log.createdAt)}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-[var(--text-primary)]">
                      {getUserName(log.actorId)}
                    </td>
                    <td className="py-2.5 px-3 text-[var(--text-primary)]">{log.action}</td>
                    <td className="py-2.5 px-3 text-[var(--text-secondary)]">{log.entityLabel}</td>
                    <td className="py-2.5 px-4 text-[var(--text-muted)]">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
