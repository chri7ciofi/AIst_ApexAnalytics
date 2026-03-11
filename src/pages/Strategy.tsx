import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertTriangle, Clock, TrendingDown, ArrowRightLeft, Loader2, Activity, BrainCircuit, Sparkles } from 'lucide-react';
import axios from 'axios';
import { useRaceSelector } from '../hooks/useRaceSelector';
import RaceSelector from '../components/RaceSelector';
import type { StrategyLapPoint, LapData, Stint } from '../types';

export default function Strategy() {
  const [loading, setLoading] = useState(false);
  const [lapsData, setLapsData] = useState<StrategyLapPoint[]>([]);
  const [pitWindow, setPitWindow] = useState({ open: 15, close: 22, current: 18 });
  const [alerts, setAlerts] = useState<{ type: string; msg: string }[]>([]);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const selector = useRaceSelector();

  const calculateRegression = (laps: { x: number; y: number }[]) => {
    if (laps.length < 2) return { slope: 0, intercept: 0 };

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    const n = laps.length;

    laps.forEach(lap => {
      sumX += lap.x;
      sumY += lap.y;
      sumXY += lap.x * lap.y;
      sumXX += lap.x * lap.x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  };

  const generateStrategyData = async () => {
    if (!selector.sessionKey || !selector.driver1 || !selector.driver2) return;

    setLoading(true);
    try {
      // Fetch laps and stints
      const [laps1Res, laps2Res, stints1Res, stints2Res] = await Promise.all([
        axios.get(`/api/openf1/laps?session_key=${selector.sessionKey}&driver_number=${selector.driver1}`),
        axios.get(`/api/openf1/laps?session_key=${selector.sessionKey}&driver_number=${selector.driver2}`),
        axios.get(`/api/openf1/stints?session_key=${selector.sessionKey}&driver_number=${selector.driver1}`),
        axios.get(`/api/openf1/stints?session_key=${selector.sessionKey}&driver_number=${selector.driver2}`)
      ]);

      const laps1 = (laps1Res.data as LapData[]).filter((l) => l.lap_duration != null);
      const laps2 = (laps2Res.data as LapData[]).filter((l) => l.lap_duration != null);
      const stints1 = stints1Res.data as Stint[];
      const stints2 = stints2Res.data as Stint[];

      // Remove outliers (e.g. pit laps, VSC, SC) - > 105% of median
      const getMedian = (arr: number[]) => {
        if (arr.length === 0) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      };

      const median1 = getMedian(laps1.map((l) => l.lap_duration!));
      const median2 = getMedian(laps2.map((l) => l.lap_duration!));

      const cleanLaps1 = laps1.filter((l) => l.lap_duration! < median1 * 1.05);
      const cleanLaps2 = laps2.filter((l) => l.lap_duration! < median2 * 1.05);

      // Calculate regression for the longest stint of each driver
      const getLongestStintLaps = (cleanLaps: LapData[], stints: Stint[]) => {
        if (stints.length === 0) return cleanLaps;
        const longestStint = stints.reduce((prev, current) =>
          (current.lap_end - current.lap_start) > (prev.lap_end - prev.lap_start) ? current : prev
        );
        return cleanLaps.filter(l => l.lap_number >= longestStint.lap_start && l.lap_number <= longestStint.lap_end);
      };

      const stintLaps1 = getLongestStintLaps(cleanLaps1, stints1);
      const stintLaps2 = getLongestStintLaps(cleanLaps2, stints2);

      const reg1 = calculateRegression(stintLaps1.map(l => ({ x: l.lap_number, y: l.lap_duration! })));
      const reg2 = calculateRegression(stintLaps2.map(l => ({ x: l.lap_number, y: l.lap_duration! })));

      const maxLap = Math.max(
        ...laps1.map((l) => l.lap_number),
        ...laps2.map((l) => l.lap_number),
        1
      );

      const chartData: StrategyLapPoint[] = [];
      for (let lap = 1; lap <= maxLap; lap++) {
        const l1 = cleanLaps1.find((l) => l.lap_number === lap);
        const l2 = cleanLaps2.find((l) => l.lap_number === lap);

        chartData.push({
          lap,
          time1: l1 ? l1.lap_duration : null,
          time2: l2 ? l2.lap_duration : null,
          trend1: reg1.slope !== 0 ? reg1.intercept + reg1.slope * lap : null,
          trend2: reg2.slope !== 0 ? reg2.intercept + reg2.slope * lap : null,
        });
      }

      setLapsData(chartData);

      // Generate dynamic alerts based on real data
      const newAlerts: { type: string; msg: string }[] = [];
      const n1 = selector.d1Info?.name_acronym || selector.driver1;
      const n2 = selector.d2Info?.name_acronym || selector.driver2;

      if (reg1.slope > 0) {
        newAlerts.push({ type: 'warning', msg: `${n1} degradation: +${reg1.slope.toFixed(3)}s per lap.` });
      }
      if (reg2.slope > 0) {
        newAlerts.push({ type: 'warning', msg: `${n2} degradation: +${reg2.slope.toFixed(3)}s per lap.` });
      }

      if (reg1.slope > reg2.slope && reg2.slope > 0) {
        newAlerts.push({ type: 'info', msg: `${n1} is degrading faster than ${n2}.` });
      } else if (reg2.slope > reg1.slope && reg1.slope > 0) {
        newAlerts.push({ type: 'info', msg: `${n2} is degrading faster than ${n1}.` });
      }

      // Find pit laps
      const pitLaps1 = stints1.map((s) => s.lap_end).filter((l) => l > 0 && l < maxLap);
      const pitLaps2 = stints2.map((s) => s.lap_end).filter((l) => l > 0 && l < maxLap);

      if (pitLaps1.length > 0) {
        newAlerts.push({ type: 'success', msg: `${n1} pitted on lap(s): ${pitLaps1.join(', ')}.` });
      }
      if (pitLaps2.length > 0) {
        newAlerts.push({ type: 'success', msg: `${n2} pitted on lap(s): ${pitLaps2.join(', ')}.` });
      }

      setAlerts(newAlerts);

      // Update pit window visualization based on pit stops
      const allPitLaps = [...pitLaps1, ...pitLaps2];
      let openP = 15, closeP = 22, currentP = 18;
      if (allPitLaps.length > 0) {
        const avgPit = Math.round(allPitLaps.reduce((a, b) => a + b, 0) / allPitLaps.length);
        openP = Math.max(1, avgPit - 5);
        closeP = Math.min(maxLap, avgPit + 5);
        currentP = avgPit;
      } else {
        const mid = Math.round(maxLap / 2);
        openP = Math.max(1, mid - 5);
        closeP = mid + 5;
        currentP = mid;
      }
      setPitWindow({ open: openP, close: closeP, current: currentP });

      // Trigger AI Strategy Prediction
      setLoadingAi(true);
      const meetingName = selector.meetings.find(m => m.meeting_key.toString() === selector.meetingKey)?.meeting_name;
      const sessionName = selector.sessions.find(s => s.session_key.toString() === selector.sessionKey)?.session_name;
      
      const promptData = `
Circuit: ${meetingName || 'F1 Circuit'} ${selector.year}
Session: ${sessionName || 'Race'}
Driver 1 (${n1}): Degradation trend +${reg1.slope.toFixed(3)}s per lap. Longest stint: ${stintLaps1.length} laps.
Driver 2 (${n2}): Degradation trend +${reg2.slope.toFixed(3)}s per lap. Longest stint: ${stintLaps2.length} laps.
Observed Pit Window: Around lap ${currentP}.
      `;
      axios.post('/api/ai/strategy', { promptData })
        .then(res => setAiSuggestion(res.data.suggestion))
        .catch(err => {
          console.error("AI Error", err);
          setAiSuggestion("AI Strategy unavailable. Please ensure GEMINI_API_KEY is set in .env.");
        })
        .finally(() => setLoadingAi(false));

    } catch (error) {
      console.error("Failed to fetch strategy data", error);
      setLapsData([]);
      setAlerts([{ type: 'warning', msg: 'Failed to load strategy data. Please try another session.' }]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins > 0 ? mins + ':' : ''}${secs.padStart(mins > 0 ? 6 : 5, '0')}`;
  };

  const d1Name = selector.d1Info?.name_acronym || selector.driver1;
  const d2Name = selector.d2Info?.name_acronym || selector.driver2;

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col space-y-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI Strategy Predictor</h2>
          <p className="text-zinc-400 mt-1">Real-time degradation and pit-stop analysis powered by OpenF1</p>
        </div>

        <RaceSelector
          {...selector}
          loading={loading}
          onAnalyze={generateStrategyData}
        />
      </div>

      {lapsData.length > 0 ? (
        <div className="flex flex-col xl:grid xl:grid-cols-3 gap-6 flex-1 overflow-y-auto pb-8 pr-2 custom-scrollbar">
          {/* Degradation Model */}
          <div className="xl:col-span-2 bg-zinc-900 rounded-2xl border border-zinc-800 p-6 flex flex-col min-h-[450px]">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold flex items-center">
                  <TrendingDown className="mr-2 text-red-500" size={20} />
                  Tyre Degradation Model (Real Data)
                </h3>
                <p className="text-sm text-zinc-400 mt-2 max-w-2xl">
                  Visualizes lap times over the course of a stint. Upward trends indicate tyre wear (slower lap times). The dashed trend lines help identify the rate of degradation for each driver, crucial for predicting the optimal pit stop lap.
                </p>
              </div>
            </div>

            <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lapsData} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="lap" stroke="#52525b" fontSize={12} label={{ value: 'Lap Number', position: 'insideBottom', offset: -10, fill: '#a1a1aa', fontSize: 12 }} />
                  <YAxis domain={['auto', 'auto']} padding={{ top: 20, bottom: 20 }} stroke="#52525b" fontSize={12} tickFormatter={(val) => formatTime(val)} width={60} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    labelStyle={{ color: '#a1a1aa', fontSize: '12px', marginBottom: '4px' }}
                    formatter={(value: number) => formatTime(value)}
                    labelFormatter={(label) => `Lap ${label}`}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />

                  {/* Actual Lap Times */}
                  <Line type="monotone" dataKey="time1" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 7, strokeWidth: 0 }} name={`${d1Name} Actual`} connectNulls />
                  <Line type="monotone" dataKey="time2" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4, fill: '#ef4444', strokeWidth: 0 }} activeDot={{ r: 7, strokeWidth: 0 }} name={`${d2Name} Actual`} connectNulls />

                  {/* Trend Lines */}
                  <Line type="monotone" dataKey="trend1" stroke="#93c5fd" strokeWidth={2.5} strokeDasharray="5 5" dot={false} activeDot={false} name={`${d1Name} Trend`} connectNulls />
                  <Line type="monotone" dataKey="trend2" stroke="#fca5a5" strokeWidth={2.5} strokeDasharray="5 5" dot={false} activeDot={false} name={`${d2Name} Trend`} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pit Window & Alerts */}
          <div className="space-y-6 flex flex-col">
            {/* Pit Window */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
              <div className="mb-4">
                <h3 className="text-lg font-bold flex items-center">
                  <Clock className="mr-2 text-yellow-500" size={20} />
                  Pit Window Analysis
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Shows the optimal window to pit based on tyre degradation and average pit loss time.
                </p>
              </div>

              <div className="relative pt-8 pb-2">
                {/* Labels */}
                <div
                  className="absolute top-0 text-xs font-bold text-yellow-500 transition-all duration-500 -translate-x-1/2"
                  style={{ left: `${(pitWindow.open / Math.max(lapsData.length, 1)) * 100}%` }}
                >
                  OPEN
                </div>
                <div
                  className="absolute top-0 text-xs font-bold text-yellow-500 transition-all duration-500 -translate-x-1/2"
                  style={{ left: `${(pitWindow.close / Math.max(lapsData.length, 1)) * 100}%` }}
                >
                  CLOSE
                </div>
                <div
                  className="absolute top-0 text-xs font-bold text-white transition-all duration-500 -translate-x-1/2"
                  style={{ left: `${(pitWindow.current / Math.max(lapsData.length, 1)) * 100}%` }}
                >
                  LAP {pitWindow.current}
                </div>

                <div className="h-4 bg-zinc-800 rounded-full overflow-hidden relative border border-zinc-700">
                  <div
                    className="h-full bg-yellow-500/30 absolute top-0 transition-all duration-500 border-x border-yellow-500/50"
                    style={{ left: `${(pitWindow.open / Math.max(lapsData.length, 1)) * 100}%`, width: `${((pitWindow.close - pitWindow.open) / Math.max(lapsData.length, 1)) * 100}%` }}
                  ></div>
                  <div
                    className="h-full bg-white absolute top-0 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                    style={{ left: `${(pitWindow.current / Math.max(lapsData.length, 1)) * 100}%`, width: '4px', marginLeft: '-2px' }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-zinc-500 mt-2 font-mono">
                  <span>Lap 1</span>
                  <span>Lap {Math.floor(lapsData.length / 2)}</span>
                  <span>Lap {lapsData.length}</span>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Pit Window</p>
                    <p className="text-xl font-mono font-bold text-zinc-100">L{pitWindow.open}–L{pitWindow.close}</p>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Data Points</p>
                    <p className="text-xl font-bold text-blue-500">{lapsData.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Strategy Suggestion */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 flex flex-col relative overflow-hidden">
              {/* Background gradient for AI */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 pointer-events-none"></div>
              
              <h3 className="text-lg font-bold flex items-center mb-4 shrink-0 relative z-10">
                <BrainCircuit className="mr-2 text-indigo-400" size={20} />
                AI Strategy Suggestion
                <Sparkles className="ml-2 text-indigo-500/50" size={16} />
              </h3>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar text-sm text-zinc-300 leading-relaxed relative z-10">
                {loadingAi ? (
                  <div className="flex flex-col items-center justify-center h-full py-4 opacity-70">
                    <Loader2 className="animate-spin text-indigo-400 mb-2" size={24} />
                    <span className="text-xs text-indigo-300 animate-pulse">Running GenAI Strategy Models...</span>
                  </div>
                ) : aiSuggestion ? (
                  <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl whitespace-pre-line text-indigo-100">
                    {aiSuggestion}
                  </div>
                ) : (
                  <div className="text-zinc-500 py-4 text-center">Analyze data to generate AI insights.</div>
                )}
              </div>
            </div>

            {/* Live Alerts */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 flex-1 flex flex-col min-h-0">
              <h3 className="text-lg font-bold flex items-center mb-4 shrink-0">
                <AlertTriangle className="mr-2 text-orange-500" size={20} />
                Strategic Insights
              </h3>

              <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                {alerts.map((alert, i) => (
                  <div key={i} className={`p-3 rounded-xl border text-sm flex items-start ${
                    alert.type === 'warning' ? 'bg-orange-500/10 border-orange-500/20 text-orange-200' :
                    alert.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-200' :
                    'bg-blue-500/10 border-blue-500/20 text-blue-200'
                  }`}>
                    <ArrowRightLeft className={`mr-2 mt-0.5 shrink-0 ${
                      alert.type === 'warning' ? 'text-orange-500' :
                      alert.type === 'success' ? 'text-green-500' :
                      'text-blue-500'
                    }`} size={16} />
                    <span>{alert.msg}</span>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <div className="text-zinc-500 text-sm text-center mt-4">No significant insights found.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center border-2 border-dashed border-zinc-800 rounded-2xl">
          <div className="text-center">
            {loading ? (
              <Loader2 size={48} className="mx-auto text-zinc-700 mb-4 animate-spin" />
            ) : (
              <Activity size={48} className="mx-auto text-zinc-700 mb-4" />
            )}
            <h3 className="text-xl font-medium text-zinc-300">
              {loading ? "Analyzing Strategy..." : "No Strategy Data"}
            </h3>
            <p className="text-zinc-500 mt-2 max-w-sm">
              {loading ? "Downloading lap times and stint data from OpenF1 API." : "Select parameters and click Analyze to load real lap times and degradation models."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
