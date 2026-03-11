import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Scatter } from 'recharts';
import { AlertTriangle, Clock, TrendingDown, ArrowRightLeft, Loader2, Play, Activity } from 'lucide-react';
import axios from 'axios';

export default function Strategy() {
  const [loading, setLoading] = useState(false);
  const [lapsData, setLapsData] = useState<any[]>([]);
  const [pitWindow, setPitWindow] = useState({ open: 15, close: 22, current: 18 });
  const [alerts, setAlerts] = useState<{type: string, msg: string}[]>([]);
  
  // Selections
  const [year, setYear] = useState('2024');
  const [meetingKey, setMeetingKey] = useState('');
  const [sessionKey, setSessionKey] = useState('');
  const [driver1, setDriver1] = useState('');
  const [driver2, setDriver2] = useState('');

  // Options
  const [meetings, setMeetings] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  
  const [loadingOptions, setLoadingOptions] = useState(false);

  // 1. Fetch Meetings
  useEffect(() => {
    const fetchMeetings = async () => {
      setLoadingOptions(true);
      try {
        const res = await axios.get(`/api/openf1/meetings?year=${year}`);
        const sortedMeetings = res.data.sort((a: any, b: any) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
        setMeetings(sortedMeetings);
        if (sortedMeetings.length > 0) {
          setMeetingKey(sortedMeetings[0].meeting_key.toString());
        } else {
          setMeetingKey('');
        }
      } catch (error) {
        console.error("Failed to fetch meetings", error);
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchMeetings();
  }, [year]);

  // 2. Fetch Sessions
  useEffect(() => {
    if (!meetingKey) {
      setSessions([]);
      setSessionKey('');
      return;
    }
    const fetchSessions = async () => {
      setLoadingOptions(true);
      try {
        const res = await axios.get(`/api/openf1/sessions?meeting_key=${meetingKey}`);
        const sortedSessions = res.data.sort((a: any, b: any) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
        setSessions(sortedSessions);
        if (sortedSessions.length > 0) {
          setSessionKey(sortedSessions[sortedSessions.length - 1].session_key.toString());
        } else {
          setSessionKey('');
        }
      } catch (error) {
        console.error("Failed to fetch sessions", error);
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchSessions();
  }, [meetingKey]);

  // 3. Fetch Drivers
  useEffect(() => {
    if (!sessionKey) {
      setDrivers([]);
      setDriver1('');
      setDriver2('');
      return;
    }
    const fetchDrivers = async () => {
      setLoadingOptions(true);
      try {
        const res = await axios.get(`/api/openf1/drivers?session_key=${sessionKey}`);
        const validDrivers = res.data.filter((d: any) => d.driver_number && d.name_acronym);
        const sortedDrivers = validDrivers.sort((a: any, b: any) => a.driver_number - b.driver_number);
        const uniqueDrivers = Array.from(new Map(sortedDrivers.map((item: any) => [item.driver_number, item])).values()) as any[];
        
        setDrivers(uniqueDrivers);
        if (uniqueDrivers.length >= 2) {
          setDriver1(uniqueDrivers[0].driver_number.toString());
          const secondDriver = uniqueDrivers.find((d: any) => d.driver_number === 16 || d.driver_number === 4) || uniqueDrivers[1];
          setDriver2(secondDriver.driver_number.toString());
        } else if (uniqueDrivers.length === 1) {
          setDriver1(uniqueDrivers[0].driver_number.toString());
          setDriver2('');
        } else {
          setDriver1('');
          setDriver2('');
        }
      } catch (error) {
        console.error("Failed to fetch drivers", error);
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchDrivers();
  }, [sessionKey]);

  const calculateRegression = (laps: any[]) => {
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
    if (!sessionKey || !driver1 || !driver2) return;
    
    setLoading(true);
    try {
      // Fetch laps and stints
      const [laps1Res, laps2Res, stints1Res, stints2Res] = await Promise.all([
        axios.get(`/api/openf1/laps?session_key=${sessionKey}&driver_number=${driver1}`),
        axios.get(`/api/openf1/laps?session_key=${sessionKey}&driver_number=${driver2}`),
        axios.get(`/api/openf1/stints?session_key=${sessionKey}&driver_number=${driver1}`),
        axios.get(`/api/openf1/stints?session_key=${sessionKey}&driver_number=${driver2}`)
      ]);
      
      const laps1 = laps1Res.data.filter((l: any) => l.lap_duration != null);
      const laps2 = laps2Res.data.filter((l: any) => l.lap_duration != null);
      const stints1 = stints1Res.data;
      const stints2 = stints2Res.data;
      
      // Remove outliers (e.g. pit laps, VSC, SC) - simple filter: > 105% of median
      const getMedian = (arr: number[]) => {
        if (arr.length === 0) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      };
      
      const median1 = getMedian(laps1.map((l: any) => l.lap_duration));
      const median2 = getMedian(laps2.map((l: any) => l.lap_duration));
      
      const cleanLaps1 = laps1.filter((l: any) => l.lap_duration < median1 * 1.05);
      const cleanLaps2 = laps2.filter((l: any) => l.lap_duration < median2 * 1.05);
      
      // Calculate regression for the longest stint of each driver
      const getLongestStintLaps = (cleanLaps: any[], stints: any[]) => {
        if (stints.length === 0) return cleanLaps;
        const longestStint = stints.reduce((prev: any, current: any) => 
          (current.lap_end - current.lap_start) > (prev.lap_end - prev.lap_start) ? current : prev
        );
        return cleanLaps.filter(l => l.lap_number >= longestStint.lap_start && l.lap_number <= longestStint.lap_end);
      };
      
      const stintLaps1 = getLongestStintLaps(cleanLaps1, stints1);
      const stintLaps2 = getLongestStintLaps(cleanLaps2, stints2);
      
      const reg1 = calculateRegression(stintLaps1.map(l => ({ x: l.lap_number, y: l.lap_duration })));
      const reg2 = calculateRegression(stintLaps2.map(l => ({ x: l.lap_number, y: l.lap_duration })));
      
      const maxLap = Math.max(
        ...laps1.map((l: any) => l.lap_number), 
        ...laps2.map((l: any) => l.lap_number),
        1
      );
      
      const chartData = [];
      for (let lap = 1; lap <= maxLap; lap++) {
        const l1 = cleanLaps1.find((l: any) => l.lap_number === lap);
        const l2 = cleanLaps2.find((l: any) => l.lap_number === lap);
        
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
      const newAlerts = [];
      const d1Info = drivers.find(d => d.driver_number.toString() === driver1);
      const d2Info = drivers.find(d => d.driver_number.toString() === driver2);
      const n1 = d1Info?.name_acronym || driver1;
      const n2 = d2Info?.name_acronym || driver2;
      
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
      const pitLaps1 = stints1.map((s: any) => s.lap_end).filter((l: number) => l > 0 && l < maxLap);
      const pitLaps2 = stints2.map((s: any) => s.lap_end).filter((l: number) => l > 0 && l < maxLap);
      
      if (pitLaps1.length > 0) {
        newAlerts.push({ type: 'success', msg: `${n1} pitted on lap(s): ${pitLaps1.join(', ')}.` });
      }
      if (pitLaps2.length > 0) {
        newAlerts.push({ type: 'success', msg: `${n2} pitted on lap(s): ${pitLaps2.join(', ')}.` });
      }
      
      setAlerts(newAlerts);
      
      // Update pit window visualization based on the last pit stop
      const lastPit = Math.max(...pitLaps1, ...pitLaps2, 15);
      setPitWindow({ open: Math.max(1, lastPit - 5), close: lastPit + 5, current: lastPit });
      
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

  const d1Info = drivers.find(d => d.driver_number.toString() === driver1);
  const d2Info = drivers.find(d => d.driver_number.toString() === driver2);

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col space-y-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI Strategy Predictor</h2>
          <p className="text-zinc-400 mt-1">Real-time degradation and pit-stop analysis powered by OpenF1</p>
        </div>
        
        <div className="flex flex-wrap gap-3 bg-zinc-900 p-3 rounded-xl border border-zinc-800 items-center">
          {/* Year Selection */}
          <select 
            value={year} 
            onChange={e => setYear(e.target.value)} 
            disabled={loadingOptions || loading}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 disabled:opacity-50"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="2022">2022</option>
          </select>

          {/* Meeting Selection */}
          <select 
            value={meetingKey} 
            onChange={e => setMeetingKey(e.target.value)} 
            disabled={loadingOptions || loading || meetings.length === 0}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 disabled:opacity-50 max-w-[200px] truncate"
          >
            {meetings.length === 0 && <option value="">No meetings found</option>}
            {meetings.map((m: any) => (
              <option key={m.meeting_key} value={m.meeting_key}>
                {m.meeting_name}
              </option>
            ))}
          </select>

          {/* Session Selection */}
          <select 
            value={sessionKey} 
            onChange={e => setSessionKey(e.target.value)} 
            disabled={loadingOptions || loading || sessions.length === 0}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 disabled:opacity-50"
          >
            {sessions.length === 0 && <option value="">No sessions found</option>}
            {sessions.map((s: any) => (
              <option key={s.session_key} value={s.session_key}>
                {s.session_name}
              </option>
            ))}
          </select>

          <div className="w-px h-6 bg-zinc-800 mx-1"></div>

          {/* Driver 1 Selection */}
          <select 
            value={driver1} 
            onChange={e => setDriver1(e.target.value)} 
            disabled={loadingOptions || loading || drivers.length === 0}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-blue-400 font-bold disabled:opacity-50"
          >
            {drivers.length === 0 && <option value="">No drivers</option>}
            {drivers.map((d: any) => (
              <option key={`d1-${d.driver_number}`} value={d.driver_number}>
                {d.name_acronym} ({d.driver_number})
              </option>
            ))}
          </select>

          {/* Driver 2 Selection */}
          <select 
            value={driver2} 
            onChange={e => setDriver2(e.target.value)} 
            disabled={loadingOptions || loading || drivers.length === 0}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 text-red-500 font-bold disabled:opacity-50"
          >
            {drivers.length === 0 && <option value="">No drivers</option>}
            {drivers.map((d: any) => (
              <option key={`d2-${d.driver_number}`} value={d.driver_number}>
                {d.name_acronym} ({d.driver_number})
              </option>
            ))}
          </select>
          
          <button 
            onClick={generateStrategyData}
            disabled={loading || loadingOptions || !sessionKey || !driver1 || !driver2}
            className="ml-auto bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
          >
            {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Play size={16} className="mr-2" />}
            Analyze
          </button>
        </div>
      </div>

      {lapsData.length > 0 ? (
        <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
          {/* Degradation Model */}
          <div className="col-span-2 bg-zinc-900 rounded-2xl border border-zinc-800 p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold flex items-center">
                <TrendingDown className="mr-2 text-red-500" size={20} />
                Tyre Degradation Model (Real Data)
              </h3>
              <div className="flex space-x-4 text-sm">
                <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>{d1Info?.name_acronym || driver1}</div>
                <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>{d2Info?.name_acronym || driver2}</div>
              </div>
            </div>
            
            <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lapsData} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="lap" stroke="#52525b" fontSize={12} label={{ value: 'Lap Number', position: 'insideBottom', offset: -10, fill: '#a1a1aa', fontSize: 12 }} />
                  <YAxis domain={['auto', 'auto']} stroke="#52525b" fontSize={12} tickFormatter={(val) => formatTime(val)} width={60} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    labelStyle={{ color: '#a1a1aa', fontSize: '12px', marginBottom: '4px' }}
                    formatter={(value: number) => formatTime(value)}
                    labelFormatter={(label) => `Lap ${label}`}
                  />
                  
                  {/* Actual Lap Times */}
                  <Line type="monotone" dataKey="time1" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} name={`${d1Info?.name_acronym || driver1} Actual`} connectNulls />
                  <Line type="monotone" dataKey="time2" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }} name={`${d2Info?.name_acronym || driver2} Actual`} connectNulls />
                  
                  {/* Trend Lines */}
                  <Line type="monotone" dataKey="trend1" stroke="#93c5fd" strokeWidth={2} strokeDasharray="5 5" dot={false} name={`${d1Info?.name_acronym || driver1} Trend`} connectNulls />
                  <Line type="monotone" dataKey="trend2" stroke="#fca5a5" strokeWidth={2} strokeDasharray="5 5" dot={false} name={`${d2Info?.name_acronym || driver2} Trend`} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pit Window & Alerts */}
          <div className="space-y-6 flex flex-col">
            {/* Pit Window */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
              <h3 className="text-lg font-bold flex items-center mb-4">
                <Clock className="mr-2 text-yellow-500" size={20} />
                Pit Window Analysis
              </h3>
              
              <div className="relative pt-6 pb-2">
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden relative">
                  <div 
                    className="h-full bg-yellow-500/20 absolute top-0 transition-all duration-500"
                    style={{ left: `${(pitWindow.open/Math.max(lapsData.length, 1))*100}%`, width: `${((pitWindow.close - pitWindow.open)/Math.max(lapsData.length, 1))*100}%` }}
                  ></div>
                  <div 
                    className="h-full bg-yellow-500 absolute top-0 rounded-full transition-all duration-500"
                    style={{ left: `${(pitWindow.current/Math.max(lapsData.length, 1))*100}%`, width: '4px' }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-zinc-500 mt-2 font-mono">
                  <span>Lap 1</span>
                  <span>Lap {Math.floor(lapsData.length / 2)}</span>
                  <span>Lap {lapsData.length}</span>
                </div>
                
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Avg Pit Loss</p>
                    <p className="text-xl font-mono font-bold text-zinc-100">~22.0s</p>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Data Points</p>
                    <p className="text-xl font-bold text-blue-500">{lapsData.length}</p>
                  </div>
                </div>
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
