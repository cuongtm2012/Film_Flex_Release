import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Users,
  Film,
  Settings,
  BarChart3,
  ShieldCheck,
  ClipboardList,
  Bell,
  ChevronLeft,
  ChevronRight,
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ElementType;
  onClick?: () => void;
  badge?: string | number; // Badge content (e.g., count, "new", etc.)
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

interface CollapsibleSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  items?: SidebarItem[];
  className?: string;
}

export default function CollapsibleSidebar({
  activeTab,
  onTabChange,
  items,
  className
}: CollapsibleSidebarProps) {
  // State for sidebar collapse - persist in localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('admin-sidebar-collapsed');
    return saved === 'true';
  });

  // State for mobile menu
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Default sidebar items if not provided
  const defaultItems: SidebarItem[] = [
    {
      id: 'user-management',
      label: 'User Management',
      icon: Users
    },
    {
      id: 'content-management',
      label: 'Content Management',
      icon: Film
    },
    {
      id: 'system-settings',
      label: 'System Settings',
      icon: Settings
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3
    },
    {
      id: 'security',
      label: 'Security',
      icon: ShieldCheck
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell
    },
    {
      id: 'audit-logs',
      label: 'Audit Logs',
      icon: ClipboardList
    }
  ];

  const sidebarItems = items || defaultItems;

  // Save collapse state to localStorage
  useEffect(() => {
    localStorage.setItem('admin-sidebar-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  // Close mobile menu when screen size changes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleMobileMenu = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const handleItemClick = (item: SidebarItem) => {
    if (item.onClick) {
      item.onClick();
    } else {
      onTabChange(item.id);
    }
    
    // Close mobile menu after selection
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <div className="md:hidden fixed top-20 left-4 z-50">
        <Button
          variant="default"
          size="icon"
          onClick={toggleMobileMenu}
          className="shadow-lg"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          // Base styles
          'transition-all duration-300 ease-in-out',
          // Desktop styles
          'hidden md:block',
          isCollapsed ? 'md:w-20' : 'md:w-64',
          // Mobile styles - slide in from left
          isMobileOpen && 'fixed md:relative left-0 top-0 h-full z-50 block w-64 animate-in slide-in-from-left duration-300',
          !isMobileOpen && 'md:block',
          className
        )}
      >
        <Card className={cn(
          'h-full',
          isMobileOpen && 'rounded-none md:rounded-lg'
        )}>
          <CardContent className="p-4">
            {/* Toggle Button - Desktop only */}
            <div className="hidden md:flex justify-end mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleCollapse}
                className="h-8 w-8"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Navigation Items */}
            <nav className="space-y-2">
              <TooltipProvider delayDuration={300}>
                {sidebarItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  const buttonContent = (
                    <Button
                      key={item.id}
                      variant={isActive ? 'default' : 'ghost'}
                      className={cn(
                        'w-full transition-all duration-200',
                        isCollapsed ? 'justify-center px-2' : 'justify-start',
                        isActive && 'shadow-md'
                      )}
                      onClick={() => handleItemClick(item)}
                    >
                      <Icon className={cn(
                        'h-4 w-4',
                        !isCollapsed && 'mr-2',
                        isActive && 'animate-pulse'
                      )} />
                      {!isCollapsed && (
                        <>
                          <span className="truncate flex-1 text-left">{item.label}</span>
                          {item.badge !== undefined && (
                            <Badge 
                              variant={item.badgeVariant || 'secondary'} 
                              className="ml-auto text-xs"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                    </Button>
                  );

                  // Wrap with Tooltip when collapsed
                  if (isCollapsed) {
                    return (
                      <Tooltip key={item.id}>
                        <TooltipTrigger asChild>
                          {buttonContent}
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-medium">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return buttonContent;
                })}
              </TooltipProvider>
            </nav>

            {/* Collapse Hint - Desktop collapsed state */}
            {isCollapsed && (
              <div className="hidden md:block mt-8 text-center">
                <div className="text-xs text-muted-foreground rotate-90 whitespace-nowrap">
                  Menu
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
