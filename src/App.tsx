import React, { useEffect, useState } from 'react';
import {
  ATHLETE_TIERS,
  INITIAL_ACTIVITIES,
  INITIAL_AUDIT_LOGS,
  INITIAL_AUTOMATION_RULES,
  INITIAL_CLUBS,
  INITIAL_CONTACTS,
  INITIAL_PACKAGES,
  INITIAL_QUOTES,
  INITIAL_TASKS,
  INITIAL_USERS,
  PRODUCT_MODULES,
  ROLE_PERMISSIONS,
  TODAY_ISO,
} from './data/mockData';
import type {
  Activity,
  AppRoute,
  AuditLog,
  AutomationRule,
  Club,
  Contact,
  ProductPackage,
  Quote,
  RoleType,
  Task,
  User,
} from './types/crm';
import {
  addDaysISO,
  calculateQuotePricing,
  isDateOverdue,
  NO_PACKAGE_ID,
} from './utils/formatters';
import { generateProposalPdf, type ProposalFormat } from './utils/proposalPdfGenerator';
import { LoginView } from './components/LoginView';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardView } from './components/DashboardView';
import { QuotesView } from './components/QuotesView';
import { QuoteBuilderView } from './components/QuoteBuilderView';
import { ClubsView, ContactsView } from './components/ClubsAndContactsView';
import { ReportsView, TasksView } from './components/TasksAndReportsView';
import { AutomationView, SettingsView } from './components/AutomationAndSettingsView';
import { DigitalApprovalModal } from './components/DigitalApprovalModal';
import { ProposalPreviewModal } from './components/ProposalPreviewModal';
import { ToastBanner, type StatusTone } from './components/ui';

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeRoute, setActiveRoute] = useState<AppRoute>('dashboard');

  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState(INITIAL_USERS[0].id);
  const currentUser = users.find((u) => u.id === currentUserId) ?? users[0];
  const currentPermission =
    ROLE_PERMISSIONS.find((p) => p.role === currentUser.role) ?? ROLE_PERMISSIONS[0];

  const [clubs, setClubs] = useState<Club[]>(INITIAL_CLUBS);
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);
  const [activities] = useState<Activity[]>(INITIAL_ACTIVITIES);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [quotes, setQuotes] = useState<Quote[]>(INITIAL_QUOTES);
  const [packages, setPackages] = useState<ProductPackage[]>(INITIAL_PACKAGES);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>(INITIAL_AUTOMATION_RULES);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);

  const [editingQuoteId, setEditingQuoteId] = useState<string | undefined>(undefined);
  const [digitalApprovalQuoteId, setDigitalApprovalQuoteId] = useState<string | null>(null);
  const [proposalPreviewQuoteId, setProposalPreviewQuoteId] = useState<string | null>(null);
  const [proposalFormat, setProposalFormat] = useState<ProposalFormat>('2-sayfa');
  const [toast, setToast] = useState<{ message: string; tone: StatusTone } | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const showToast = (message: string, tone: StatusTone = 'info') => {
    setToast({ message, tone });
  };

  const appendAudit = (
    action: string,
    entityType: AuditLog['entityType'],
    entityLabel: string,
    details: string
  ) => {
    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        actorId: currentUser.id,
        action,
        entityType,
        entityLabel,
        details,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const handleSaveQuote = (payload: {
    quoteId?: string;
    clubId: string;
    contactId: string;
    requestId?: string;
    templateName: Quote['templateName'];
    billingCycle: Quote['versions'][number]['billingCycle'];
    packageId: string;
    selectedModules: Quote['versions'][number]['selectedModules'];
    athleteCount: number;
    customMonthlyPrice?: number;
    discountPercent: number;
    prepaidEnabled: boolean;
    prepaidDiscountPercent: number;
    labMode: Quote['versions'][number]['labMode'];
    labAthleteCount: number;
    tournamentMode: Quote['versions'][number]['tournamentMode'];
    validityDays: number;
    reminderDay3Enabled: boolean;
    reminderDay7Enabled: boolean;
    termsNote: string;
    changeNote: string;
    action: 'draft' | 'send' | 'request_approval';
  }): Quote => {
    const pkg =
      payload.packageId === NO_PACKAGE_ID
        ? undefined
        : packages.find((p) => p.id === payload.packageId);
    const calc = calculateQuotePricing({
      pkg,
      selectedModules: payload.selectedModules,
      allModules: PRODUCT_MODULES,
      athleteCount: payload.athleteCount,
      tiers: ATHLETE_TIERS,
      discountPercent: payload.discountPercent,
      billingCycle: payload.billingCycle,
      customMonthlyPrice: payload.customMonthlyPrice,
      prepaidEnabled: payload.prepaidEnabled,
      prepaidDiscountPercent: payload.prepaidDiscountPercent,
      labMode: payload.labMode,
      labAthleteCount: payload.labAthleteCount,
      tournamentMode: payload.tournamentMode,
    });

    const nowIso = new Date().toISOString();
    const existing = payload.quoteId ? quotes.find((q) => q.id === payload.quoteId) : undefined;
    const nextVersionNumber = existing ? existing.currentVersion + 1 : 1;

    const newVersion = {
      version: nextVersionNumber,
      createdAt: nowIso,
      createdById: currentUser.id,
      changeNote: payload.changeNote,
      billingCycle: calc.billingCycle,
      packageId: pkg?.id ?? NO_PACKAGE_ID,
      selectedModules: payload.selectedModules,
      athleteCount: payload.athleteCount,
      tierId: calc.tier.id,
      customMonthlyPrice: payload.customMonthlyPrice,
      monthlyListAmount: calc.monthlyListAmount,
      monthlyDiscountedAmount: calc.monthlyDiscountedAmount,
      annualListTotal: calc.annualListTotal,
      annualPlanDiscountPercent: calc.annualPlanDiscountPercent,
      annualPlanSavingsAmount: calc.annualPlanSavingsAmount,
      annualPrepaidAmount: calc.annualPrepaidAmount,
      packageBaseAmount: calc.packageBaseAmount,
      tierAdjustmentAmount: calc.tierAdjustmentAmount,
      addonModulesAmount: calc.addonModulesAmount,
      recurringAddonsAmount: calc.recurringAddonsAmount,
      labMode: calc.labSelected ? calc.labMode : undefined,
      labAthleteCount: calc.labSelected ? calc.labAthleteCount : undefined,
      labAmount: calc.labSelected ? calc.labAmount : 0,
      tournamentMode: calc.tournamentSelected ? calc.tournamentMode : undefined,
      tournamentAmount: calc.tournamentSelected ? calc.tournamentAmount : 0,
      subtotal: calc.subtotal,
      discountPercent: calc.discountPercent,
      discountAmount: calc.discountAmount,
      prepaidEnabled: calc.prepaidEnabled,
      prepaidDiscountPercent: calc.prepaidDiscountPercent,
      prepaidDiscountAmount: calc.prepaidDiscountAmount,
      effectiveTotalDiscountPercent: calc.effectiveTotalDiscountPercent,
      netTotal: calc.netTotal,
      vatRate: calc.vatRate,
      vatAmount: calc.vatAmount,
      grandTotal: calc.grandTotal,
      termsNote: payload.termsNote,
    };

    const needsDual = calc.requiresDualApproval;
    let nextStatus: Quote['status'] = 'Taslak';
    if (payload.action === 'request_approval' || (payload.action === 'send' && needsDual)) {
      nextStatus = 'Onay Bekliyor';
    } else if (payload.action === 'send') {
      nextStatus = 'Gönderildi';
    }

    const updatedQuote: Quote = existing
      ? {
          ...existing,
          templateName: payload.templateName,
          currentVersion: nextVersionNumber,
          versions: [...existing.versions, newVersion],
          status: nextStatus,
          validityDays: payload.validityDays,
          validUntil: addDaysISO(TODAY_ISO, payload.validityDays),
          reminderDay3Enabled: payload.reminderDay3Enabled,
          reminderDay7Enabled: payload.reminderDay7Enabled,
          requiresDualApproval: needsDual,
          managerApproved: needsDual ? currentUser.role === 'Yonetici' : true,
          financeApproved: needsDual ? currentUser.role === 'Finans' : true,
          sentAt: nextStatus === 'Gönderildi' ? nowIso : existing.sentAt,
        }
      : {
          id: `qt-${Date.now()}`,
          quoteNumber: `SF-2026-0${146 + quotes.length}`,
          requestId: payload.requestId,
          clubId: payload.clubId,
          contactId: payload.contactId,
          templateName: payload.templateName,
          currentVersion: 1,
          versions: [newVersion],
          status: nextStatus,
          validUntil: addDaysISO(TODAY_ISO, payload.validityDays),
          validityDays: payload.validityDays,
          reminderDay3Enabled: payload.reminderDay3Enabled,
          reminderDay7Enabled: payload.reminderDay7Enabled,
          requiresDualApproval: needsDual,
          managerApproved: needsDual ? currentUser.role === 'Yonetici' : true,
          financeApproved: needsDual ? currentUser.role === 'Finans' : true,
          digitalApprovalToken: `sf-${Date.now().toString(36)}`,
          sentAt: nextStatus === 'Gönderildi' ? nowIso : undefined,
          createdById: currentUser.id,
          createdAt: nowIso,
        };

    setQuotes((prev) =>
      existing
        ? prev.map((q) => (q.id === existing.id ? updatedQuote : q))
        : [updatedQuote, ...prev]
    );

    // Otomatik 3. ve 7. gün takip hatırlatması oluştur
    if (nextStatus === 'Gönderildi') {
      const clubName = clubs.find((c) => c.id === payload.clubId)?.name ?? 'Kulüp';
      const newTasks: Task[] = [];
      if (payload.reminderDay3Enabled) {
        newTasks.push({
          id: `tsk-3d-${Date.now()}`,
          title: `Teklif 3. gün takip araması (${clubName} · ${updatedQuote.quoteNumber})`,
          clubId: payload.clubId,
          assigneeId: currentUser.id,
          dueDate: addDaysISO(TODAY_ISO, 3),
          completed: false,
          autoGenerated: true,
          sourceRule: 'Teklif sonrası 3. gün takip kuralı',
          createdAt: nowIso,
        });
      }
      if (payload.reminderDay7Enabled) {
        newTasks.push({
          id: `tsk-7d-${Date.now() + 1}`,
          title: `Teklif 7. gün takip hatırlatması (${clubName} · ${updatedQuote.quoteNumber})`,
          clubId: payload.clubId,
          assigneeId: currentUser.id,
          dueDate: addDaysISO(TODAY_ISO, 7),
          completed: false,
          autoGenerated: true,
          sourceRule: 'Teklif sonrası 7. gün takip kuralı',
          createdAt: nowIso,
        });
      }
      if (newTasks.length > 0) {
        setTasks((prev) => [...newTasks, ...prev]);
      }
    }

    appendAudit(
      existing ? `Teklif Güncellendi (v${nextVersionNumber})` : 'Teklif Oluşturuldu',
      'Teklif',
      updatedQuote.quoteNumber,
      `Durum: ${nextStatus}, İndirim: %${calc.discountPercent}`
    );

    showToast(
      nextStatus === 'Onay Bekliyor'
        ? `${updatedQuote.quoteNumber} kaydedildi. %20 üzeri indirim için Yönetici ve Finans onayı bekleniyor.`
        : nextStatus === 'Gönderildi'
          ? `${updatedQuote.quoteNumber} (v${updatedQuote.currentVersion}) gönderildi ve 3./7. gün takip görevleri oluşturuldu.`
          : `${updatedQuote.quoteNumber} taslak olarak kaydedildi.`,
      nextStatus === 'Onay Bekliyor' ? 'warning' : 'success'
    );

    setActiveRoute('quotes');
    return updatedQuote;
  };

  const handleApproveQuote = (quoteId: string, kind: 'manager' | 'finance') => {
    setQuotes((prev) =>
      prev.map((q) => {
        if (q.id !== quoteId) return q;
        const nextManager = kind === 'manager' ? true : q.managerApproved;
        const nextFinance = kind === 'finance' ? true : q.financeApproved;
        const bothDone = nextManager && nextFinance;
        return {
          ...q,
          managerApproved: nextManager,
          managerApprovedBy: kind === 'manager' ? currentUser.name : q.managerApprovedBy,
          financeApproved: nextFinance,
          financeApprovedBy: kind === 'finance' ? currentUser.name : q.financeApprovedBy,
          status: bothDone ? 'Gönderildi' : 'Onay Bekliyor',
          sentAt: bothDone ? new Date().toISOString() : q.sentAt,
        };
      })
    );

    const target = quotes.find((q) => q.id === quoteId);
    appendAudit(
      kind === 'manager' ? 'Yönetici İndirim Onayı' : 'Finans İndirim Onayı',
      'Teklif',
      target?.quoteNumber ?? quoteId,
      `${currentUser.name} tarafından %20 üzeri indirim onaylandı.`
    );
    showToast('İndirim onayı kaydedildi.', 'success');
  };

  const handleCustomerDecision = (
    quoteId: string,
    decision: 'approve' | 'revise',
    feedback: string
  ) => {
    const targetQuote = quotes.find((q) => q.id === quoteId);
    if (!targetQuote) return;

    setQuotes((prev) =>
      prev.map((q) =>
        q.id === quoteId
          ? {
              ...q,
              status: decision === 'approve' ? 'Müşteri Onayladı' : 'Revizyon Talep Edildi',
              customerFeedback: feedback,
            }
          : q
      )
    );

    appendAudit(
      decision === 'approve' ? 'Müşteri Dijital Onayı' : 'Müşteri Revizyon Talebi',
      'Teklif',
      targetQuote.quoteNumber,
      feedback
    );

    showToast(
      decision === 'approve'
        ? `${targetQuote.quoteNumber} müşteri tarafından onaylandı.`
        : `${targetQuote.quoteNumber} için revizyon talebi alındı.`,
      decision === 'approve' ? 'success' : 'warning'
    );
  };

  const pendingApprovalsCount = quotes.filter(
    (q) => q.requiresDualApproval && (!q.managerApproved || !q.financeApproved)
  ).length;
  const overdueTasksCount = tasks.filter(
    (t) => !t.completed && isDateOverdue(t.dueDate, TODAY_ISO)
  ).length;

  const digitalApprovalQuote = quotes.find((q) => q.id === digitalApprovalQuoteId);

  const handleLogin = (passcode: string): { ok: boolean; error?: string } => {
    const cleaned = passcode.trim();
    const matched = users.find((u) => u.passcode === cleaned);

    if (!matched) {
      return {
        ok: false,
        error: 'Geçiş kodu hatalı. Lütfen kontrol edip tekrar deneyin.',
      };
    }

    setAuthenticatedUserId(matched.id);
    setCurrentUserId(matched.id);
    setActiveRoute('dashboard');
    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        actorId: matched.id,
        action: 'Oturum Açıldı',
        entityType: 'Ayar',
        entityLabel: matched.name,
        details: `${matched.title} olarak geçiş kodu ile giriş yapıldı.`,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    showToast(`Hoş geldiniz, ${matched.name} (${matched.title}).`, 'success');
    return { ok: true };
  };

  const handleLogout = () => {
    appendAudit('Oturum Kapatıldı', 'Ayar', currentUser.name, 'Kullanıcı sistemden çıkış yaptı.');
    setAuthenticatedUserId(null);
    setActiveRoute('dashboard');
    setMobileMenuOpen(false);
    setToast(null);
  };

  if (!authenticatedUserId) {
    return (
      <LoginView
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode((d) => !d)}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <div className="min-h-screen flex bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <Sidebar
        activeRoute={activeRoute}
        onNavigate={(route) => setActiveRoute(route)}
        currentUser={currentUser}
        users={users}
        onSwitchUser={(id) => {
          setCurrentUserId(id);
          const u = users.find((usr) => usr.id === id);
          if (u) showToast(`Görünüm değiştirildi: ${u.name} (${u.title})`, 'info');
        }}
        rolePermissions={ROLE_PERMISSIONS}
        pendingApprovalsCount={pendingApprovalsCount}
        overdueTasksCount={overdueTasksCount}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onLogout={handleLogout}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          activeRoute={activeRoute}
          darkMode={darkMode}
          onToggleTheme={() => setDarkMode((d) => !d)}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebarCollapse={() => setSidebarCollapsed((c) => !c)}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onNewQuote={() => {
            setEditingQuoteId(undefined);
            setActiveRoute('quote-builder');
          }}
          canCreateQuote={currentPermission.canCreateOrEditQuotes}
        />

        <main className="flex-1 p-3 sm:p-6 max-w-[1440px] w-full mx-auto">
          {activeRoute === 'dashboard' && (
            <DashboardView
              clubs={clubs}
              contacts={contacts}
              activities={activities}
              tasks={tasks}
              quotes={quotes}
              packages={packages}
              modules={PRODUCT_MODULES}
              users={users}
              currentUser={currentUser}
              permission={currentPermission}
              onNavigate={(route) => setActiveRoute(route)}
              onNavigateQuotes={() => setActiveRoute('quotes')}
              onNewQuote={() => {
                setEditingQuoteId(undefined);
                setActiveRoute('quote-builder');
              }}
              onToggleTask={(taskId) =>
                setTasks((prev) =>
                  prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
                )
              }
              onApproveQuote={handleApproveQuote}
              onOpenQuoteBuilder={(quoteId) => {
                setEditingQuoteId(quoteId);
                setActiveRoute('quote-builder');
              }}
              onOpenProposalPreview={(quoteId) => setProposalPreviewQuoteId(quoteId)}
            />
          )}

          {activeRoute === 'quotes' && (
            <QuotesView
              quotes={quotes}
              clubs={clubs}
              packages={packages}
              users={users}
              permission={currentPermission}
              onOpenQuoteBuilder={(quoteId) => {
                setEditingQuoteId(quoteId);
                setActiveRoute('quote-builder');
              }}
              onOpenDigitalApproval={(quoteId) => setDigitalApprovalQuoteId(quoteId)}
              onOpenProposalPreview={(quoteId) => setProposalPreviewQuoteId(quoteId)}
            />
          )}

          {activeRoute === 'quote-builder' && (
            <QuoteBuilderView
              existingQuote={quotes.find((q) => q.id === editingQuoteId)}
              clubs={clubs}
              contacts={contacts}
              packages={packages}
              modules={PRODUCT_MODULES}
              tiers={ATHLETE_TIERS}
              users={users}
              currentUser={currentUser}
              permission={currentPermission}
              onBack={() => setActiveRoute('quotes')}
              onSaveQuote={handleSaveQuote}
              onApproveQuote={handleApproveQuote}
              onOpenDigitalApproval={(quoteId) => setDigitalApprovalQuoteId(quoteId)}
              onOpenProposalPreview={(quoteId) => setProposalPreviewQuoteId(quoteId)}
            />
          )}

          {activeRoute === 'clubs' && (
            <ClubsView
              clubs={clubs}
              contacts={contacts}
              quotes={quotes}
              activities={activities}
              permission={currentPermission}
              onAddClub={(clubData) => {
                const newClub: Club = {
                  ...clubData,
                  id: `clb-${Date.now()}`,
                  contractStatus: 'Yok',
                  notes: [],
                  files: [],
                  createdAt: new Date().toISOString(),
                };
                setClubs((prev) => [newClub, ...prev]);
                appendAudit('Kulüp Eklendi', 'Kulüp', newClub.name, `${newClub.city} · ${newClub.type}`);
                showToast(`${newClub.name} kulüp hesabı oluşturuldu.`, 'success');
              }}
              onAddClubNote={(clubId, content) =>
                setClubs((prev) =>
                  prev.map((c) =>
                    c.id === clubId
                      ? {
                          ...c,
                          notes: [
                            {
                              id: `cn-${Date.now()}`,
                              content,
                              createdAt: new Date().toISOString(),
                              createdById: currentUser.id,
                            },
                            ...c.notes,
                          ],
                        }
                      : c
                  )
                )
              }
              onAddClubFile={(clubId, fileName) =>
                setClubs((prev) =>
                  prev.map((c) =>
                    c.id === clubId
                      ? {
                          ...c,
                          files: [
                            {
                              id: `cf-${Date.now()}`,
                              name: fileName,
                              sizeLabel: '240 KB',
                              uploadedAt: new Date().toISOString(),
                              uploadedBy: currentUser.name,
                            },
                            ...c.files,
                          ],
                        }
                      : c
                  )
                )
              }
              onOpenQuoteBuilder={(quoteId) => {
                setEditingQuoteId(quoteId);
                setActiveRoute('quote-builder');
              }}
            />
          )}

          {activeRoute === 'contacts' && (
            <ContactsView
              contacts={contacts}
              clubs={clubs}
              onAddContact={(payload) => {
                const newCt: Contact = {
                  ...payload,
                  id: `cnt-${Date.now()}`,
                  deletionRequested: false,
                };
                setContacts((prev) => [newCt, ...prev]);
                appendAudit('Kişi Eklendi', 'Kişi', newCt.fullName, 'KVKK açık rıza ile kaydedildi.');
                showToast(`${newCt.fullName} iletişim kaydı eklendi.`, 'success');
              }}
              onToggleKvkkConsent={(contactId) => {
                setContacts((prev) =>
                  prev.map((ct) =>
                    ct.id === contactId
                      ? { ...ct, kvkkConsent: true, kvkkConsentDate: new Date().toISOString() }
                      : ct
                  )
                );
                showToast('KVKK açık rıza onayı kaydedildi.', 'success');
              }}
              onRequestDeletion={(contactId) => {
                const ct = contacts.find((c) => c.id === contactId);
                setContacts((prev) =>
                  prev.map((c) =>
                    c.id === contactId
                      ? { ...c, deletionRequested: true, deletionRequestedAt: new Date().toISOString() }
                      : c
                  )
                );
                appendAudit('KVKK Silme Talebi', 'KVKK', ct?.fullName ?? contactId, 'Madde 11 imha süreci başlatıldı.');
                showToast('KVKK silme talebi Ayarlar > KVKK paneline iletildi.', 'warning');
              }}
            />
          )}

          {activeRoute === 'tasks' && (
            <TasksView
              tasks={tasks}
              clubs={clubs}
              users={users}
              onToggleTask={(taskId) =>
                setTasks((prev) =>
                  prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
                )
              }
              onAddTask={(payload) => {
                setTasks((prev) => [
                  {
                    id: `tsk-${Date.now()}`,
                    title: payload.title,
                    clubId: payload.clubId,
                    assigneeId: payload.assigneeId,
                    dueDate: payload.dueDate,
                    completed: false,
                    autoGenerated: false,
                    createdAt: new Date().toISOString(),
                  },
                  ...prev,
                ]);
                showToast('Yeni görev eklendi.', 'success');
              }}
            />
          )}

          {activeRoute === 'automation' && (
            <AutomationView
              rules={automationRules}
              canEdit={currentPermission.canManageCatalogAndAutomation}
              onToggleRule={(ruleId) => {
                setAutomationRules((prev) =>
                  prev.map((r) => (r.id === ruleId ? { ...r, active: !r.active } : r))
                );
                showToast('Otomasyon kuralı güncellendi.', 'info');
              }}
            />
          )}

          {activeRoute === 'reports' && (
            <ReportsView
              quotes={quotes}
              clubs={clubs}
              users={users}
              permission={currentPermission}
            />
          )}

          {activeRoute === 'settings' && (
            <SettingsView
              rolePermissions={ROLE_PERMISSIONS}
              packages={packages}
              modules={PRODUCT_MODULES}
              tiers={ATHLETE_TIERS}
              contacts={contacts}
              auditLogs={auditLogs}
              users={users}
              currentUser={currentUser}
              currentPermission={currentPermission}
              onUpdatePackagePrice={(pkgId, nextPrice) => {
                const yearlyMonthly = Math.round(nextPrice / 12);
                const monthlyList = Math.round(yearlyMonthly / 0.8);
                setPackages((prev) =>
                  prev.map((p) =>
                    p.id === pkgId
                      ? {
                          ...p,
                          baseAnnualPrice: nextPrice,
                          yearlyMonthlyPrice: yearlyMonthly,
                          monthlyPrice: monthlyList,
                        }
                      : p
                  )
                );
                appendAudit('Katalog Fiyat Güncelleme', 'Ayar', pkgId, `Yeni yıllık peşin baz tutar: ${nextPrice} TRY`);
                showToast('Paket baz fiyatı güncellendi.', 'success');
              }}
              onExecuteKvkkDeletion={(contactId) => {
                const ct = contacts.find((c) => c.id === contactId);
                setContacts((prev) =>
                  prev.map((c) =>
                    c.id === contactId
                      ? {
                          ...c,
                          fullName: 'Anonimleştirilmiş Kayıt (KVKK)',
                          email: 'silindi@anonim.local',
                          phone: '—',
                          kvkkConsent: false,
                          deletionRequested: false,
                        }
                      : c
                  )
                );
                appendAudit('KVKK Veri İmhası', 'KVKK', ct?.fullName ?? contactId, 'Kişisel veriler anonimleştirildi.');
                showToast('KVKK silme talebi tamamlandı ve veriler anonimleştirildi.', 'success');
              }}
              onUpdateUserPasscode={(userId, nextPasscode) => {
                if (!nextPasscode) {
                  showToast('Geçiş kodu boş bırakılamaz.', 'error');
                  return;
                }
                const duplicate = users.find((u) => u.id !== userId && u.passcode === nextPasscode);
                if (duplicate) {
                  showToast(`Bu geçiş kodu (${nextPasscode}) başka bir kullanıcı tarafından kullanılıyor.`, 'error');
                  return;
                }
                const target = users.find((u) => u.id === userId);
                setUsers((prev) =>
                  prev.map((u) => (u.id === userId ? { ...u, passcode: nextPasscode } : u))
                );
                appendAudit(
                  'Geçiş Kodu Güncellendi',
                  'Ayar',
                  target?.name ?? userId,
                  'Kullanıcının giriş geçiş kodu güncellendi.'
                );
                showToast(`${target?.name ?? 'Kullanıcı'} geçiş kodu güncellendi.`, 'success');
              }}
              onAddUser={(payload) => {
                const duplicate = users.find((u) => u.passcode === payload.passcode);
                if (duplicate) {
                  showToast(`Bu geçiş kodu (${payload.passcode}) zaten kullanılıyor.`, 'error');
                  return;
                }
                const newUser: User = {
                  id: `usr-${Date.now()}`,
                  name: payload.name,
                  email: payload.email,
                  role: payload.role,
                  title: payload.title,
                  maxDiscountWithoutApproval:
                    payload.role === 'Yonetici' || payload.role === 'Finans'
                      ? 100
                      : payload.role === 'SatisTemsilcisi'
                        ? 20
                        : 10,
                  passcode: payload.passcode,
                };
                setUsers((prev) => [...prev, newUser]);
                appendAudit(
                  'Kullanıcı Eklendi',
                  'Ayar',
                  newUser.name,
                  `${newUser.title} rolü ve giriş geçiş kodu tanımlandı.`
                );
                showToast(`${newUser.name} ekibe eklendi.`, 'success');
              }}
            />
          )}
        </main>
      </div>

      {/* Dijital Müşteri Onay Sayfası Modalı */}
      {digitalApprovalQuote && (
        <DigitalApprovalModal
          quote={digitalApprovalQuote}
          club={clubs.find((c) => c.id === digitalApprovalQuote.clubId)}
          contact={contacts.find((c) => c.id === digitalApprovalQuote.contactId)}
          packages={packages}
          modules={PRODUCT_MODULES}
          tiers={ATHLETE_TIERS}
          onClose={() => setDigitalApprovalQuoteId(null)}
          onCustomerDecision={handleCustomerDecision}
        />
      )}

      {/* Kurumsal Teklif Formu Önizleme & PDF İndirme Modalı (1 / 2 / 3 Sayfa Seçenekli) */}
      {proposalPreviewQuoteId && (() => {
        const previewQuote = quotes.find((q) => q.id === proposalPreviewQuoteId);
        if (!previewQuote) return null;
        const latestVer = previewQuote.versions[previewQuote.versions.length - 1];
        const club = clubs.find((c) => c.id === previewQuote.clubId);
        const contact = contacts.find((c) => c.id === previewQuote.contactId);
        const owner = users.find((u) => u.id === previewQuote.createdById);
        const pkg = packages.find((p) => p.id === latestVer.packageId);
        const tier = ATHLETE_TIERS.find((t) => t.id === latestVer.tierId);

        return (
          <ProposalPreviewModal
            quote={previewQuote}
            club={club}
            contact={contact}
            owner={owner}
            pkg={pkg}
            tier={tier}
            modules={PRODUCT_MODULES}
            selectedFormat={proposalFormat}
            onFormatChange={setProposalFormat}
            onClose={() => setProposalPreviewQuoteId(null)}
            onOpenDigitalApproval={(qId) => setDigitalApprovalQuoteId(qId)}
            onDownloadAndSavePdf={async (q, format) => {
              const { attachment, fileName, pageCount } = await generateProposalPdf({
                quote: q,
                club,
                contact,
                owner,
                pkg,
                tier,
                modules: PRODUCT_MODULES,
                format,
                triggerDownload: true,
              });
              setClubs((prev) =>
                prev.map((c) =>
                  c.id === q.clubId ? { ...c, files: [attachment, ...c.files] } : c
                )
              );
              appendAudit(
                `${pageCount} Sayfalık Teklif PDF İndirildi`,
                'Teklif',
                q.quoteNumber,
                `${fileName} dosyası kaydedildi.`
              );
              showToast(`${fileName} indirildi ve kulüp dosyalarına kaydedildi.`, 'success');
            }}
          />
        );
      })()}

      {toast && (
        <ToastBanner message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
