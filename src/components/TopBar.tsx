import React from 'react';
import { Menu, Moon, PanelLeftClose, PanelLeftOpen, Plus, Sun } from 'lucide-react';
import type { AppRoute } from '../types/crm';

interface TopBarProps {
  activeRoute: AppRoute;
  darkMode: boolean;
  onToggleTheme: () => void;
  sidebarCollapsed: boolean;
  onToggleSidebarCollapse: () => void;
  onOpenMobileMenu: () => void;
  onNewQuote: () => void;
  canCreateQuote: boolean;
}

const ROUTE_TITLES: Record<AppRoute, { title: string; trail: string }> = {
  dashboard: { title: 'Gösterge Paneli', trail: 'SportsFly Sales&Marketing / Gösterge Paneli' },
  quotes: { title: 'Teklif Yönetimi', trail: 'SportsFly Sales&Marketing / Teklifler' },
  'quote-builder': {
    title: 'Teklif Oluşturma',
    trail: 'SportsFly Sales&Marketing / Teklifler / Düzenleyici',
  },
  clubs: { title: 'Kulüp ve Müşteri Hesapları', trail: 'SportsFly Sales&Marketing / Kulüpler' },
  contacts: { title: 'Kişiler ve KVKK Kayıtları', trail: 'SportsFly Sales&Marketing / Kişiler' },
  tasks: { title: 'Görevler ve Aktiviteler', trail: 'SportsFly Sales&Marketing / Görevler' },
  automation: { title: 'Süreç Otomasyonu', trail: 'SportsFly Sales&Marketing / Otomasyon' },
  reports: { title: 'Raporlar ve Analiz', trail: 'SportsFly Sales&Marketing / Raporlar' },
  settings: { title: 'Ayarlar ve Yönetim', trail: 'SportsFly Sales&Marketing / Ayarlar' },
};

export function TopBar({
  activeRoute,
  darkMode,
  onToggleTheme,
  sidebarCollapsed,
  onToggleSidebarCollapse,
  onOpenMobileMenu,
  onNewQuote,
  canCreateQuote,
}: TopBarProps) {
  const info = ROUTE_TITLES[activeRoute];

  return (
    <header className="h-14 px-3 sm:px-6 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)] flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-30 no-print">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Gezinme menüsünü aç"
          className="lg:hidden p-2 rounded-[8px] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={onToggleSidebarCollapse}
          aria-label={sidebarCollapsed ? 'Sol menüyü aç' : 'Sol menüyü kapat'}
          title={sidebarCollapsed ? 'Sol menüyü aç' : 'Sol menüyü daralt'}
          className="hidden lg:inline-flex p-2 rounded-[8px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] shrink-0 transition-colors"
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>

        <div className="min-w-0">
          <div className="text-[11px] font-medium text-[var(--text-muted)] truncate hidden sm:block">
            {info.trail}
          </div>
          <h1 className="text-sm sm:text-base font-semibold text-[var(--text-primary)] truncate">
            {info.title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={darkMode ? 'Açık temaya geç' : 'Koyu temaya geç'}
          className="p-2 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors shrink-0"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {canCreateQuote && (
          <button
            type="button"
            onClick={onNewQuote}
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-[8px] text-xs font-semibold bg-[var(--brand-lime)] text-[var(--brand-lime-fg)] hover:bg-[var(--brand-lime-hover)] transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Yeni Teklif</span>
          </button>
        )}
      </div>
    </header>
  );
}
