import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, Clock, Zap, Maximize2, X } from 'lucide-react';
import axios from 'axios';
import { useRaceSelector } from '../hooks/useRaceSelector';
import RaceSelector from '../components/RaceSelector';
import F1LoadingLights from '../components/F1LoadingLights';
import type { TelemetryPoint, CarData, LapData } from '../types';

export default function Telemetry() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TelemetryPoint[]>([]);
  const [laps1, setLaps1] = useState<LapData[]>([]);
  const [laps2, setLaps2] = useState<LapData[]>([]);
  const [driver1LapReq, setDriver1LapReq] = useState<string>('fastest');
  const [driver2LapReq, setDriver2LapReq] = useState<string>('fastest');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [lapStats, setLapStats] = useState<{ d1: LapData | null, d2: LapData | null }>({ d1: null, d2: null });
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  const selector = useRaceSelector();

  const fetchTelemetry = async () => {
    if (!selector.sessionKey || !selector.driver1 || !selector.driver2) return;

    setLoading(true);
    try {
      // 1. Fetch laps for both drivers to find their fastest laps
      const [laps1Res, laps2Res] = await Promise.all([
        axios.get(`/api/openf1/laps?session_key=${selector.sessionKey}&driver_number=${selector.driver1}`),
        axios.get(`/api/openf1/laps?session_key=${selector.sessionKey}&driver_number=${selector.driver2}`)
      ]);

      const validLaps1 = (laps1Res.data as LapData[]).filter((l) => l.lap_duration != null);
      const validLaps2 = (laps2Res.data as LapData[]).filter((l) => l.lap_duration != null);

      if (validLaps1.length === 0 || validLaps2.length === 0) {
        console.warn("No valid laps found for one or both drivers.");
        setData([]);
        setLaps1([]);
        setLaps2([]);
        setLoading(false);
        return;
      }

      setLaps1(validLaps1);
      setLaps2(validLaps2);

      // Find selected lap for driver 1
      let targetLap1: LapData;
      if (driver1LapReq === 'fastest') {
        targetLap1 = validLaps1.reduce((min, p) => (p.lap_duration! < min.lap_duration! ? p : min), validLaps1[0]);
      } else {
        const lapNum = parseInt(driver1LapReq);
        targetLap1 = validLaps1.find(l => l.lap_number === lapNum) || validLaps1.reduce((min, p) => (p.lap_duration! < min.lap_duration! ? p : min), validLaps1[0]);
      }

      // Find selected lap for driver 2
      let targetLap2: LapData;
      if (driver2LapReq === 'fastest') {
        targetLap2 = validLaps2.reduce((min, p) => (p.lap_duration! < min.lap_duration! ? p : min), validLaps2[0]);
      } else {
        const lapNum = parseInt(driver2LapReq);
        targetLap2 = validLaps2.find(l => l.lap_number === lapNum) || validLaps2.reduce((min, p) => (p.lap_duration! < min.lap_duration! ? p : min), validLaps2[0]);
      }

      // Calculate end time for the lap
      const endTime1 = new Date(new Date(targetLap1.date_start).getTime() + targetLap1.lap_duration! * 1000).toISOString();
      const endTime2 = new Date(new Date(targetLap2.date_start).getTime() + targetLap2.lap_duration! * 1000).toISOString();

      // 2. Fetch car data for the specific time window of the target lap
      const res1 = await axios.get(`/api/openf1/car_data?driver_number=${selector.driver1}&session_key=${selector.sessionKey}&date>=${targetLap1.date_start}&date<=${endTime1}`);
      const res2 = await axios.get(`/api/openf1/car_data?driver_number=${selector.driver2}&session_key=${selector.sessionKey}&date>=${targetLap2.date_start}&date<=${endTime2}`);

      const d1 = res1.data as CarData[];
      const d2 = res2.data as CarData[];

      if (d1.length > 0 && d2.length > 0) {
        const mergedData: TelemetryPoint[] = [];
        const startTime1 = new Date(targetLap1.date_start).getTime();
        const startTime2 = new Date(targetLap2.date_start).getTime();

        let j = 0;
        for (let i = 0; i < d1.length; i++) {
          const relTime1 = new Date(d1[i].date).getTime() - startTime1;

          while (j < d2.length - 1) {
            const relTime2 = new Date(d2[j].date).getTime() - startTime2;
            const nextRelTime2 = new Date(d2[j + 1].date).getTime() - startTime2;

            if (Math.abs(nextRelTime2 - relTime1) <= Math.abs(relTime2 - relTime1)) {
              j++;
            } else {
              break;
            }
          }

          const d2Sample = d2[j] || ({} as CarData);

          mergedData.push({
            time: Number((relTime1 / 1000).toFixed(2)),
            distance: i * 10,
            speed1: d1[i]?.speed || 0,
            throttle1: d1[i]?.throttle || 0,
            brake1: d1[i]?.brake || 0,
            gear1: d1[i]?.n_gear || 0,
            rpm1: d1[i]?.rpm || 0,
            speed2: d2Sample.speed || 0,
            throttle2: d2Sample.throttle || 0,
            brake2: d2Sample.brake || 0,
            gear2: d2Sample.n_gear || 0,
            rpm2: d2Sample.rpm || 0,
          });
        }
        setLapStats({ d1: targetLap1, d2: targetLap2 });
        // Maximize UI fluidity: downsample raw data (up to 1500 points) to max 250 points for Recharts SVG rendering
        const renderStep = Math.max(1, Math.floor(mergedData.length / 250));
        setData(mergedData.filter((_, i) => i % renderStep === 0));
        setAiAnalysis(null);
      } else {
        console.warn("No telemetry data found for one or both drivers in this session.");
        setData([]);
      }
    } catch (error) {
      console.error("Failed to fetch telemetry", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const getAiAnalysis = async () => {
    if (data.length === 0) return;
    setAiLoading(true);
    try {
      const maxS1 = Math.max(...data.map(p => p.speed1));
      const maxS2 = Math.max(...data.map(p => p.speed2));

      const l1 = lapStats.d1;
      const l2 = lapStats.d2;

      // Downsample the already 250-point data to ~50 points for AI and format as CSV text 
      const aiStep = Math.max(1, Math.floor(data.length / 50));
      const speedTraceCsv = ["Time(s),Speed1(km/h),Speed2(km/h)"];
      data.filter((_, i) => i % aiStep === 0).forEach(d => {
         speedTraceCsv.push(`${d.time},${d.speed1},${d.speed2}`);
      });
      const speedTrace = speedTraceCsv.join('\n');

      const res = await axios.post('/api/ai/duel', {
           driver1: { name: d1Name, lapTime: formatLapTime(l1?.lap_duration || undefined), s1: l1?.sector_1_duration || 'N/A', s2: l1?.sector_2_duration || 'N/A', s3: l1?.sector_3_duration || 'N/A', maxSpeed: maxS1 },
           driver2: { name: d2Name, lapTime: formatLapTime(l2?.lap_duration || undefined), s1: l2?.sector_1_duration || 'N/A', s2: l2?.sector_2_duration || 'N/A', s3: l2?.sector_3_duration || 'N/A', maxSpeed: maxS2 },
           sessionInfo: `${selector.year} ${selector.meetings.find(m => m.meeting_key.toString() === selector.meetingKey)?.meeting_name || ''} - Telemetry Comparison Lap`,
           speedTrace
      });
      setAiAnalysis(res.data.analysis);
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  const d1Name = selector.d1Info?.name_acronym || selector.driver1;
  const d2Name = selector.d2Info?.name_acronym || selector.driver2;

  // Derive circuit name from selected meeting
  const circuitName = useMemo(() => {
    const meeting = selector.meetings.find(m => m.meeting_key.toString() === selector.meetingKey);
    if (!meeting) return '';
    return meeting.circuit_short_name || meeting.location || meeting.meeting_name || '';
  }, [selector.meetingKey, selector.meetings]);

  const formatLapTime = (duration?: number) => {
    if (!duration) return 'N/A';
    const mins = Math.floor(duration / 60);
    const secs = (duration % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col space-y-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Historical Telemetry</h2>
          <p className="text-zinc-400 mt-1">Distance-based comparative analysis powered by OpenF1</p>
        </div>

        <RaceSelector
          {...selector}
          loading={loading}
          onAnalyze={fetchTelemetry}
        />

        {/* Lap Selectors */}
        {(laps1.length > 0 || laps2.length > 0) && data.length > 0 && !loading && (
          <div className="flex gap-4 p-4 bg-zinc-900/40 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl">
            <div className="flex-1">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">{d1Name} Lap</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Clock className="h-4 w-4 text-blue-500" />
                </div>
                <select
                  value={driver1LapReq}
                  onChange={(e) => setDriver1LapReq(e.target.value)}
                  className="w-full bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-lg pl-9 pr-8 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500/50 appearance-none"
                >
                  <option value="fastest">Fastest Lap</option>
                  {laps1.map(lap => (
                    <option key={lap.lap_number} value={lap.lap_number.toString()}>
                      Lap {lap.lap_number} ({formatLapTime(lap.lap_duration)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-1">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">{d2Name} Lap</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Clock className="h-4 w-4 text-red-500" />
                </div>
                <select
                  value={driver2LapReq}
                  onChange={(e) => setDriver2LapReq(e.target.value)}
                  className="w-full bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-lg pl-9 pr-8 py-2.5 text-sm font-bold focus:outline-none focus:border-red-500/50 appearance-none"
                >
                  <option value="fastest">Fastest Lap</option>
                  {laps2.map(lap => (
                    <option key={lap.lap_number} value={lap.lap_number.toString()}>
                      Lap {lap.lap_number} ({formatLapTime(lap.lap_duration)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-end flex-none pt-4">
               <button 
                  onClick={fetchTelemetry}
                  disabled={loading}
                  className="h-[42px] px-6 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg transition-colors border border-zinc-700 whitespace-nowrap"
               >
                 Compare Details
               </button>
            </div>
          </div>
        )}
      </div>

      {data.length > 0 ? (
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-8 pr-2 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 shrink-0">
            {/* Speed Chart */}
            <div className="group bg-zinc-900/40 backdrop-blur-xl shadow-2xl shadow-blue-900/5 rounded-3xl border border-white/10 p-5 flex flex-col min-h-[300px]">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-[13px] font-black text-zinc-300 uppercase tracking-tighter">Speed Trace</h3>
                </div>
                <button onClick={() => setExpandedChart('speed')} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white">
                  <Maximize2 size={16} />
                </button>
              </div>
              <div className="flex-1 min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} syncId="telemetry" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" strokeOpacity={0.4} vertical={false} />
                    <XAxis dataKey="time" type="number" hide />
                    <YAxis domain={['auto', 'auto']} stroke="#52525b" fontSize={11} width={40} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                      labelStyle={{ display: 'none' }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Line type="monotone" dataKey="speed1" stroke="#3b82f6" strokeWidth={2.5} dot={false} name={d1Name} />
                    <Line type="monotone" dataKey="speed2" stroke="#ef4444" strokeWidth={2.5} dot={false} name={d2Name} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* AI Insights Panel */}
            <div className="bg-zinc-900/40 backdrop-blur-xl shadow-2xl glow shadow-blue-500/10 rounded-3xl border border-blue-500/20 p-6 flex flex-col min-h-[300px]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Zap size={14} className="text-blue-500 animate-pulse" />
                    AI PERFORMANCE REVIEW
                  </h3>
                  {!aiAnalysis && !aiLoading && (
                    <button 
                       onClick={getAiAnalysis}
                       className="text-[10px] bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.5)] text-white px-4 py-1.5 rounded-full font-black tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                    >
                      <Activity size={10} /> ANALYZE DUEL
                    </button>
                  )}
                </div>
                
                <div className="flex-1 flex flex-col justify-center">
                   {aiLoading ? (
                     <div className="flex flex-col items-center gap-4 py-8">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(59,130,246,0.6)]" />
                        <p className="text-[10px] text-blue-400/80 animate-pulse font-black tracking-widest uppercase">Querying Strategy Engine...</p>
                     </div>
                   ) : aiAnalysis ? (
                     <div className="text-[13px] text-zinc-300 leading-relaxed font-medium whitespace-pre-wrap h-[200px] overflow-y-auto custom-scrollbar pr-2">
                        {aiAnalysis.replace(/\*\*/g, '')}
                     </div>
                   ) : (
                     <div className="flex flex-col items-center gap-6 py-8 text-center opacity-40 hover:opacity-100 transition-opacity">
                        <Activity size={48} className="text-blue-500/50" />
                        <p className="text-[10px] text-blue-400 max-w-[220px] font-black uppercase tracking-widest drop-shadow-md">Select laps and generate a pro-level technical comparison</p>
                     </div>
                   )}
                </div>
            </div>
          </div>

          {/* Performance Delta Gap */}
          <div className="bg-zinc-900/40 backdrop-blur-xl shadow-2xl rounded-3xl border border-white/10 p-5 shrink-0">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-[13px] font-black text-zinc-300 uppercase tracking-tighter flex items-center gap-2">
                   <Clock size={16} className="text-zinc-400" />
                   Speed Delta (km/h)
                </h3>
                <div className="flex gap-4 text-[10px] font-bold">
                   <span className="text-blue-400">+{d1Name} ADVANTAGE</span>
                   <span className="text-red-400">+{d2Name} ADVANTAGE</span>
                </div>
             </div>
             <div className="h-[100px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.map(p => ({ ...p, gap: p.speed1 - p.speed2 }))} syncId="telemetry" margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="time" hide />
                    <YAxis stroke="#52525b" fontSize={10} axisLine={false} tickLine={false} width={40} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }}
                      labelStyle={{ display: 'none' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="gap" 
                      stroke="#71717a" 
                      strokeWidth={1} 
                      fill="rgba(113, 113, 122, 0.1)" 
                      dot={false}
                      className="opacity-40"
                    />
                  </LineChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 shrink-0">
            {/* Throttle & Brake */}
            <div className="group bg-zinc-900/40 backdrop-blur-xl shadow-2xl rounded-3xl border border-white/10 p-5 flex flex-col min-h-[250px]">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-[13px] font-black text-zinc-300 uppercase tracking-tighter">Throttle (%) & Brake</h3>
                </div>
                <button onClick={() => setExpandedChart('throttle')} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white">
                  <Maximize2 size={16} />
                </button>
              </div>
              <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} syncId="telemetry" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" strokeOpacity={0.4} vertical={false} />
                    <XAxis dataKey="time" type="number" domain={['dataMin', 'dataMax']} hide />
                    <YAxis domain={[-5, 105]} stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} width={40} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                      labelStyle={{ display: 'none' }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Line type="monotone" dataKey="throttle1" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={false} name={`Thr. ${d1Name}`} />
                    <Line type="monotone" dataKey="throttle2" stroke="#ef4444" strokeWidth={2.5} dot={false} activeDot={false} name={`Thr. ${d2Name}`} />
                    <Line type="stepAfter" dataKey="brake1" stroke="#60a5fa" strokeDasharray="4 4" strokeWidth={2.5} dot={false} activeDot={false} name={`Brk. ${d1Name}`} />
                    <Line type="stepAfter" dataKey="brake2" stroke="#f87171" strokeDasharray="4 4" strokeWidth={2.5} dot={false} activeDot={false} name={`Brk. ${d2Name}`} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* RPM & Gear */}
            <div className="group bg-zinc-900/40 backdrop-blur-xl shadow-2xl rounded-3xl border border-white/10 p-5 flex flex-col min-h-[250px]">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-[13px] font-black text-zinc-300 uppercase tracking-tighter">RPM & Gear</h3>
                </div>
                <button onClick={() => setExpandedChart('rpm')} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white">
                  <Maximize2 size={16} />
                </button>
              </div>
              <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} syncId="telemetry" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" strokeOpacity={0.4} vertical={false} />
                    <XAxis dataKey="time" type="number" domain={['dataMin', 'dataMax']} stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}s`} />
                    <YAxis yAxisId="left" domain={['auto', 'auto']} stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} width={40} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 9]} stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} width={20} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                      labelStyle={{ color: '#a1a1aa', fontSize: '12px', marginBottom: '4px' }}
                      labelFormatter={(label) => `Time: ${label}s`}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Line yAxisId="left" type="monotone" dataKey="rpm1" stroke="#3b82f6" strokeWidth={1.5} dot={false} activeDot={false} name={`RPM ${d1Name}`} />
                    <Line yAxisId="left" type="monotone" dataKey="rpm2" stroke="#ef4444" strokeWidth={1.5} dot={false} activeDot={false} name={`RPM ${d2Name}`} />
                    <Line yAxisId="right" type="stepAfter" dataKey="gear1" stroke="#93c5fd" strokeWidth={2.5} dot={false} activeDot={false} name={`Gear ${d1Name}`} />
                    <Line yAxisId="right" type="stepAfter" dataKey="gear2" stroke="#fca5a5" strokeWidth={2.5} dot={false} activeDot={false} name={`Gear ${d2Name}`} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center border-2 border-dashed border-zinc-800 rounded-2xl">
          <div className="text-center">
            {loading ? (
              <F1LoadingLights />
            ) : (
              <Activity size={48} className="mx-auto text-zinc-700 mb-4" />
            )}
            <h3 className="text-xl font-medium text-zinc-300">
              {loading ? "Fetching Telemetry..." : "No Telemetry Data"}
            </h3>
            <p className="text-zinc-500 mt-2 max-w-sm">
              {loading ? "Downloading high-resolution car data from OpenF1 API." : "Select parameters and click Analyze to load comparative telemetry data."}
            </p>
          </div>
        </div>
      )}

      {/* Expanded Chart Modal */}
      {expandedChart && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 lg:p-12 transition-all">
          <div className="bg-zinc-950 border border-white/10 shadow-2xl rounded-3xl p-6 lg:p-10 w-full h-full max-h-[90vh] flex flex-col relative">
            <button 
               onClick={() => setExpandedChart(null)} 
               className="absolute top-4 right-4 lg:top-8 lg:right-8 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 p-3 rounded-full transition-colors z-10"
            >
              <X size={24} />
            </button>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl lg:text-3xl font-black text-zinc-100 uppercase tracking-tighter">
                 {expandedChart === 'speed' && 'Speed Trace Details'}
                 {expandedChart === 'throttle' && 'Throttle & Brake Details'}
                 {expandedChart === 'rpm' && 'RPM & Gear Details'}
                 {expandedChart === 'delta' && 'Speed Delta Details'}
              </h2>
            </div>
            <div className="flex-1 w-full min-h-0">
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={expandedChart === 'delta' ? data.map(p => ({ ...p, gap: p.speed1 - p.speed2 })) : data} syncId="telemetry" margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#27272a" strokeOpacity={0.6} vertical={false} />
                   <XAxis dataKey="time" type="number" domain={['dataMin', 'dataMax']} stroke="#71717a" fontSize={14} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}s`} />
                   
                   {expandedChart === 'speed' && (
                     <>
                        <YAxis domain={['auto', 'auto']} stroke="#a1a1aa" fontSize={14} tickLine={false} axisLine={false} width={60} />
                        <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }} itemStyle={{ fontSize: '16px', fontWeight: 'bold' }} labelStyle={{ color: '#a1a1aa', fontSize: '14px', marginBottom: '8px' }} />
                        <Legend verticalAlign="top" height={50} iconType="circle" wrapperStyle={{ fontSize: '14px' }} />
                        <Line type="monotone" dataKey="speed1" stroke="#3b82f6" strokeWidth={3} dot={false} name={d1Name} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="speed2" stroke="#ef4444" strokeWidth={3} dot={false} name={d2Name} activeDot={{ r: 6 }} />
                     </>
                   )}

                   {expandedChart === 'throttle' && (
                     <>
                        <YAxis domain={[-5, 105]} stroke="#a1a1aa" fontSize={14} tickLine={false} axisLine={false} width={60} />
                        <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }} itemStyle={{ fontSize: '16px', fontWeight: 'bold' }} labelStyle={{ color: '#a1a1aa', fontSize: '14px', marginBottom: '8px' }} />
                        <Legend verticalAlign="top" height={50} iconType="circle" wrapperStyle={{ fontSize: '14px' }} />
                        <Line type="monotone" dataKey="throttle1" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} name={`Thr. ${d1Name}`} />
                        <Line type="monotone" dataKey="throttle2" stroke="#ef4444" strokeWidth={3} dot={false} activeDot={{ r: 6 }} name={`Thr. ${d2Name}`} />
                        <Line type="stepAfter" dataKey="brake1" stroke="#60a5fa" strokeDasharray="5 5" strokeWidth={3} dot={false} activeDot={{ r: 6 }} name={`Brk. ${d1Name}`} />
                        <Line type="stepAfter" dataKey="brake2" stroke="#f87171" strokeDasharray="5 5" strokeWidth={3} dot={false} activeDot={{ r: 6 }} name={`Brk. ${d2Name}`} />
                     </>
                   )}

                   {expandedChart === 'rpm' && (
                     <>
                        <YAxis yAxisId="left" domain={['auto', 'auto']} stroke="#a1a1aa" fontSize={14} tickLine={false} axisLine={false} width={60} />
                        <YAxis yAxisId="right" orientation="right" domain={[0, 9]} stroke="#a1a1aa" fontSize={14} tickLine={false} axisLine={false} width={40} />
                        <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }} itemStyle={{ fontSize: '16px', fontWeight: 'bold' }} labelStyle={{ color: '#a1a1aa', fontSize: '14px', marginBottom: '8px' }} />
                        <Legend verticalAlign="top" height={50} iconType="circle" wrapperStyle={{ fontSize: '14px' }} />
                        <Line yAxisId="left" type="monotone" dataKey="rpm1" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 6 }} name={`RPM ${d1Name}`} />
                        <Line yAxisId="left" type="monotone" dataKey="rpm2" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 6 }} name={`RPM ${d2Name}`} />
                        <Line yAxisId="right" type="stepAfter" dataKey="gear1" stroke="#93c5fd" strokeWidth={3.5} dot={false} activeDot={{ r: 6 }} name={`Gear ${d1Name}`} />
                        <Line yAxisId="right" type="stepAfter" dataKey="gear2" stroke="#fca5a5" strokeWidth={3.5} dot={false} activeDot={{ r: 6 }} name={`Gear ${d2Name}`} />
                     </>
                   )}
                   
                   {expandedChart === 'delta' && (
                     <>
                        <YAxis domain={['auto', 'auto']} stroke="#a1a1aa" fontSize={14} tickLine={false} axisLine={false} width={60} />
                        <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }} itemStyle={{ fontSize: '16px', fontWeight: 'bold' }} labelStyle={{ color: '#a1a1aa', fontSize: '14px', marginBottom: '8px' }} />
                        <Line type="monotone" dataKey="gap" stroke="#71717a" strokeWidth={2} fill="rgba(113, 113, 122, 0.2)" dot={false} className="opacity-80" />
                     </>
                   )}
                 </LineChart>
               </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
