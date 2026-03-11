import { Loader2, Play, Calendar, Flag, Users } from 'lucide-react';
import type { Meeting, Session, Driver } from '../types';
import { formatSessionTime } from '../hooks/useRaceSelector';

interface RaceSelectorProps {
  year: string;
  meetingKey: string;
  sessionKey: string;
  driver1: string;
  driver2: string;
  meetings: Meeting[];
  sessions: Session[];
  drivers: Driver[];
  loadingOptions: boolean;
  loading: boolean;
  error: string | null;

  setYear: (year: string) => void;
  setMeetingKey: (key: string) => void;
  setSessionKey: (key: string) => void;
  setDriver1: (driver: string) => void;
  setDriver2: (driver: string) => void;

  onAnalyze: () => void;
  analyzeDisabled?: boolean;
  analyzeLabel?: string;
}

export default function RaceSelector({
  year, meetingKey, sessionKey, driver1, driver2,
  meetings, sessions, drivers,
  loadingOptions, loading, error,
  setYear, setMeetingKey, setSessionKey, setDriver1, setDriver2,
  onAnalyze, analyzeDisabled, analyzeLabel = 'Analyze',
}: RaceSelectorProps) {

  const isDisabled = loading || loadingOptions;

  return (
    <div className="bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800/80 backdrop-blur-sm space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          {error}
        </div>
      )}

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
              disabled={isDisabled}
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
              disabled={isDisabled || meetings.length === 0}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 disabled:opacity-50 transition-all font-medium truncate"
            >
              {meetings.length === 0 && <option value="">No meetings found</option>}
              {meetings.map((m) => (
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
            disabled={isDisabled || sessions.length === 0}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 disabled:opacity-50 transition-all font-medium"
          >
            {sessions.length === 0 && <option value="">No sessions found</option>}
            {sessions.map((s) => {
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
              disabled={isDisabled || drivers.length === 0}
              className="flex-1 bg-blue-950/20 border border-blue-900/50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-blue-400 font-bold disabled:opacity-50 transition-all"
            >
              {drivers.length === 0 && <option value="">No drivers</option>}
              {drivers.map((d) => (
                <option key={`d1-${d.driver_number}`} value={d.driver_number}>
                  {d.name_acronym} ({d.driver_number})
                </option>
              ))}
            </select>

            <span className="text-zinc-600 font-black italic text-sm">VS</span>

            <select
              value={driver2}
              onChange={e => setDriver2(e.target.value)}
              disabled={isDisabled || drivers.length === 0}
              className="flex-1 bg-red-950/20 border border-red-900/50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-red-500 font-bold disabled:opacity-50 transition-all"
            >
              {drivers.length === 0 && <option value="">No drivers</option>}
              {drivers.map((d) => (
                <option key={`d2-${d.driver_number}`} value={d.driver_number}>
                  {d.name_acronym} ({d.driver_number})
                </option>
              ))}
            </select>

            <button
              onClick={onAnalyze}
              disabled={analyzeDisabled || isDisabled || !sessionKey || !driver1 || !driver2}
              className="bg-zinc-100 hover:bg-white text-zinc-900 disabled:bg-zinc-800 disabled:text-zinc-500 px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:shadow-none"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} className="mr-1.5" />}
              {loading ? '' : analyzeLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
