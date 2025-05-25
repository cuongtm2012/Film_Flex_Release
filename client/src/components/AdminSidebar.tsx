import React, { useState } from 'react';
import { 
  Users, 
  Film, 
  Settings, 
  BarChart3, 
  ShieldCheck, 
  ClipboardList,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function AdminSidebar({ activeTab, onTabChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { id: 'user-management', icon: Users, label: 'User Management' },
    { id: 'content-management', icon: Film, label: 'Content Management' },
    { id: 'system-settings', icon: Settings, label: 'System Settings' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
    { id: 'security', icon: ShieldCheck, label: 'Security' },
    { id: 'audit-logs', icon: ClipboardList, label: 'Audit Logs' }
  ];

  return (
    <div 
      className={`
        relative
        transition-all 
        duration-300 
        ease-in-out 
        bg-zinc-900 
        text-white 
        h-screen 
        ${isCollapsed ? 'w-16' : 'w-64'}
        p-4
      `}
    >
      {/* Toggle button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="
          absolute 
          -right-3 
          top-8 
          bg-zinc-900 
          text-white 
          rounded-full 
          p-1 
          hover:bg-zinc-800 
          transition-colors
        "
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>

      {/* Menu Items */}
      <nav className="space-y-2 mt-8">
        {menuItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`
              w-full 
              flex 
              items-center 
              p-2 
              rounded-md 
              transition-colors 
              ${activeTab === id ? 'bg-white/10' : 'hover:bg-white/5'}
              ${isCollapsed ? 'justify-center' : 'justify-start'}
            `}
          >
            <Icon className={`h-5 w-5 ${!isCollapsed && 'mr-3'}`} />
            {!isCollapsed && (
              <span className="transition-opacity duration-200">
                {label}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
