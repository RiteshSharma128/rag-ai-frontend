'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import NotificationBell from '@/components/NotificationBell';
import {
  Brain, LayoutDashboard, MessageSquare, FileText,
  Video, BarChart2, Settings, LogOut, Menu, X,
  Users, Wifi,  ChevronRight,Mic, Activity, Shield  
} from 'lucide-react';
import clsx from 'clsx';

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/chat', icon: MessageSquare, label: 'AI Chat' },
  { href: '/documents', icon: FileText, label: 'Documents' },
  { href: '/meetings', icon: Video, label: 'Meetings' },
  { href: '/voice', icon: Mic, label: 'Voice AI' },
  { href: '/analytics', icon: BarChart2, label: 'Analytics' },
  { href: '/activity', icon: Activity, label: 'Activity' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

const ADMIN_ITEMS = [
  { href: '/admin', icon: Shield, label: 'Admin Panel' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  // const { isConnected, onlineUsers } = useSocket();
  const { isConnected, onlineUsers = [] } = useSocket();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div className="w-8 h-8 bg-brand-600/25 border border-brand-500/40 rounded-lg flex items-center justify-center flex-shrink-0">
          <Brain className="w-4 h-4 text-brand-400" />
        </div>
        <span className="font-bold text-white text-sm tracking-wide">RAG AI</span>
        <div className={clsx(
          'ml-auto flex items-center gap-1 text-xs px-2 py-0.5 rounded-full',
          isConnected ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'
        )}>
          {isConnected ? <Wifi className="w-3 h-3" /> : <Wifi className="w-3 h-3 opacity-40" />}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setSidebarOpen(false)}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
                active
                  ? 'bg-brand-600/15 text-brand-300 border-r-2 border-brand-500'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              )}
            >
              <Icon className={clsx('w-4 h-4 flex-shrink-0', active ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-300')} />
              {label}
              {active && <ChevronRight className="w-3 h-3 ml-auto text-brand-500" />}
            </Link>
          );
        })}

        {/* Admin only */}
        {user?.role === 'admin' && (
          <div className="pt-2 mt-2 border-t border-slate-800">
            <p className="text-[10px] text-slate-600 px-3 mb-1 uppercase tracking-wider">Admin</p>
            {ADMIN_ITEMS.map(({ href, icon: Icon, label }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setSidebarOpen(false)}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
                    active
                      ? 'bg-orange-600/15 text-orange-300 border-r-2 border-orange-500'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  )}
                >
                  <Icon className={clsx('w-4 h-4 flex-shrink-0', active ? 'text-orange-400' : 'text-slate-500')} />
                  {label}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* Online users count */}
      {onlineUsers?.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span>{onlineUsers.length} online</span>
            <div className="flex -space-x-1.5 ml-auto">
              {onlineUsers.slice(0, 4).map(u => (
                <div key={u.id} className="w-5 h-5 rounded-full bg-brand-600/30 border border-slate-700 flex items-center justify-center text-[8px] text-brand-300 font-bold">
                  {u.name[0].toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* User profile */}
      <div className="px-3 py-3 border-t border-slate-800">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-800/60 transition-all group cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-brand-600/25 border border-brand-500/30 flex items-center justify-center text-sm font-bold text-brand-300 flex-shrink-0">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
            <p className="text-[10px] text-slate-500 truncate">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-surface-950 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-surface-900 border-r border-slate-800 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-56 h-full bg-surface-900 border-r border-slate-800">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 flex items-center px-4 md:px-6 border-b border-slate-800 bg-surface-900/50 backdrop-blur-sm flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-slate-400 hover:text-white mr-3"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="w-6 h-6 rounded-lg bg-brand-600/25 flex items-center justify-center text-brand-300 font-bold text-[10px]">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <span className="hidden sm:block">{user?.name}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
