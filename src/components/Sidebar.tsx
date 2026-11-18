import React from 'react';
import {
  BarChart3,
  Building2,
  CheckSquare,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  Users,
  Workflow,
  X,
} from 'lucide-react';
import type { AppRoute, RolePermission, RoleType, User } from '../types/crm';

interface SidebarProps {
  activeRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  currentUser: User;
  users: User[];
  onSwitchUser: (userId: string) => void;
  rolePermissions: RolePermission[];
  pendingApprovalsCount: number;
  overdueTasksCount: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
}

export function Sidebar({
  activeRoute,
  onNavigate,
  currentUser,
  users,
  onSwitchUser,
  rolePermissions,
  pendingApprovalsCount,
  overdueTasksCount,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  onLogout,
}: SidebarProps) {
  const currentPerm = rolePermissions.find((p) => p.role === currentUser.role);

  const primaryItems: Array<{
    route: AppRoute;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    counter?: number;
  }> = [
    { route: 'dashboard', label: 'Gösterge Paneli', icon: LayoutDashboard },
    {
      route: 'quotes',
      label: 'Teklifler',
      icon: FileSpreadsheet,
      counter: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
    },
    { route: 'clubs', label: 'Kulüpler ve Hesaplar', icon: Building2 },
    { route: 'contacts', label: 'Kişiler ve KVKK', icon: Users },
    {
      route: 'tasks',
      label: 'Görevler ve Takvim',
      icon: CheckSquare,
      counter: overdueTasksCount > 0 ? overdueTasksCount : undefined,
    },
  ];

  const managementItems: Array<{
    route: AppRoute;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    hidden?: boolean;
  }> = [
    { route: 'reports', label: 'Raporlar', icon: BarChart3 },
    {
      route: 'automation',
      label: 'Süreç Otomasyonu',
      icon: Workflow,
      hidden: !currentPerm?.canManageCatalogAndAutomation && currentUser.role !== 'SatisTemsilcisi',
    },
    { route: 'settings', label: 'Ayarlar ve Yönetim', icon: Settings },
  ];

  const roleLabels: Record<RoleType, string> = {
    Yonetici: 'Yönetici',
    SatisTemsilcisi: 'Satış Temsilcisi',
    MusteriBasari: 'Müşteri Başarı',
    Finans: 'Finans',
  };

  const renderNavContent = (isCompact: boolean, isMobileDrawer: boolean) => (
    <div className="flex flex-col h-full bg-[var(--bg-surface)] border-r border-[var(--border-hairline)]">
      <div
        className={`h-14 flex items-center border-b border-[var(--border-hairline)] shrink-0 ${
          isCompact ? 'px-2.5 justify-center' : 'px-4 justify-between'
        }`}
      >
        {isCompact ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Sol menüyü genişlet"
            aria-label="Sol menüyü genişlet"
            className="w-10 h-10 rounded-[8px] flex items-center justify-center hover:bg-[var(--bg-subtle)] transition-colors"
          >
            <img
              src="/assets/aistudio/images__1__e22ba1d6.jpg"
              alt="SportsFly"
              className="w-7 h-7 object-contain rounded-[6px] bg-white border border-[var(--border-hairline)]"
            />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              onNavigate('dashboard');
              onCloseMobile();
            }}
            className="inline-flex items-center gap-2.5 text-base font-bold tracking-tight text-[var(--text-primary)] whitespace-nowrap shrink-0"
          >
            <img
              src="/assets/aistudio/images__1__e22ba1d6.jpg"
              alt="SportsFly"
              className="w-7 h-7 object-contain rounded-[6px] bg-white border border-[var(--border-hairline)] shrink-0"
            />
            <span className="min-w-0 leading-tight text-left">
              <span className="block text-sm font-bold tracking-tight">
                <span>Sports</span>
                <span className="text-[var(--accent)]">Fly</span>
              </span>
              <span className="block text-[11px] font-semibold text-[var(--text-muted)]">
                Sales&amp;Marketing
              </span>
            </span>
          </button>
        )}

        {isMobileDrawer ? (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Menüyü kapat"
            className="p-1.5 rounded-[8px] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          !isCompact && (
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Sol menüyü daralt"
              aria-label="Sol menüyü daralt"
              className="hidden lg:inline-flex p-1.5 rounded-[8px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )
        )}
      </div>

      <nav className={`flex-1 overflow-y-auto py-4 space-y-6 ${isCompact ? 'px-2' : 'px-3'}`} aria-label="Ana menü">
        <div>
          {!isCompact && (
            <div className="px-3 mb-2 text-[11px] font-semibold tracking-wide text-[var(--text-muted)]">
              Operasyon
            </div>
          )}
          <ul className="space-y-1">
            {primaryItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                activeRoute === item.route ||
                (item.route === 'quotes' && activeRoute === 'quote-builder');

              return (
                <li key={item.route}>
                  <button
                    type="button"
                    title={isCompact ? item.label : undefined}
                    aria-label={item.label}
                    onClick={() => {
                      onNavigate(item.route);
                      onCloseMobile();
                    }}
                    className={`w-full flex items-center rounded-[8px] text-sm font-medium transition-colors whitespace-nowrap relative ${
                      isCompact ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2'
                    } ${
                      isActive
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className={`flex items-center ${isCompact ? '' : 'gap-2.5 truncate'}`}>
                      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                      {!isCompact && <span className="truncate">{item.label}</span>}
                    </span>
                    {!isCompact && item.counter !== undefined && (
                      <span className="text-xs font-mono-num text-[var(--text-muted)] ml-2 shrink-0">
                        {item.counter}
                      </span>
                    )}
                    {isCompact && item.counter !== undefined && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--accent)]" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          {!isCompact && (
            <div className="px-3 mb-2 text-[11px] font-semibold tracking-wide text-[var(--text-muted)]">
              Analiz ve Sistem
            </div>
          )}
          <ul className="space-y-1">
            {managementItems
              .filter((i) => !i.hidden)
              .map((item) => {
                const Icon = item.icon;
                const isActive = activeRoute === item.route;
                return (
                  <li key={item.route}>
                    <button
                      type="button"
                      title={isCompact ? item.label : undefined}
                      aria-label={item.label}
                      onClick={() => {
                        onNavigate(item.route);
                        onCloseMobile();
                      }}
                      className={`w-full flex items-center rounded-[8px] text-sm font-medium transition-colors whitespace-nowrap ${
                        isCompact ? 'justify-center px-2 py-2.5' : 'gap-2.5 px-3 py-2'
                      } ${
                        isActive
                          ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                      {!isCompact && <span className="truncate">{item.label}</span>}
                    </button>
                  </li>
                );
              })}
          </ul>
        </div>
      </nav>

      {isCompact ? (
        <div className="p-2 border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)]/50 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onLogout}
            title={`Çıkış Yap (${currentUser.name})`}
            aria-label="Oturumu kapat"
            className="w-10 h-10 rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-hairline)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--status-error)] transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="p-3 border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)]/50 space-y-2.5">
          <div className="px-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                {currentUser.name}
              </span>
              <span className="text-[11px] font-medium text-[var(--accent)] shrink-0">
                {currentUser.isSuperAdmin ? 'Süper Admin' : roleLabels[currentUser.role]}
              </span>
            </div>
            <div className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
              {currentUser.title} · {currentUser.email}
            </div>
          </div>

          {currentUser.isSuperAdmin && (
            <div>
              <label
                htmlFor={isMobileDrawer ? 'active-user-role-select-mobile' : 'active-user-role-select'}
                className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)] mb-1 px-1"
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Kullanıcı Görünümü</span>
              </label>
              <select
                id={isMobileDrawer ? 'active-user-role-select-mobile' : 'active-user-role-select'}
                value={currentUser.id}
                onChange={(e) => onSwitchUser(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-medium rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} · {u.isSuperAdmin ? 'Süper Admin' : roleLabels[u.role]}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              onCloseMobile();
              onLogout();
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--status-error)] hover:border-[var(--status-error)]/40 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside
        className={`hidden lg:block shrink-0 h-screen sticky top-0 no-print transition-[width] duration-200 ${
          collapsed ? 'w-[72px]' : 'w-[256px]'
        }`}
      >
        {renderNavContent(collapsed, false)}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-[280px] max-w-[85vw] h-full z-10">
            {renderNavContent(false, true)}
          </aside>
        </div>
      )}
    </>
  );
}
