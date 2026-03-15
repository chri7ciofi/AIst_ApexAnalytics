import { Loader2, Play, Calendar, Flag, Users } from 'lucide-react';
import type { Meeting, Session, Driver } from '../types';

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
  hideMeeting?: boolean; // Added hideMeeting prop

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
  hideMeeting = false, // Destructured and given a default value
}: RaceSelectorProps) {

  const isDisabled = loading || loadingOptions;

  return (
    <div className="bg-zinc-900/60 p-2.5 rounded-2xl border border-zinc-800/80 backdrop-blur-md shadow-lg flex flex-col xl:flex-row gap-2.5 w-full relative z-10">
      {error && (
        <div className="absolute -top-12 left-0 right-0 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 animate-fade-in-up">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-2.5 flex-1 p-0.5">
        {/* Event Group */}
        <div className="flex flex-1 bg-zinc-950/50 rounded-xl justify-stretch border border-zinc-800/60 hover:border-zinc-700 focus-within:border-zinc-500 transition-colors">
          <div className="flex items-center pl-3 pr-1 text-zinc-500 shrink-0"><Calendar size={16} /></div>
          <select
            value={year}
            onChange={e => setYear(e.target.value)}
            disabled={isDisabled}
            className="bg-transparent text-sm font-semibold focus:outline-none py-2.5 px-2 cursor-pointer appearance-none shrink-0"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="2022">2022</option>
          </select>
          {!hideMeeting && <div className="w-px h-5 bg-zinc-800 self-center mx-1"></div>}
          {!hideMeeting && (
            <select
              value={meetingKey}
              onChange={e => setMeetingKey(e.target.value)}
              disabled={isDisabled || meetings.length === 0}
              className="bg-transparent text-sm font-semibold focus:outline-none py-2.5 pl-2 pr-6 appearance-none flex-1 truncate cursor-pointer w-[120px] md:w-auto"
            >
              {meetings.length === 0 && <option value="">No meetings</option>}
              {meetings.map(m => (
                <option key={m.meeting_key} value={m.meeting_key}>{m.meeting_name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Session Group */}
        {!hideMeeting && (
          <div className="flex bg-zinc-950/50 rounded-xl justify-stretch border border-zinc-800/60 hover:border-zinc-700 focus-within:border-zinc-500 transition-colors xl:w-48">
            <div className="flex items-center pl-3 pr-1 text-zinc-500 shrink-0"><Flag size={16} /></div>
            <select
              value={sessionKey}
              onChange={e => setSessionKey(e.target.value)}
              disabled={isDisabled || sessions.length === 0}
              className="bg-transparent text-sm font-semibold focus:outline-none py-2.5 pl-2 pr-8 appearance-none flex-1 cursor-pointer w-full truncate"
            >
              {sessions.length === 0 && <option value="">No sessions</option>}
              {sessions.map(s => (
                <option key={s.session_key} value={s.session_key}>{s.session_name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Drivers Group */}
        <div className="flex bg-zinc-950/50 rounded-xl justify-stretch border border-zinc-800/60 hover:border-zinc-700 focus-within:border-zinc-500 transition-colors xl:w-[280px]">
          <div className="flex items-center pl-3 pr-1 text-zinc-500 shrink-0"><Users size={16} /></div>
          <select
            value={driver1}
            onChange={e => setDriver1(e.target.value)}
            disabled={isDisabled || drivers.length === 0}
            className="bg-transparent text-sm font-bold text-blue-400 focus:outline-none py-2.5 pl-2 pr-5 appearance-none flex-1 cursor-pointer w-[80px]"
          >
            {drivers.length === 0 && <option value="">---</option>}
            {drivers.map(d => (
              <option key={`d1-${d.driver_number}`} value={d.driver_number}>{d.name_acronym} ({d.driver_number})</option>
            ))}
          </select>
          
          <span className="text-[10px] font-black italic text-zinc-600 self-center px-1">VS</span>

          <select
            value={driver2}
            onChange={e => setDriver2(e.target.value)}
            disabled={isDisabled || drivers.length === 0}
            className="bg-transparent text-sm font-bold text-red-500 focus:outline-none py-2.5 pl-2 pr-5 appearance-none flex-1 cursor-pointer text-right w-[80px]"
            dir="rtl"
          >
            {drivers.length === 0 && <option value="">---</option>}
            {drivers.map(d => (
              <option key={`d2-${d.driver_number}`} value={d.driver_number}>{d.name_acronym} ({d.driver_number})</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={onAnalyze}
        disabled={analyzeDisabled || isDisabled || !sessionKey || !driver1 || !driver2}
        className="h-[46px] bg-red-600 hover:bg-red-500 text-white disabled:bg-zinc-800 disabled:text-zinc-500 px-6 rounded-xl text-sm font-bold transition-all flex items-center justify-center shadow-lg hover:shadow-red-500/20 disabled:shadow-none shrink-0 border border-red-500/50 disabled:border-transparent mt-2 xl:mt-0"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} className="mr-2" />}
        {loading ? '' : analyzeLabel}
      </button>
    </div>
  );
}
