import React, { useMemo, useState } from 'react';
import { CalendarDays, Check, Download, ListChecks, Plus } from 'lucide-react';
import type {
  Club,
  Quote,
  RolePermission,
  Task,
  User,
} from '../types/crm';
import { formatDateTR, formatTRY, isDateOverdue } from '../utils/formatters';
import { TODAY_ISO } from '../data/mockData';
import { StatusText } from './ui';

interface TasksViewProps {
  tasks: Task[];
  clubs: Club[];
  users: User[];
  onToggleTask: (taskId: string) => void;
  onAddTask: (payload: {
    title: string;
    clubId: string;
    assigneeId: string;
    dueDate: string;
  }) => void;
}

export function TasksView({
  tasks,
  clubs,
  users,
  onToggleTask,
  onAddTask,
}: TasksViewProps) {
  const [tab, setTab] = useState<'list' | 'calendar'>('list');
  const [showCompleted, setShowCompleted] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newClubId, setNewClubId] = useState(clubs[0]?.id ?? '');
  const [newAssigneeId, setNewAssigneeId] = useState(users[1]?.id ?? users[0]?.id ?? '');
  const [newDueDate, setNewDueDate] = useState('2026-11-21');

  const getClubName = (id: string) => clubs.find((c) => c.id === id)?.name ?? 'Kulüp';
  const getUserName = (id: string) => users.find((u) => u.id === id)?.name ?? '';

  const visibleTasks = tasks
    .filter((t) => showCompleted || !t.completed)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddTask({
      title: newTitle.trim(),
      clubId: newClubId,
      assigneeId: newAssigneeId,
      dueDate: `${newDueDate}T15:00:00.000Z`,
    });
    setNewTitle('');
  };

  // Kasım 2026 Takvim Günleri (Pazartesi başlangıçlı 30 gün)
  const novemberDays = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <div className="space-y-5">
      {/* Üst Çubuk */}
      <div className="p-4 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-full overflow-x-auto">
          <div className="flex items-center gap-1 p-1 rounded-[8px] bg-[var(--bg-subtle)] w-max">
            <button
              type="button"
              onClick={() => setTab('list')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-medium whitespace-nowrap ${
                tab === 'list'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" />
              <span>Görev Listesi</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('calendar')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-medium whitespace-nowrap ${
                tab === 'calendar'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Takvim Görünümü (Kasım 2026)</span>
            </button>
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
          />
          <span>Tamamlananları göster</span>
        </label>
      </div>

      {/* Hızlı Görev Ekleme */}
      <form
        onSubmit={handleAdd}
        className="p-4 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] grid grid-cols-1 md:grid-cols-12 gap-3 items-end text-xs"
      >
        <div className="md:col-span-5">
          <label className="block font-medium text-[var(--text-secondary)] mb-1">Yeni Görev</label>
          <input
            required
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Örn. Sözleşme taslağını mali işlere ilet"
            className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
          />
        </div>
        <div className="md:col-span-3">
          <label className="block font-medium text-[var(--text-secondary)] mb-1">Kulüp</label>
          <select
            value={newClubId}
            onChange={(e) => setNewClubId(e.target.value)}
            className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
          >
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block font-medium text-[var(--text-secondary)] mb-1">Sorumlu</label>
          <select
            value={newAssigneeId}
            onChange={(e) => setNewAssigneeId(e.target.value)}
            className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2 flex gap-2">
          <input
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            aria-label="Son tarih"
            className="w-full px-2.5 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]"
          />
          <button
            type="submit"
            aria-label="Görev ekle"
            className="px-3 py-2 rounded-[8px] bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] shrink-0"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </form>

      {tab === 'list' ? (
        <div className="rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] divide-y divide-[var(--border-hairline)]">
          {visibleTasks.map((task) => {
            const overdue = !task.completed && isDateOverdue(task.dueDate, TODAY_ISO);
            return (
              <div
                key={task.id}
                className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-[var(--bg-subtle)]/30"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => onToggleTask(task.id)}
                    aria-label={`Görevi işaretle: ${task.title}`}
                    className={`mt-0.5 w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0 ${
                      task.completed
                        ? 'bg-[var(--status-success)] border-[var(--status-success)] text-white'
                        : 'border-[var(--border-strong)]'
                    }`}
                  >
                    {task.completed && <Check className="w-3 h-3" />}
                  </button>
                  <div className="min-w-0">
                    <div
                      className={`text-xs font-medium ${
                        task.completed
                          ? 'line-through text-[var(--text-muted)]'
                          : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {task.title}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      {getClubName(task.clubId)} · {getUserName(task.assigneeId)}
                      {task.autoGenerated && task.sourceRule ? ` · Otomatik: ${task.sourceRule}` : ''}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs shrink-0">
                  <span className="tabular-nums text-[var(--text-secondary)]">
                    {formatDateTR(task.dueDate)}
                  </span>
                  <StatusText
                    label={task.completed ? 'Tamamlandı' : overdue ? 'Gecikti' : 'Açık'}
                    tone={task.completed ? 'success' : overdue ? 'error' : 'info'}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-3 sm:p-4 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-7 gap-2 text-[11px] font-semibold text-[var(--text-muted)] mb-2 text-center">
              <div>Pzt</div>
              <div>Sal</div>
              <div>Çar</div>
              <div>Per</div>
              <div>Cum</div>
              <div>Cmt</div>
              <div>Paz</div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {/* 1 Kasım 2026 Pazar günüdür -> Pazartesi başlangıçta 6 boş hücre */}
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={`empty-${idx}`} className="min-h-[84px] rounded-[6px] bg-[var(--bg-subtle)]/20" />
              ))}
              {novemberDays.map((day) => {
                const isoDay = `2026-11-${String(day).padStart(2, '0')}`;
                const dayTasks = tasks.filter((t) => t.dueDate.startsWith(isoDay));
                const isToday = day === 18;

                return (
                  <div
                    key={day}
                    className={`min-h-[84px] p-2 rounded-[6px] border text-[11px] ${
                      isToday
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]/30'
                        : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)]'
                    }`}
                  >
                    <div className="font-semibold tabular-nums text-[var(--text-primary)] mb-1">
                      {day}
                    </div>
                    <div className="space-y-1">
                      {dayTasks.map((t) => (
                        <div
                          key={t.id}
                          className="px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-primary)] truncate text-[10px]"
                          title={t.title}
                        >
                          {t.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ReportsViewProps {
  quotes: Quote[];
  clubs: Club[];
  users: User[];
  permission: RolePermission;
}

export function ReportsView({ quotes, clubs, users, permission }: ReportsViewProps) {
  const byStatus = useMemo(() => {
    const map: Record<string, number> = {};
    quotes.forEach((q) => {
      map[q.status] = (map[q.status] ?? 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [quotes]);

  const byOwner = useMemo(() => {
    return users
      .map((u) => {
        const ownQuotes = quotes.filter((q) => q.createdById === u.id);
        const approved = ownQuotes.filter((q) => q.status === 'Müşteri Onayladı').length;
        const sum = ownQuotes.reduce(
          (s, q) => s + q.versions[q.versions.length - 1].grandTotal,
          0
        );
        return { user: u, count: ownQuotes.length, approved, sum };
      })
      .filter((x) => x.count > 0);
  }, [quotes, users]);

  const byBranch = useMemo(() => {
    const map: Record<string, number> = {};
    quotes.forEach((q) => {
      const club = clubs.find((c) => c.id === q.clubId);
      club?.branches.forEach((b) => {
        map[b] = (map[b] ?? 0) + 1;
      });
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [quotes, clubs]);

  const byBillingCycle = useMemo(() => {
    const map: Record<string, number> = { 'Yıllık Peşin': 0, 'Aylık Ödeme': 0 };
    quotes.forEach((q) => {
      const latest = q.versions[q.versions.length - 1];
      const key = latest.billingCycle === 'yillik' ? 'Yıllık Peşin' : 'Aylık Ödeme';
      map[key] += 1;
    });
    return Object.entries(map);
  }, [quotes]);

  const exportCsv = () => {
    const headers = ['Teklif No', 'Kulup', 'Durum', 'Donem', 'Sporcu', 'Sorumlu', 'Gecerlilik'];
    if (permission.canViewPricingAndContracts) headers.push('Genel Toplam (TRY)');

    const rows = quotes.map((q) => {
      const latest = q.versions[q.versions.length - 1];
      const club = clubs.find((c) => c.id === q.clubId)?.name ?? '';
      const owner = users.find((u) => u.id === q.createdById)?.name ?? '';
      const cols = [
        `"${q.quoteNumber}"`,
        `"${club}"`,
        `"${q.status}"`,
        `"${latest.billingCycle === 'yillik' ? 'Yıllık' : 'Aylık'}"`,
        String(latest.athleteCount),
        `"${owner}"`,
        formatDateTR(q.validUntil),
      ];
      if (permission.canViewPricingAndContracts) cols.push(String(latest.grandTotal));
      return cols.join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'SportsFly_Sales_Marketing_Rapor.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Dönemsel Satış ve Teklif Analizi
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Teklif durumu, sorumlu performansı, branş ve ödeme planı dağılımı (Excel / CSV uyumlu dışa aktarım)
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-xs font-medium bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" />
          <span>CSV / Excel Dışa Aktar</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="p-5 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Duruma Göre Teklif Dağılımı
          </h3>
          <div className="space-y-2.5">
            {byStatus.map(([status, count]) => (
              <div key={status} className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-primary)] font-medium">{status}</span>
                  <span className="tabular-nums text-[var(--text-secondary)]">{count} teklif</span>
                </div>
                <div className="h-2 rounded bg-[var(--bg-subtle)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)]"
                    style={{ width: `${Math.round((count / Math.max(1, quotes.length)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="p-5 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Branşa Göre Teklif Yoğunluğu
          </h3>
          <div className="space-y-2.5">
            {byBranch.map(([branch, count]) => (
              <div key={branch} className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-primary)] font-medium">{branch}</span>
                  <span className="tabular-nums text-[var(--text-secondary)]">{count} teklif</span>
                </div>
                <div className="h-2 rounded bg-[var(--bg-subtle)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)]"
                    style={{ width: `${Math.round((count / Math.max(1, quotes.length)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="p-4 sm:p-5 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Sorumluya Göre Satış Performansı
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-hairline)] text-[var(--text-muted)]">
                  <th className="py-2 pr-3 font-medium">Sorumlu</th>
                  <th className="py-2 px-2 font-medium text-right">Teklif</th>
                  <th className="py-2 px-2 font-medium text-right">Onaylanan</th>
                  {permission.canViewPricingAndContracts && (
                    <th className="py-2 pl-2 font-medium text-right">Toplam Hacim</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-hairline)]">
                {byOwner.map(({ user, count, approved, sum }) => (
                  <tr key={user.id}>
                    <td className="py-2.5 pr-3 font-medium text-[var(--text-primary)] whitespace-nowrap">
                      {user.name}
                    </td>
                    <td className="py-2.5 px-2 text-right tabular-nums">{count}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums text-[var(--status-success)] font-medium">
                      {approved}
                    </td>
                    {permission.canViewPricingAndContracts && (
                      <td className="py-2.5 pl-2 text-right tabular-nums font-medium whitespace-nowrap">
                        {formatTRY(sum, false)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="p-5 rounded-[10px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Ödeme Planı Tercih Dağılımı
          </h3>
          <ul className="divide-y divide-[var(--border-hairline)] text-xs">
            {byBillingCycle.map(([cycle, count]) => (
              <li key={cycle} className="py-2.5 flex items-center justify-between">
                <span className="font-medium text-[var(--text-primary)]">{cycle}</span>
                <span className="tabular-nums text-[var(--accent)] font-semibold">
                  {count} teklif
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
