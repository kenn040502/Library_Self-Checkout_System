'use client';

import SideNav from '@/app/ui/dashboard/sidenav';
import MobileNav from '@/app/ui/dashboard/mobileNav';
import DesktopTopBar from '@/app/ui/dashboard/desktopTopBar';
import FaqFloatingHelp from '@/app/ui/dashboard/faqFloatingHelp';
import NotificationToast from '@/app/ui/dashboard/notificationToast';
import DueDateChecker from '@/app/ui/dashboard/dueDateChecker';
import FaqScrollTopButton from '@/app/ui/dashboard/faqScrollTopButton';
import type { DashboardUserProfile } from '@/app/lib/auth/types';
import { useState } from 'react';
import clsx from 'clsx';

type DashboardShellProps = {
  user: DashboardUserProfile;
  isBypassed: boolean;
  children: React.ReactNode;
};

export default function DashboardShell({ user, isBypassed, children }: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="bg-canvas text-ink dark:bg-dark-canvas dark:text-on-dark">
      {/* Desktop sidebar spacer — matches the fixed sidenav width, animates on collapse */}
      <aside className={clsx(
        'hidden md:block md:flex-none transition-[width,padding] duration-300',
        sidebarCollapsed ? 'md:w-16' : 'md:w-64',
      )}>
        <SideNav
          user={user}
          isBypassed={isBypassed}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((c) => !c)}
        />
      </aside>

      {/* Main area — offset by sidebar width on desktop */}
      <div className={clsx(
        'flex min-h-screen flex-col transition-[width,padding] duration-300',
        sidebarCollapsed ? 'md:pl-16' : 'md:pl-64',
      )}>
        <MobileNav user={user} isBypassed={isBypassed} />
        <DesktopTopBar user={user} isBypassed={isBypassed} />

        <main className="flex-1 px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+88px)] sm:px-6 md:px-10 md:py-10 md:pb-12">
          <div className="mx-auto w-full max-w-7xl" suppressHydrationWarning>
            {children}
          </div>
        </main>
      </div>

      <FaqScrollTopButton className="md:hidden" />
      {user.role !== 'admin' && user.role !== 'staff' && <FaqFloatingHelp />}
      {(user.role === 'staff' || user.role === 'admin') && <NotificationToast />}
      {user.role === 'user' && <DueDateChecker />}
    </div>
  );
}
