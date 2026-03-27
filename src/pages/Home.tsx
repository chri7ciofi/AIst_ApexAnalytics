import { Activity, GitMerge, Trophy, Calendar, ChevronRight, Zap } from 'lucide-react';

interface HomeProps {
  setActiveTab: (tab: string) => void;
}

export default function Home({ setActiveTab }: HomeProps) {
  const features = [
    {
      id: 'telemetry',
      title: 'Telemetry Explorer',
      desc: 'Compare distance-based speed traces, throttle, and RPM across any two drivers.',
      icon: Activity,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20'
    },
    {
      id: 'strategy',
      title: 'AI Strategy Predictor',
      desc: 'Let Gemini 2.5 Flash analyze track degradation to predict pit windows.',
      icon: GitMerge,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20'
    },
    {
      id: 'standings',
      title: 'World Championships',
      desc: 'Track the battle for the drivers and constructors titles across the season.',
      icon: Trophy,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20'
    },
    {
      id: 'calendar',
      title: 'Global Calendar',
      desc: 'Explore circuit layouts, historical context, and localized weekend schedules.',
      icon: Calendar,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20'
    }
  ];

  return (
    <div className="h-full flex flex-col overflow-y-auto px-2 lg:px-8 py-4 custom-scrollbar space-y-12">
      
      {/* Hero Section */}
      <div className="relative pt-8 pb-4">
        <div className="absolute inset-0 bg-red-500/5 blur-[100px] rounded-full pointer-events-none" />
        <h1 className="text-4xl md:text-5xl lg:text-7xl font-black tracking-tighter mb-4 relative z-10">
          Welcome to <br className="hidden md:block"/>
          <span className="gradient-text">ApexAnalytics</span>
        </h1>
        <p className="text-zinc-400 text-lg md:text-xl max-w-2xl leading-relaxed relative z-10 font-medium">
          The ultimate F1 Intelligence Hub. Access highly granular distance-based telemetry, degradation models, and interact with the generative AI track engineer.
        </p>
      </div>

      {/* Quick Launch Cards */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Zap className="text-red-500" size={24} />
          <h2 className="text-2xl font-bold tracking-tight text-white">Quick Launch</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
          {features.map((f, idx) => {
            const Icon = f.icon;
            return (
              <button
                key={idx}
                onClick={() => setActiveTab(f.id)}
                className="group relative flex flex-col text-left p-6 lg:p-8 rounded-3xl bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 hover:bg-zinc-800/60 hover:border-zinc-700/80 transition-all duration-300 card-hover overflow-hidden"
              >
                {/* Background ambient glow effect on hover */}
                <div className={`absolute -right-10 -top-10 w-32 h-32 blur-[60px] rounded-full transition-opacity duration-300 opacity-0 group-hover:opacity-40 ${f.bg} ${f.border}`} />
                
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border transition-transform duration-300 group-hover:scale-110 ${f.bg} ${f.color} ${f.border}`}>
                  <Icon size={28} />
                </div>
                
                <h3 className="text-xl font-bold text-zinc-100 mb-3 group-hover:text-white transition-colors">{f.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed font-medium group-hover:text-zinc-300 transition-colors flex-1">
                  {f.desc}
                </p>
                
                <div className="mt-8 flex items-center text-sm font-bold uppercase tracking-wider text-zinc-500 group-hover:text-white transition-colors">
                  OpEN MODULE
                  <ChevronRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Optional Info Box */}
      <div className="bg-gradient-to-r from-red-600/10 to-transparent p-6 rounded-2xl border border-red-500/20 flex flex-col sm:flex-row items-center justify-between gap-6 card-hover">
         <div>
            <h3 className="text-lg font-bold text-zinc-200 mb-1">Did you know?</h3>
            <p className="text-sm text-zinc-400">The AI Strategy model automatically isolates pitting outliers to predict long-run degradation curves.</p>
         </div>
         <button onClick={() => setActiveTab('strategy')} className="shrink-0 px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20">
            Try Strategy AI
         </button>
      </div>
      
    </div>
  );
}
