import {
  Users,
  Film,
  Settings,
  BarChart3,
  ShieldCheck,
  ClipboardList,
  Bell,
  ChevronLeft,
  LogOut,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onBackToSite?: () => void;
}

const menuItems = [
  {
    id: 'user-management',
    title: 'User Management',
    icon: Users,
    badge: undefined,
  },
  {
    id: 'content-management',
    title: 'Content Management',
    icon: Film,
    badge: undefined,
  },
  {
    id: 'system-settings',
    title: 'System Settings',
    icon: Settings,
    badge: undefined,
  },
  {
    id: 'analytics',
    title: 'Analytics',
    icon: BarChart3,
    badge: undefined,
  },
  {
    id: 'security',
    title: 'Security',
    icon: ShieldCheck,
    badge: undefined,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    icon: Bell,
    badge: undefined,
  },
  {
    id: 'audit-logs',
    title: 'Audit Logs',
    icon: ClipboardList,
    badge: undefined,
  },
];

export default function AdminSidebar({ activeTab, onTabChange, onBackToSite }: AdminSidebarProps) {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const handleBackToSite = () => {
    if (onBackToSite) {
      onBackToSite();
    } else {
      navigate('/');
    }
  };

  return (
    <Sidebar collapsible="icon">
      {/* Header with Logo and Back Button */}
      <SidebarHeader>
        <div className="px-2 py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-md bg-gradient-to-br from-red-600 to-red-500 flex items-center justify-center flex-shrink-0">
                <Film className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <h2 className="text-lg font-bold truncate">Admin</h2>
                <p className="text-xs text-muted-foreground truncate">Dashboard</p>
              </div>
            </div>
          </div>

          {/* Back to Site Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToSite}
            className="w-full justify-start mt-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2"
          >
            <ChevronLeft className="h-4 w-4 group-data-[collapsible=icon]:mr-0 mr-2" />
            <span className="group-data-[collapsible=icon]:hidden">Back to Site</span>
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Navigation Menu */}
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onTabChange(item.id)}
                      isActive={isActive}
                      tooltip={item.title}
                      className="group-data-[collapsible=icon]:justify-center"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1">{item.title}</span>
                      {item.badge && (
                        <Badge
                          variant="destructive"
                          className="ml-auto group-data-[collapsible=icon]:hidden text-xs px-1.5"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* User Footer */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 px-3 py-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {user?.username?.substring(0, 2).toUpperCase() ||
                    user?.email?.substring(0, 2).toUpperCase() ||
                    'AD'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-medium truncate">
                  {user?.username || user?.email || 'Admin'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.role || 'Administrator'}
                </p>
              </div>
            </div>
          </SidebarMenuItem>

          {/* Logout Button */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                if (confirm('Are you sure you want to logout?')) {
                  fetch('/api/logout', { method: 'POST' })
                    .then(() => window.location.href = '/auth');
                }
              }}
              tooltip="Logout"
              className="group-data-[collapsible=icon]:justify-center text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              <span className="flex-1">Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
