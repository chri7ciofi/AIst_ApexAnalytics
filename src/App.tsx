import { useState, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import F1LoadingLights from './components/F1LoadingLights';

const Home = lazy(() => import('./pages/Home'));
const Telemetry = lazy(() => import('./pages/Telemetry'));
const Strategy = lazy(() => import('./pages/Strategy'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Archive = lazy(() => import('./pages/Archive'));
const Standings = lazy(() => import('./pages/Standings'));
const News = lazy(() => import('./pages/News'));

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
  const [activeTab, setActiveTab] = useState('home');

  const renderPage = () => {
    switch (activeTab) {
      case 'home': return <Home setActiveTab={setActiveTab} />;
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
    <div className="flex h-screen bg-transparent text-zinc-100 overflow-hidden">
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
            <Suspense fallback={<div className="h-full flex items-center justify-center"><F1LoadingLights /></div>}>
              {renderPage()}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
