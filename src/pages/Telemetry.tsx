import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Loader2, Play, Activity, Calendar, Flag, Users } from 'lucide-react';
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

  const formatSessionTime = (dateString: string, gmtOffset?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      
      let localStr = '';
      if (gmtOffset) {
        const sign = gmtOffset.startsWith('-') ? -1 : 1;
        const [hours, minutes] = gmtOffset.substring(1).split(':').map(Number);
        const offsetMs = sign * (hours * 60 + minutes) * 60 * 1000;
        const localDate = new Date(date.getTime() + offsetMs);
        localStr = localDate.toISOString().substring(11, 16);
      } else {
        localStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
      }

      const cet = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris', hour12: false });
      return `(${localStr} Local / ${cet} CET)`;
    } catch (e) {
      return '';
    }
  };

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
      // Fetch sequentially to avoid 429 Too Many Requests
      const res1 = await axios.get(`/api/openf1/car_data?driver_number=${driver1}&session_key=${sessionKey}&date>=${fastestLap1.date_start}&date<=${endTime1}`);
      const res2 = await axios.get(`/api/openf1/car_data?driver_number=${driver2}&session_key=${sessionKey}&date>=${fastestLap2.date_start}&date<=${endTime2}`);
      
      const d1 = res1.data;
      const d2 = res2.data;

      if (d1.length > 0 && d2.length > 0) {
        const mergedData = [];
        const startTime1 = new Date(fastestLap1.date_start).getTime();
        const startTime2 = new Date(fastestLap2.date_start).getTime();
        
        let j = 0;
        for (let i = 0; i < d1.length; i++) {
          const relTime1 = new Date(d1[i].date).getTime() - startTime1;
          
          while (j < d2.length - 1) {
            const relTime2 = new Date(d2[j].date).getTime() - startTime2;
            const nextRelTime2 = new Date(d2[j+1].date).getTime() - startTime2;
            
            if (Math.abs(nextRelTime2 - relTime1) <= Math.abs(relTime2 - relTime1)) {
              j++;
            } else {
              break;
            }
          }
          
          const d2Sample = d2[j] || {};
          
          mergedData.push({
            time: Number((relTime1 / 1000).toFixed(2)), // seconds
            distance: i * 10, // Keep distance for compatibility if needed, but time is better
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

  const d1Info = drivers.find(d => d.driver_number.toString() === driver1);
  const d2Info = drivers.find(d => d.driver_number.toString() === driver2);

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col space-y-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Historical Telemetry</h2>
          <p className="text-zinc-400 mt-1">Distance-based comparative analysis powered by OpenF1</p>
        </div>
        
        <div className="bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800/80 backdrop-blur-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
            
            {/* Event Selection */}
            <div className="lg:col-span-5 space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={14} /> Event Details
              </label>
              <div className="flex gap-2">
                <select 
                  value={year} 
                  onChange={e => setYear(e.target.value)} 
                  disabled={loadingOptions || loading}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 disabled:opacity-50 transition-all font-medium"
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                  <option value="2022">2022</option>
                </select>
                <select 
                  value={meetingKey} 
                  onChange={e => setMeetingKey(e.target.value)} 
                  disabled={loadingOptions || loading || meetings.length === 0}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 disabled:opacity-50 transition-all font-medium truncate"
                >
                  {meetings.length === 0 && <option value="">No meetings found</option>}
                  {meetings.map((m: any) => (
                    <option key={m.meeting_key} value={m.meeting_key}>
                      {m.meeting_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Session Selection */}
            <div className="lg:col-span-3 space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Flag size={14} /> Session
              </label>
              <select 
                value={sessionKey} 
                onChange={e => setSessionKey(e.target.value)} 
                disabled={loadingOptions || loading || sessions.length === 0}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 disabled:opacity-50 transition-all font-medium"
              >
                {sessions.length === 0 && <option value="">No sessions found</option>}
                {sessions.map((s: any) => {
                  const selectedMeeting = meetings.find(m => m.meeting_key.toString() === meetingKey);
                  return (
                    <option key={s.session_key} value={s.session_key}>
                      {s.session_name} {formatSessionTime(s.date_start, selectedMeeting?.gmt_offset)}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Driver Comparison & Action */}
            <div className="lg:col-span-4 space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Users size={14} /> Compare Drivers
              </label>
              <div className="flex gap-3 items-center">
                <select 
                  value={driver1} 
                  onChange={e => setDriver1(e.target.value)} 
                  disabled={loadingOptions || loading || drivers.length === 0}
                  className="flex-1 bg-blue-950/20 border border-blue-900/50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-blue-400 font-bold disabled:opacity-50 transition-all"
                >
                  {drivers.length === 0 && <option value="">No drivers</option>}
                  {drivers.map((d: any) => (
                    <option key={`d1-${d.driver_number}`} value={d.driver_number}>
                      {d.name_acronym} ({d.driver_number})
                    </option>
                  ))}
                </select>
                
                <span className="text-zinc-600 font-black italic text-sm">VS</span>
                
                <select 
                  value={driver2} 
                  onChange={e => setDriver2(e.target.value)} 
                  disabled={loadingOptions || loading || drivers.length === 0}
                  className="flex-1 bg-red-950/20 border border-red-900/50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-red-500 font-bold disabled:opacity-50 transition-all"
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
                  className="bg-zinc-100 hover:bg-white text-zinc-900 disabled:bg-zinc-800 disabled:text-zinc-500 px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:shadow-none"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} className="mr-1.5" />}
                  {loading ? '' : 'Analyze'}
                </button>
              </div>
            </div>

          </div>
        </div>
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
                  <Line type="monotone" dataKey="speed1" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} name={`${d1Info?.name_acronym || driver1}`} />
                  <Line type="monotone" dataKey="speed2" stroke="#ef4444" strokeWidth={2.5} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} name={`${d2Info?.name_acronym || driver2}`} />
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
                  <Line type="stepAfter" dataKey="throttle1" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} name={`Throttle ${d1Info?.name_acronym || driver1}`} />
                  <Line type="stepAfter" dataKey="throttle2" stroke="#ef4444" strokeWidth={2.5} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} name={`Throttle ${d2Info?.name_acronym || driver2}`} />
                  <Line type="stepAfter" dataKey="brake1" stroke="#60a5fa" strokeDasharray="4 4" strokeWidth={2.5} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} name={`Brake ${d1Info?.name_acronym || driver1}`} />
                  <Line type="stepAfter" dataKey="brake2" stroke="#f87171" strokeDasharray="4 4" strokeWidth={2.5} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} name={`Brake ${d2Info?.name_acronym || driver2}`} />
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
                  <Line yAxisId="left" type="monotone" dataKey="rpm1" stroke="#3b82f6" strokeWidth={1.5} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} name={`RPM ${d1Info?.name_acronym || driver1}`} />
                  <Line yAxisId="left" type="monotone" dataKey="rpm2" stroke="#ef4444" strokeWidth={1.5} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} name={`RPM ${d2Info?.name_acronym || driver2}`} />
                  <Line yAxisId="right" type="stepAfter" dataKey="gear1" stroke="#93c5fd" strokeWidth={2.5} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} name={`Gear ${d1Info?.name_acronym || driver1}`} />
                  <Line yAxisId="right" type="stepAfter" dataKey="gear2" stroke="#fca5a5" strokeWidth={2.5} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} name={`Gear ${d2Info?.name_acronym || driver2}`} />
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
