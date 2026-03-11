import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, MapPin, Flag, Clock, ChevronRight, Loader2 } from 'lucide-react';
import { format, formatDistanceToNow, isFuture } from 'date-fns';
import axios from 'axios';
import type { Race } from '../types';

export default function Calendar() {
  const [loading, setLoading] = useState(true);
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [countdown, setCountdown] = useState<string>('');

  const formatSessionTime = (dateString: string, trackTimezone?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const local = trackTimezone
        ? date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: trackTimezone, hour12: false })
        : date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
      const cet = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris', hour12: false });
      return `${local} Local / ${cet} CET`;
    } catch {
      return '';
    }
  };

  useEffect(() => {
    const fetchCalendar = async () => {
      try {
        const res = await axios.get('/api/calendar/2026');
        setRaces(res.data);
        setSelectedRace(res.data[0]);
      } catch (error) {
        console.error("Failed to fetch calendar", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCalendar();
  }, []);

  useEffect(() => {
    if (!races.length) return;

    const nextRace = races.find(r => isFuture(new Date(r.date))) || races[0];

    const updateCountdown = () => {
      const distance = formatDistanceToNow(new Date(nextRace.date), { addSuffix: true });
      setCountdown(distance);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [races]);

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">2026 Season Calendar</h2>
          <p className="text-zinc-400 mt-1">Next session: {countdown}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-zinc-500" size={48} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
          {/* Race List */}
          <div className="lg:col-span-1 bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-zinc-800 bg-zinc-950/50">
              <h3 className="font-bold flex items-center text-zinc-300">
                <CalendarIcon className="mr-2" size={18} />
                {races.length} Rounds
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {races.map((race) => (
                <button
                  key={race.round}
                  onClick={() => setSelectedRace(race)}
                  className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center justify-between group ${
                    selectedRace?.round === race.round
                      ? 'bg-red-500/10 border border-red-500/20 text-red-500'
                      : 'hover:bg-zinc-800 text-zinc-400 border border-transparent'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-70">Round {race.round}</p>
                    <p className={`font-medium ${selectedRace?.round === race.round ? 'text-red-400' : 'text-zinc-200'}`}>{race.name}</p>
                    <p className="text-xs mt-1 flex items-center opacity-70">
                      <Clock size={12} className="mr-1" />
                      {format(new Date(race.date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <ChevronRight size={18} className={`opacity-0 group-hover:opacity-100 transition-opacity ${selectedRace?.round === race.round ? 'opacity-100' : ''}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Track Details */}
          {selectedRace && (
            <div className="lg:col-span-2 bg-zinc-900 rounded-2xl border border-zinc-800 p-6 lg:p-8 flex flex-col overflow-y-auto custom-scrollbar">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-8 gap-4">
                <div>
                  <p className="text-red-500 font-bold tracking-wider uppercase text-sm mb-2">Round {selectedRace.round}</p>
                  <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-2">{selectedRace.name}</h2>
                  <p className="text-lg lg:text-xl text-zinc-400 flex items-center">
                    <MapPin className="mr-2" size={20} />
                    {selectedRace.circuit}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-sm text-zinc-500 uppercase tracking-wider mb-1">Race Date</p>
                  <p className="text-xl lg:text-2xl font-mono font-bold">{format(new Date(selectedRace.date), 'dd MMM yyyy')}</p>
                  <p className="text-zinc-400 font-mono text-sm">{formatSessionTime(selectedRace.date, selectedRace.timezone)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 lg:gap-6 mb-8">
                <div className="bg-zinc-950 p-4 lg:p-6 rounded-2xl border border-zinc-800">
                  <p className="text-xs lg:text-sm text-zinc-500 uppercase tracking-wider mb-2">Circuit Length</p>
                  <p className="text-2xl lg:text-3xl font-mono font-bold text-zinc-100">{selectedRace.length} <span className="text-base lg:text-lg text-zinc-500">km</span></p>
                </div>
                <div className="bg-zinc-950 p-4 lg:p-6 rounded-2xl border border-zinc-800">
                  <p className="text-xs lg:text-sm text-zinc-500 uppercase tracking-wider mb-2">DRS Zones</p>
                  <p className="text-2xl lg:text-3xl font-mono font-bold text-zinc-100">{selectedRace.drsZones}</p>
                </div>
                <div className="bg-zinc-950 p-4 lg:p-6 rounded-2xl border border-zinc-800">
                  <p className="text-xs lg:text-sm text-zinc-500 uppercase tracking-wider mb-2">Lap Record</p>
                  <p className="text-sm lg:text-lg font-mono font-bold text-zinc-100 leading-tight">{selectedRace.record}</p>
                </div>
              </div>

              {selectedRace.sessions && selectedRace.sessions.length > 0 && (
                <div className="bg-zinc-950 p-4 lg:p-6 rounded-2xl border border-zinc-800 mb-8">
                  <h3 className="text-lg font-bold text-zinc-200 mb-4 flex items-center">
                    <Clock className="mr-2 text-red-500" size={20} />
                    Weekend Schedule
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
                    {selectedRace.sessions.map((session, idx) => {
                      const sessionDate = new Date(session.date);
                      const localTime = selectedRace.timezone
                        ? sessionDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: selectedRace.timezone, hour12: false })
                        : sessionDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
                      const cetTime = sessionDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris', hour12: false });
                      const dayName = selectedRace.timezone
                        ? sessionDate.toLocaleDateString('en-GB', { weekday: 'long', timeZone: selectedRace.timezone })
                        : sessionDate.toLocaleDateString('en-GB', { weekday: 'long' });

                      return (
                        <div key={idx} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex justify-between items-center">
                          <div>
                            <p className="font-bold text-zinc-200">{session.name}</p>
                            <p className="text-xs text-zinc-500 uppercase tracking-wider">{dayName}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-mono text-zinc-300">{localTime} <span className="text-xs text-zinc-500">Local</span></p>
                            <p className="text-sm font-mono text-zinc-400">{cetTime} <span className="text-xs text-zinc-600">CET</span></p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedRace.history && (
                <div className="bg-zinc-950 p-4 lg:p-6 rounded-2xl border border-zinc-800 flex-1">
                  <h3 className="text-lg font-bold text-zinc-200 mb-3 flex items-center">
                    <Flag className="mr-2 text-red-500" size={20} />
                    Historical Context
                  </h3>
                  <p className="text-zinc-400 leading-relaxed">
                    {selectedRace.history}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
