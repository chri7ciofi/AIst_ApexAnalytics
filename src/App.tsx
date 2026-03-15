import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Telemetry from './pages/Telemetry';
import Strategy from './pages/Strategy';
import Calendar from './pages/Calendar';
import Archive from './pages/Archive';
import Standings from './pages/Standings';
import News from './pages/News';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const pageTransition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.25,
};

export default function App() {
  const [activeTab, setActiveTab] = useState('telemetry');

  const renderPage = () => {
    switch (activeTab) {
      case 'telemetry': return <Telemetry />;
      case 'strategy': return <Strategy />;
      case 'standings': return <Standings />;
      case 'calendar': return <Calendar />;
      case 'news': return <News />;
      case 'archive': return <Archive />;
      default: return <Telemetry />;
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-y-auto p-6 lg:p-6 pt-16 lg:pt-6 custom-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className="h-full"
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
