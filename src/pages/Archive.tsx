import { useState, useEffect } from 'react';
import { Search, FileText, History, ShieldAlert, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import axios from 'axios';
import type { Regulation, Race } from '../types';

export default function Archive() {
  const [loading, setLoading] = useState(true);
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGp, setSelectedGp] = useState('');
  const [circuitStats, setCircuitStats] = useState<{
    totalRaces: number;
    avgLapTime: string;
    fastestDriver: string;
    sessionInfo: string;
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

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

  // Fetch real historical data from OpenF1 when GP changes
  useEffect(() => {
    if (!selectedGp) return;

    const fetchCircuitStats = async () => {
      setLoadingStats(true);
      setCircuitStats(null);
      try {
        // Try to find a matching meeting from 2024 for historical data
        const meetingsRes = await axios.get('/api/openf1/meetings?year=2024');
        const meetings = meetingsRes.data as Array<{ meeting_key: number; meeting_name: string }>;

        // Find a meeting that matches the selected GP name (fuzzy match)
        const gpKeyword = selectedGp.replace(/Grand Prix/i, '').trim().toLowerCase().split(' ')[0];
        const matchingMeeting = meetings.find(m =>
          m.meeting_name.toLowerCase().includes(gpKeyword)
        );

        if (!matchingMeeting) {
          setCircuitStats({
            totalRaces: 0,
            avgLapTime: 'N/A',
            fastestDriver: 'No 2024 data',
            sessionInfo: `No matching 2024 session found for "${selectedGp}".`,
          });
          setLoadingStats(false);
          return;
        }

        // Get the race session
        const sessionsRes = await axios.get(`/api/openf1/sessions?meeting_key=${matchingMeeting.meeting_key}`);
        const sessions = sessionsRes.data as Array<{ session_key: number; session_name: string }>;
        const raceSession = sessions.find(s => s.session_name === 'Race');

        if (!raceSession) {
          setCircuitStats({
            totalRaces: sessions.length,
            avgLapTime: 'N/A',
            fastestDriver: 'No race session data',
            sessionInfo: `${matchingMeeting.meeting_name}: ${sessions.length} sessions found.`,
          });
          setLoadingStats(false);
          return;
        }

        // Get laps for a top driver (driver 1 = Verstappen)
        const lapsRes = await axios.get(`/api/openf1/laps?session_key=${raceSession.session_key}&driver_number=1`);
        const laps = (lapsRes.data as Array<{ lap_duration: number | null; lap_number: number }>)
          .filter(l => l.lap_duration != null && l.lap_duration > 0);

        let avgLapTime = 'N/A';
        let fastestLap = 'N/A';

        if (laps.length > 0) {
          // Remove outlier laps (>110% of median)
          const durations = laps.map(l => l.lap_duration!).sort((a, b) => a - b);
          const median = durations[Math.floor(durations.length / 2)];
          const cleanLaps = durations.filter(d => d < median * 1.10);

          if (cleanLaps.length > 0) {
            const avg = cleanLaps.reduce((a, b) => a + b, 0) / cleanLaps.length;
            const mins = Math.floor(avg / 60);
            const secs = (avg % 60).toFixed(3);
            avgLapTime = `${mins}:${secs.padStart(6, '0')}`;

            const fastest = Math.min(...cleanLaps);
            const fMins = Math.floor(fastest / 60);
            const fSecs = (fastest % 60).toFixed(3);
            fastestLap = `${fMins}:${fSecs.padStart(6, '0')}`;
          }
        }

        setCircuitStats({
          totalRaces: sessions.length,
          avgLapTime,
          fastestDriver: fastestLap,
          sessionInfo: `Data from ${matchingMeeting.meeting_name} 2024`,
        });
      } catch (error) {
        console.error("Failed to fetch circuit stats", error);
        setCircuitStats({
          totalRaces: 0,
          avgLapTime: 'Error',
          fastestDriver: 'Error',
          sessionInfo: 'Failed to fetch historical data.',
        });
      } finally {
        setLoadingStats(false);
      }
    };

    fetchCircuitStats();
  }, [selectedGp]);

  const filteredRegulations = regulations.filter(reg =>
    reg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reg.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Archive & Regulatory Insights</h2>
          <p className="text-zinc-400 mt-1">Contextual knowledge base and FIA documents</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Document Parser */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-3">
            <h3 className="text-lg font-bold flex items-center">
              <FileText className="mr-2 text-blue-500" size={20} />
              FIA Regulations Database
            </h3>
            <div className="relative w-full sm:w-64">
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

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {loading ? (
              <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-zinc-500" size={32} /></div>
            ) : filteredRegulations.length > 0 ? (
              filteredRegulations.map(reg => (
                <div key={reg.id} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 hover:border-blue-500/50 transition-colors group cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-zinc-200 group-hover:text-blue-400 transition-colors">{reg.title}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full uppercase tracking-wider font-bold shrink-0 ml-2 ${
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

        {/* Contextual UI — now with REAL data */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-3">
            <h3 className="text-lg font-bold flex items-center">
              <History className="mr-2 text-green-500" size={20} />
              Historical Circuit Data
            </h3>
            <select
              value={selectedGp}
              onChange={e => setSelectedGp(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 max-w-[220px] truncate"
            >
              {races.map(race => (
                <option key={race.round} value={race.name}>{race.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {/* Real Historical Data from OpenF1 */}
            <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800">
              <h4 className="font-bold text-zinc-200 mb-3 flex items-center">
                <ShieldAlert className="mr-2 text-red-500" size={18} />
                2024 Race Data (OpenF1)
              </h4>

              {loadingStats ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-zinc-600" size={24} />
                  <span className="text-zinc-500 ml-3 text-sm">Loading historical data...</span>
                </div>
              ) : circuitStats ? (
                <>
                  <p className="text-xs text-zinc-500 mb-4 flex items-center gap-1">
                    <ExternalLink size={12} />
                    {circuitStats.sessionInfo}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
                      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Sessions Available</p>
                      <p className="text-2xl font-mono font-bold text-zinc-100">{circuitStats.totalRaces}</p>
                    </div>
                    <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
                      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Avg Race Lap</p>
                      <p className="text-2xl font-mono font-bold text-zinc-100">{circuitStats.avgLapTime}</p>
                    </div>
                    <div className="col-span-2 bg-zinc-900 p-4 rounded-lg border border-zinc-800">
                      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Fastest Race Lap (VER)</p>
                      <p className="text-2xl font-mono font-bold text-green-400">{circuitStats.fastestDriver}</p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-zinc-500 text-sm text-center py-4">Select a GP to view historical data.</p>
              )}
            </div>

            {/* Race Director Notes */}
            <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800">
              <h4 className="font-bold text-zinc-200 mb-3 flex items-center">
                <AlertCircle className="mr-2 text-yellow-500" size={18} />
                Standard Race Director Notes
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
                  <span><strong>Track Limits:</strong> Lap times will be deleted if all four wheels cross the white line at designated corners.</span>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5 mr-3 shrink-0"></span>
                  <span><strong>Penalties:</strong> Three track limit strikes result in a black and white flag. Fourth strike is a 5-second penalty.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
