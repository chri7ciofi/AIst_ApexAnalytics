import { Activity, Calendar as CalendarIcon, BookOpen, GitMerge } from 'lucide-react';
import { clsx } from 'clsx';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const tabs = [
    { id: 'telemetry', label: 'Telemetry', icon: Activity },
    { id: 'strategy', label: 'Strategy AI', icon: GitMerge },
    { id: 'calendar', label: '2026 Calendar', icon: CalendarIcon },
    { id: 'archive', label: 'Archive & Rules', icon: BookOpen },
  ];

  return (
    <div className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-tighter text-red-500">Apex<span className="text-zinc-100">Analytics</span></h1>
        <p className="text-xs text-zinc-400 mt-1 uppercase tracking-widest">F1 Intelligence</p>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium",
                activeTab === tab.id
                  ? "bg-red-500/10 text-red-500"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              )}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-6 border-t border-zinc-800">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
            <span className="text-xs font-bold">CC</span>
          </div>
          <div className="text-sm">
            <p className="font-medium">Christian Ciofi</p>
            <p className="text-xs text-zinc-500">Analyst</p>
          </div>
        </div>
      </div>
    </div>
  );
}
