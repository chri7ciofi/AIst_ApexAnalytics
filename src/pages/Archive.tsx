import { useState, useEffect } from 'react';
import { Search, FileText, AlertCircle, History, ShieldAlert, Loader2 } from 'lucide-react';
import axios from 'axios';

interface Regulation {
  id: number;
  title: string;
  category: string;
  summary: string;
}

interface Race {
  round: number;
  name: string;
  circuit: string;
}

export default function Archive() {
  const [loading, setLoading] = useState(true);
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGp, setSelectedGp] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [regRes, calRes] = await Promise.all([
          axios.get('/api/regulations'),
          axios.get('/api/calendar/2026')
        ]);
        setRegulations(regRes.data);
        setRaces(calRes.data);
        if (calRes.data.length > 0) {
          setSelectedGp(calRes.data[0].name);
        }
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredRegulations = regulations.filter(reg => 
    reg.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    reg.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getMockContextualData = (gpName: string) => {
    if (!gpName) return { scProb: '0%', poleWin: '0%', zones: ['Turn 1', 'Turn 2', 'Turn 3'] };
    let hash = 0;
    for (let i = 0; i < gpName.length; i++) {
      hash = gpName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const scProb = Math.abs(hash % 80) + 10;
    const poleWin = Math.abs((hash >> 2) % 60) + 20;
    
    const turn1 = Math.abs(hash % 15) + 1;
    const turn2 = Math.abs((hash >> 1) % 15) + 1;
    const turn3 = Math.abs((hash >> 2) % 15) + 1;
    
    return {
      scProb: `${scProb}%`,
      poleWin: `${poleWin}%`,
      zones: [
        `Turn ${turn1} (Start)`,
        `Turn ${turn2} (Braking)`,
        `Turn ${turn3} (Lockup)`
      ]
    };
  };

  const contextData = getMockContextualData(selectedGp);

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Archive & Regulatory Insights</h2>
          <p className="text-zinc-400 mt-1">Contextual knowledge base and FIA documents</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Document Parser */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold flex items-center">
              <FileText className="mr-2 text-blue-500" size={20} />
              FIA Regulations Database
            </h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input 
                type="text" 
                placeholder="Search rules..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {loading ? (
              <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-zinc-500" size={32} /></div>
            ) : filteredRegulations.length > 0 ? (
              filteredRegulations.map(reg => (
                <div key={reg.id} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 hover:border-blue-500/50 transition-colors group cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-zinc-200 group-hover:text-blue-400 transition-colors">{reg.title}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full uppercase tracking-wider font-bold ${
                      reg.category === 'Technical' ? 'bg-orange-500/10 text-orange-500' : 'bg-purple-500/10 text-purple-500'
                    }`}>
                      {reg.category}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">{reg.summary}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-zinc-500">No regulations found matching "{searchQuery}"</div>
            )}
          </div>
        </div>

        {/* Contextual UI */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold flex items-center">
              <History className="mr-2 text-green-500" size={20} />
              Contextual Insights
            </h3>
            <select 
              value={selectedGp} 
              onChange={e => setSelectedGp(e.target.value)} 
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 max-w-[200px] truncate"
            >
              {races.map(race => (
                <option key={race.round} value={race.name}>{race.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-6 flex-1 overflow-y-auto pr-2">
            {/* Race Director Notes */}
            <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800">
              <h4 className="font-bold text-zinc-200 mb-3 flex items-center">
                <AlertCircle className="mr-2 text-yellow-500" size={18} />
                Race Director Notes (Event Specific)
              </h4>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5 mr-3 shrink-0"></span>
                  <span><strong>Pit Lane Speed Limit:</strong> 80 km/h during all sessions.</span>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5 mr-3 shrink-0"></span>
                  <span><strong>Practice Starts:</strong> Only permitted on the right-hand side after the pit exit lights.</span>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5 mr-3 shrink-0"></span>
                  <span><strong>Track Limits:</strong> {contextData.zones[1]} exit is strictly monitored. Lap times will be deleted if all four wheels cross the white line.</span>
                </li>
              </ul>
            </div>

            {/* Historical Data */}
            <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800">
              <h4 className="font-bold text-zinc-200 mb-3 flex items-center">
                <ShieldAlert className="mr-2 text-red-500" size={18} />
                Historical Circuit Data
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Safety Car Prob.</p>
                  <p className="text-2xl font-mono font-bold text-zinc-100">{contextData.scProb}</p>
                </div>
                <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Pole Win Rate</p>
                  <p className="text-2xl font-mono font-bold text-zinc-100">{contextData.poleWin}</p>
                </div>
                <div className="col-span-2 bg-zinc-900 p-4 rounded-lg border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Key Incident Zones</p>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-bold">{contextData.zones[0]}</span>
                    <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-xs font-bold">{contextData.zones[1]}</span>
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-bold">{contextData.zones[2]}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


