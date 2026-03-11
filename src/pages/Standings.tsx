import { useState, useEffect } from 'react';
import { Trophy, Users, Loader2, ChevronDown, ChevronUp, Minus } from 'lucide-react';
import axios from 'axios';
import type { Driver, Meeting, Session, LapData } from '../types';

interface DriverStanding {
  position: number;
  driver: Driver;
  points: number;
  wins: number;
  podiums: number;
  bestFinish: number;
  team: string;
}

interface ConstructorStanding {
  position: number;
  team: string;
  teamColour: string;
  points: number;
  wins: number;
}

export default function Standings() {
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState('2024');
  const [view, setView] = useState<'drivers' | 'constructors'>('drivers');
  const [driverStandings, setDriverStandings] = useState<DriverStanding[]>([]);
  const [constructorStandings, setConstructorStandings] = useState<ConstructorStanding[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchStandings = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get all meetings for the year
      const meetingsRes = await axios.get(`/api/openf1/meetings?year=${year}`);
      const meetings = (meetingsRes.data as Meeting[]).sort(
        (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
      );

      if (meetings.length === 0) {
        setError('No meetings found for this year.');
        setLoading(false);
        return;
      }

      // Get the last meeting's race session to find the final standings
      const lastMeeting = meetings[meetings.length - 1];
      const sessionsRes = await axios.get(`/api/openf1/sessions?meeting_key=${lastMeeting.meeting_key}`);
      const sessions = (sessionsRes.data as Session[]).sort(
        (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
      );

      // Find the race session
      const raceSession = sessions.find(s => s.session_name === 'Race') || sessions[sessions.length - 1];
      if (!raceSession) {
        setError('No race session found.');
        setLoading(false);
        return;
      }

      // Get drivers for this session
      const driversRes = await axios.get(`/api/openf1/drivers?session_key=${raceSession.session_key}`);
      const drivers = (driversRes.data as Driver[]).filter(d => d.driver_number && d.name_acronym);
      const uniqueDrivers = Array.from(
        new Map(drivers.map(d => [d.driver_number, d])).values()
      );

      // Get position data
      const positionRes = await axios.get(`/api/openf1/position?session_key=${raceSession.session_key}`);
      const positions = positionRes.data as Array<{ driver_number: number; position: number; date: string }>;

      // Get the last position for each driver (final race result)
      const finalPositions = new Map<number, number>();
      positions.forEach(p => {
        if (p.position && p.driver_number) {
          finalPositions.set(p.driver_number, p.position);
        }
      });

      // Build simplified driver standings from the final race positions
      const pointsSystem = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

      const driverStandingsData: DriverStanding[] = uniqueDrivers.map(driver => {
        const pos = finalPositions.get(driver.driver_number) || 99;
        const points = pos <= 10 ? pointsSystem[pos - 1] : 0;

        return {
          position: pos,
          driver,
          points,
          wins: pos === 1 ? 1 : 0,
          podiums: pos <= 3 ? 1 : 0,
          bestFinish: pos,
          team: driver.team_name || 'Unknown',
        };
      }).sort((a, b) => a.position - b.position);

      // Update positions to be sequential
      driverStandingsData.forEach((d, i) => d.position = i + 1);

      setDriverStandings(driverStandingsData);

      // Build constructor standings
      const teamsMap = new Map<string, { points: number; wins: number; colour: string }>();
      driverStandingsData.forEach(d => {
        const existing = teamsMap.get(d.team) || { points: 0, wins: 0, colour: d.driver.team_colour || '666666' };
        existing.points += d.points;
        existing.wins += d.wins;
        teamsMap.set(d.team, existing);
      });

      const constructorData: ConstructorStanding[] = Array.from(teamsMap.entries())
        .map(([team, data], i) => ({
          position: i + 1,
          team,
          teamColour: `#${data.colour}`,
          points: data.points,
          wins: data.wins,
        }))
        .sort((a, b) => b.points - a.points);

      constructorData.forEach((c, i) => c.position = i + 1);
      setConstructorStandings(constructorData);

    } catch (err) {
      console.error("Failed to fetch standings", err);
      setError('Failed to load standings. Try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStandings();
  }, [year]);

  const getPositionBadge = (pos: number) => {
    if (pos === 1) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    if (pos === 2) return 'bg-zinc-400/20 text-zinc-300 border-zinc-400/30';
    if (pos === 3) return 'bg-orange-600/20 text-orange-400 border-orange-600/30';
    return 'bg-zinc-800 text-zinc-400 border-zinc-700';
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Championship Standings</h2>
          <p className="text-zinc-400 mt-1">Final positions from the last race of the selected season</p>
        </div>
        <div className="flex gap-3 items-center">
          <select
            value={year}
            onChange={e => setYear(e.target.value)}
            disabled={loading}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 disabled:opacity-50 transition-all font-medium"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="2022">2022</option>
          </select>
          <div className="flex bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
            <button
              onClick={() => setView('drivers')}
              className={`px-4 py-2.5 text-sm font-bold transition-all ${
                view === 'drivers' ? 'bg-red-500/10 text-red-500' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Trophy size={16} className="inline mr-1.5" />
              Drivers
            </button>
            <button
              onClick={() => setView('constructors')}
              className={`px-4 py-2.5 text-sm font-bold transition-all ${
                view === 'constructors' ? 'bg-red-500/10 text-red-500' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Users size={16} className="inline mr-1.5" />
              Constructors
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 size={48} className="mx-auto text-zinc-700 mb-4 animate-spin" />
            <p className="text-zinc-500">Loading championship data...</p>
          </div>
        </div>
      ) : view === 'drivers' ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
            <table className="w-full">
              <thead className="bg-zinc-950/80 sticky top-0 z-10">
                <tr className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left w-16">Pos</th>
                  <th className="px-4 py-3 text-left">Driver</th>
                  <th className="px-4 py-3 text-left">Team</th>
                  <th className="px-4 py-3 text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {driverStandings.map((standing) => (
                  <tr
                    key={standing.driver.driver_number}
                    className="border-t border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold border ${getPositionBadge(standing.position)}`}>
                        {standing.position}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-1 h-8 rounded-full"
                          style={{ backgroundColor: `#${standing.driver.team_colour || '666666'}` }}
                        />
                        <div>
                          <p className="font-bold text-zinc-100">{standing.driver.name_acronym}</p>
                          <p className="text-xs text-zinc-500">#{standing.driver.driver_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-sm">{standing.team}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono font-bold text-zinc-100">{standing.points}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="space-y-3">
            {constructorStandings.map((standing) => (
              <div
                key={standing.team}
                className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-lg font-bold border ${getPositionBadge(standing.position)}`}>
                    {standing.position}
                  </span>
                  <div
                    className="w-1.5 h-10 rounded-full"
                    style={{ backgroundColor: standing.teamColour }}
                  />
                  <div>
                    <p className="font-bold text-lg text-zinc-100">{standing.team}</p>
                    <p className="text-xs text-zinc-500">{standing.wins} win{standing.wins !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-mono font-bold text-zinc-100">{standing.points}</p>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Points</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
