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
    <aside 
      className={`
        fixed 
        left-0 
        top-0 
        h-screen 
        transition-all 
        duration-300 
        ease-in-out 
        bg-zinc-900 
        text-white 
        ${isCollapsed ? 'w-16' : 'w-64'}
        p-4
        flex
        flex-col
        shadow-lg
        z-50
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
          shadow-md
          z-10
        "
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>

      {/* Logo or brand area */}
      <div className={`
        flex 
        items-center 
        h-16 
        ${isCollapsed ? 'justify-center' : 'px-2'}
      `}>
        <span className={`
          font-bold 
          text-xl 
          ${isCollapsed ? 'hidden' : 'block'}
        `}>
          PhimGG
        </span>
        {isCollapsed && (
          <span className="font-bold text-xl">FF</span>
        )}
      </div>

      {/* Menu Items */}
      <nav className="flex-1 space-y-2 mt-8">
        {menuItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`
              w-full 
              flex 
              items-center 
              p-3 
              rounded-lg 
              transition-all
              duration-200
              ${activeTab === id 
                ? 'bg-white/10 text-white' 
                : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }
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
    </aside>
  );
}
