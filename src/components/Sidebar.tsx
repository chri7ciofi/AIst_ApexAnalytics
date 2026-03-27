import { Activity, Calendar as CalendarIcon, BookOpen, GitMerge, Menu, X, Trophy, Newspaper, Home as HomeIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const tabs = [
    { id: 'home', label: 'Home Dashboard', icon: HomeIcon },
    { id: 'telemetry', label: 'Telemetry', icon: Activity },
    { id: 'strategy', label: 'Strategy AI', icon: GitMerge },
    { id: 'standings', label: 'Standings', icon: Trophy },
    { id: 'calendar', label: '2026 Calendar', icon: CalendarIcon },
    { id: 'news', label: 'Latest News', icon: Newspaper },
    { id: 'archive', label: 'Archive & Rules', icon: BookOpen },
  ];

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setMobileOpen(false);
  };

  const SidebarContent = () => (
    <>
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-tighter">
          <span className="gradient-text">Apex</span>
          <span className="text-zinc-100">Analytics</span>
        </h1>
        <p className="text-xs text-zinc-400 mt-1 uppercase tracking-widest">F1 Intelligence</p>
      </div>
      <nav className="flex-1 px-4 space-y-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={clsx(
                "w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium relative overflow-hidden group",
                isActive
                  ? "bg-red-500/10 text-red-500"
                  : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-100"
              )}
            >
              {/* Active indicator bar */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-red-500 rounded-r-full"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <Icon size={18} className={clsx(
                "transition-transform duration-200",
                isActive ? "scale-110" : "group-hover:scale-105"
              )} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-6 border-t border-zinc-800">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/20">
            <span className="text-xs font-bold text-white">CC</span>
          </div>
          <div className="text-sm">
            <p className="font-medium">Christian Ciofi</p>
            <p className="text-xs text-zinc-500">Analyst</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all shadow-lg"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-64 bg-zinc-900/80 backdrop-blur-sm border-r border-zinc-800/80 flex-col shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setMobileOpen(false)}
            />
            {/* Slide-in panel */}
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col z-50 shadow-2xl"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100 transition-colors p-1"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
