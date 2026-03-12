import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Loader2, Activity, Clock } from 'lucide-react';
import axios from 'axios';
import { useRaceSelector } from '../hooks/useRaceSelector';
import RaceSelector from '../components/RaceSelector';
import type { TelemetryPoint, CarData, LapData } from '../types';

export default function Telemetry() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TelemetryPoint[]>([]);
  const [laps1, setLaps1] = useState<LapData[]>([]);
  const [laps2, setLaps2] = useState<LapData[]>([]);
  const [driver1LapReq, setDriver1LapReq] = useState<string>('fastest');
  const [driver2LapReq, setDriver2LapReq] = useState<string>('fastest');

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
        setData(mergedData);
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

  const d1Name = selector.d1Info?.name_acronym || selector.driver1;
  const d2Name = selector.d2Info?.name_acronym || selector.driver2;

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
          <div className="flex gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
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
          {/* Speed Chart */}
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 flex flex-col min-h-[350px] shrink-0">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Speed (km/h)</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-2xl">Compares the velocity of both cars over the lap. Higher lines indicate faster speeds on straights or carrying more speed through corners.</p>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} syncId="telemetry" margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="time" type="number" domain={['dataMin', 'dataMax']} hide />
                  <YAxis domain={['auto', 'auto']} padding={{ top: 20, bottom: 20 }} stroke="#52525b" fontSize={12} tickFormatter={(val) => `${val}`} width={40} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    labelStyle={{ display: 'none' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Line type="monotone" dataKey="speed1" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} name={d1Name} />
                  <Line type="monotone" dataKey="speed2" stroke="#ef4444" strokeWidth={2.5} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} name={d2Name} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Throttle & Brake */}
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 flex flex-col min-h-[350px] shrink-0">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Throttle (%) & Brake</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-2xl">Shows driver inputs. Solid lines represent throttle application (0-100%), while dashed lines indicate when the driver is braking.</p>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} syncId="telemetry" margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="time" type="number" domain={['dataMin', 'dataMax']} hide />
                  <YAxis domain={[0, 100]} padding={{ top: 20, bottom: 20 }} stroke="#52525b" fontSize={12} width={40} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    labelStyle={{ display: 'none' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Line type="stepAfter" dataKey="throttle1" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} name={`Throttle ${d1Name}`} />
                  <Line type="stepAfter" dataKey="throttle2" stroke="#ef4444" strokeWidth={2.5} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} name={`Throttle ${d2Name}`} />
                  <Line type="stepAfter" dataKey="brake1" stroke="#60a5fa" strokeDasharray="4 4" strokeWidth={2.5} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} name={`Brake ${d1Name}`} />
                  <Line type="stepAfter" dataKey="brake2" stroke="#f87171" strokeDasharray="4 4" strokeWidth={2.5} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} name={`Brake ${d2Name}`} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* RPM & Gear */}
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 flex flex-col min-h-[350px] shrink-0">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">RPM & Gear</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-2xl">Engine revolutions per minute (left axis) and the current gear selected (right axis). Helps identify shift points and engine performance.</p>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} syncId="telemetry" margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="time" type="number" domain={['dataMin', 'dataMax']} stroke="#52525b" fontSize={12} tickFormatter={(val) => `${val}s`} />
                  <YAxis yAxisId="left" domain={['auto', 'auto']} padding={{ top: 20, bottom: 20 }} stroke="#52525b" fontSize={12} width={40} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 8]} padding={{ top: 20, bottom: 20 }} stroke="#52525b" fontSize={12} width={20} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    labelStyle={{ color: '#a1a1aa', fontSize: '12px', marginBottom: '4px' }}
                    labelFormatter={(label) => `Time: ${label}s`}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Line yAxisId="left" type="monotone" dataKey="rpm1" stroke="#3b82f6" strokeWidth={1.5} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} name={`RPM ${d1Name}`} />
                  <Line yAxisId="left" type="monotone" dataKey="rpm2" stroke="#ef4444" strokeWidth={1.5} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} name={`RPM ${d2Name}`} />
                  <Line yAxisId="right" type="stepAfter" dataKey="gear1" stroke="#93c5fd" strokeWidth={2.5} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} name={`Gear ${d1Name}`} />
                  <Line yAxisId="right" type="stepAfter" dataKey="gear2" stroke="#fca5a5" strokeWidth={2.5} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} name={`Gear ${d2Name}`} />
                </LineChart>
              </ResponsiveContainer>
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
              {loading ? "Fetching Telemetry..." : "No Telemetry Data"}
            </h3>
            <p className="text-zinc-500 mt-2 max-w-sm">
              {loading ? "Downloading high-resolution car data from OpenF1 API." : "Select parameters and click Analyze to load comparative telemetry data."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
