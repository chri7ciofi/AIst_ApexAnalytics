import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, Play, Activity } from 'lucide-react';
import axios from 'axios';

export default function Telemetry() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  
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

  // 1. Fetch Meetings (Races) when Year changes
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

  // 2. Fetch Sessions when Meeting changes
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
          setSessionKey(sortedSessions[sortedSessions.length - 1].session_key.toString()); // Default to latest session (usually Race)
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

  // 3. Fetch Drivers when Session changes
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
        // Filter out drivers without a number or acronym
        const validDrivers = res.data.filter((d: any) => d.driver_number && d.name_acronym);
        // Sort by driver number
        const sortedDrivers = validDrivers.sort((a: any, b: any) => a.driver_number - b.driver_number);
        
        // Remove duplicates (sometimes API returns multiple entries for same driver)
        const uniqueDrivers = Array.from(new Map(sortedDrivers.map((item: any) => [item.driver_number, item])).values()) as any[];
        
        setDrivers(uniqueDrivers);
        if (uniqueDrivers.length >= 2) {
          setDriver1(uniqueDrivers[0].driver_number.toString());
          // Try to find a good second driver (e.g., Leclerc or Norris if Verstappen is first)
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

  const fetchTelemetry = async () => {
    if (!sessionKey || !driver1 || !driver2) return;
    
    setLoading(true);
    try {
      // 1. Fetch laps for both drivers to find their fastest laps
      const [laps1Res, laps2Res] = await Promise.all([
        axios.get(`/api/openf1/laps?session_key=${sessionKey}&driver_number=${driver1}`),
        axios.get(`/api/openf1/laps?session_key=${sessionKey}&driver_number=${driver2}`)
      ]);
      
      const validLaps1 = laps1Res.data.filter((l: any) => l.lap_duration != null);
      const validLaps2 = laps2Res.data.filter((l: any) => l.lap_duration != null);
      
      if (validLaps1.length === 0 || validLaps2.length === 0) {
        console.warn("No valid laps found for one or both drivers.");
        setData([]);
        setLoading(false);
        return;
      }
      
      // Find fastest lap for each driver
      const fastestLap1 = validLaps1.reduce((min: any, p: any) => p.lap_duration < min.lap_duration ? p : min, validLaps1[0]);
      const fastestLap2 = validLaps2.reduce((min: any, p: any) => p.lap_duration < min.lap_duration ? p : min, validLaps2[0]);
      
      // Calculate end time for the lap
      const endTime1 = new Date(new Date(fastestLap1.date_start).getTime() + fastestLap1.lap_duration * 1000).toISOString();
      const endTime2 = new Date(new Date(fastestLap2.date_start).getTime() + fastestLap2.lap_duration * 1000).toISOString();
      
      // 2. Fetch car data for the specific time window of the fastest lap
      const [res1, res2] = await Promise.all([
        axios.get(`/api/openf1/car_data?driver_number=${driver1}&session_key=${sessionKey}&date>=${fastestLap1.date_start}&date<=${endTime1}`),
        axios.get(`/api/openf1/car_data?driver_number=${driver2}&session_key=${sessionKey}&date>=${fastestLap2.date_start}&date<=${endTime2}`)
      ]);
      
      const d1 = res1.data;
      const d2 = res2.data;

      if (d1.length > 0 && d2.length > 0) {
        const mergedData = [];
        const maxLength = Math.min(d1.length, d2.length);
        
        for (let i = 0; i < maxLength; i++) {
          mergedData.push({
            distance: i * 10, // Assuming roughly 10m per sample for visualization purposes
            speed1: d1[i]?.speed || 0,
            throttle1: d1[i]?.throttle || 0,
            brake1: d1[i]?.brake || 0,
            gear1: d1[i]?.n_gear || 0,
            rpm1: d1[i]?.rpm || 0,
            
            speed2: d2[i]?.speed || 0,
            throttle2: d2[i]?.throttle || 0,
            brake2: d2[i]?.brake || 0,
            gear2: d2[i]?.n_gear || 0,
            rpm2: d2[i]?.rpm || 0,
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

  const d1Info = drivers.find(d => d.driver_number.toString() === driver1);
  const d2Info = drivers.find(d => d.driver_number.toString() === driver2);

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col space-y-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Historical Telemetry</h2>
          <p className="text-zinc-400 mt-1">Distance-based comparative analysis powered by OpenF1</p>
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

          {/* Meeting (Track) Selection */}
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
            onClick={fetchTelemetry}
            disabled={loading || loadingOptions || !sessionKey || !driver1 || !driver2}
            className="ml-auto bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
          >
            {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Play size={16} className="mr-2" />}
            Analyze
          </button>
        </div>
      </div>

      {data.length > 0 ? (
        <div className="flex-1 grid grid-rows-3 gap-4 overflow-hidden">
          {/* Speed Chart */}
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 flex flex-col">
            <h3 className="text-sm font-bold text-zinc-400 mb-2 uppercase tracking-wider">Speed (km/h)</h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="distance" hide />
                  <YAxis domain={['auto', 'auto']} stroke="#52525b" fontSize={12} tickFormatter={(val) => `${val}`} width={40} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    labelStyle={{ display: 'none' }}
                  />
                  <Line type="monotone" dataKey="speed1" stroke="#3b82f6" strokeWidth={2} dot={false} name={`${d1Info?.name_acronym || driver1}`} />
                  <Line type="monotone" dataKey="speed2" stroke="#ef4444" strokeWidth={2} dot={false} name={`${d2Info?.name_acronym || driver2}`} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Throttle & Brake */}
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 flex flex-col">
            <h3 className="text-sm font-bold text-zinc-400 mb-2 uppercase tracking-wider">Throttle (%) & Brake</h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="distance" hide />
                  <YAxis domain={[0, 100]} stroke="#52525b" fontSize={12} width={40} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    labelStyle={{ display: 'none' }}
                  />
                  <Line type="stepAfter" dataKey="throttle1" stroke="#3b82f6" strokeWidth={2} dot={false} name={`Throttle ${d1Info?.name_acronym || driver1}`} />
                  <Line type="stepAfter" dataKey="throttle2" stroke="#ef4444" strokeWidth={2} dot={false} name={`Throttle ${d2Info?.name_acronym || driver2}`} />
                  <Line type="stepAfter" dataKey="brake1" stroke="#60a5fa" strokeDasharray="4 4" strokeWidth={2} dot={false} name={`Brake ${d1Info?.name_acronym || driver1}`} />
                  <Line type="stepAfter" dataKey="brake2" stroke="#f87171" strokeDasharray="4 4" strokeWidth={2} dot={false} name={`Brake ${d2Info?.name_acronym || driver2}`} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* RPM & Gear */}
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 flex flex-col">
            <h3 className="text-sm font-bold text-zinc-400 mb-2 uppercase tracking-wider">RPM & Gear</h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="distance" stroke="#52525b" fontSize={12} tickFormatter={(val) => `${val}m`} />
                  <YAxis yAxisId="left" domain={['auto', 'auto']} stroke="#52525b" fontSize={12} width={40} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 8]} stroke="#52525b" fontSize={12} width={20} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    labelStyle={{ color: '#a1a1aa', fontSize: '12px', marginBottom: '4px' }}
                    labelFormatter={(label) => `Distance: ${label}m`}
                  />
                  <Line yAxisId="left" type="monotone" dataKey="rpm1" stroke="#3b82f6" strokeWidth={1} dot={false} name={`RPM ${d1Info?.name_acronym || driver1}`} />
                  <Line yAxisId="left" type="monotone" dataKey="rpm2" stroke="#ef4444" strokeWidth={1} dot={false} name={`RPM ${d2Info?.name_acronym || driver2}`} />
                  <Line yAxisId="right" type="stepAfter" dataKey="gear1" stroke="#93c5fd" strokeWidth={2} dot={false} name={`Gear ${d1Info?.name_acronym || driver1}`} />
                  <Line yAxisId="right" type="stepAfter" dataKey="gear2" stroke="#fca5a5" strokeWidth={2} dot={false} name={`Gear ${d2Info?.name_acronym || driver2}`} />
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
