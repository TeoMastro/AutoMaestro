import { Home, Users, Bot, MessageSquare, Activity, Building2 } from 'lucide-react';
import Link from 'next/link';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

import { NavUser } from '@/components/layout/nav-user';
import { getSession } from '@/lib/auth-session';
import { getTranslations } from 'next-intl/server';
import { PrivacyPolicyDialog } from '@/components/legal/privacy-policy-dialog';
import { TermsDialog } from '@/components/legal/terms-dialog';
import { getUserCompanies } from '@/server-actions/user-company';
import { APP_NAME, Role } from '@/lib/constants';

export async function AppSidebar() {
  const session = await getSession();
  const t = await getTranslations('app');

  const userData = {
    name: `${session?.user.first_name || ''} ${session?.user.last_name || ''}`.trim() || 'User',
    email: session?.user.email || 'user@example.com',
    avatar: '',
  };

  const userRole = session?.user.role;
  const isAdmin = userRole === Role.ADMIN;
  const isManager = userRole === Role.MANAGER;
  const isClient = userRole === Role.CLIENT;

  const items = [
    {
      title: t('home'),
      url: '/dashboard',
      icon: Home,
    },
    // Client: My Workflows
    ...(isClient
      ? [
          {
            title: t('myWorkflows'),
            url: '/workflow',
            icon: Bot,
          },
        ]
      : []),
    // Admin + Manager: Workflows (manage)
    ...(isAdmin || isManager
      ? [
          {
            title: t('workflows'),
            url: '/manage/workflows',
            icon: Bot,
          },
        ]
      : []),
    // Admin + Manager: Companies (manage)
    ...(isAdmin || isManager
      ? [
          {
            title: t('companies'),
            url: '/manage/companies',
            icon: Building2,
          },
        ]
      : []),
    // Chat History — visible to all roles
    {
      title: t('chatHistory'),
      url: '/chat-history',
      icon: MessageSquare,
    },
    // Trigger History — visible to all roles
    {
      title: t('triggerHistory'),
      url: '/trigger-history',
      icon: Activity,
    },
    // Admin-only: Users
    ...(isAdmin
      ? [
          {
            title: t('users'),
            url: '/admin/user',
            icon: Users,
          },
        ]
      : []),
  ];

  // Fetch client's company name for sidebar header
  const clientCompanyName = isClient
    ? (await getUserCompanies())[0]?.name
    : undefined;

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        {isClient ? (
          <div className="flex items-center gap-3">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
              <Building2 className="size-4 text-white" />
            </div>
            <span className="truncate text-sm font-medium">
              {clientCompanyName ?? 'No company assigned'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">NL</span>
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              {APP_NAME}
            </h2>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {/* Legal Documents as Dialogs */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <PrivacyPolicyDialog title={t('privacyPolicy')} />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <TermsDialog title={t('termsOfService')} />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  );
}
