import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Telemetry from './pages/Telemetry';
import Strategy from './pages/Strategy';
import Calendar from './pages/Calendar';
import Archive from './pages/Archive';

export default function App() {
  const [activeTab, setActiveTab] = useState('telemetry');

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-y-auto p-6">
        {activeTab === 'telemetry' && <Telemetry />}
        {activeTab === 'strategy' && <Strategy />}
        {activeTab === 'calendar' && <Calendar />}
        {activeTab === 'archive' && <Archive />}
      </main>
    </div>
  );
}
