import { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Crown, Loader2, AlertTriangle, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { useRaceSelector } from '../hooks/useRaceSelector';
import RaceSelector from '../components/RaceSelector';
import { ErgastResponse, ErgastDriverStanding, ErgastConstructorStanding } from '../types';

interface DriverStanding {
  position: number;
  driver_number: number;
  full_name: string;
  team_name: string;
  points: number;
  wins: number;
  country_code: string;
  headshot_url?: string;
  isChampion?: boolean;
}

interface ConstructorStanding {
  position: number;
  team_name: string;
  points: number;
  wins: number;
  isChampion?: boolean;
}

export default function Standings() {
  const [loading, setLoading] = useState(false);
  const selector = useRaceSelector();
  const [view, setView] = useState<'drivers' | 'constructors'>('drivers');
  const [driverStandings, setDriverStandings] = useState<DriverStanding[]>([]);
  const [constructorStandings, setConstructorStandings] = useState<ConstructorStanding[]>([]);
  const [error, setError] = useState<string | null>(null);

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
          <p className="text-zinc-400 mt-1">Official FIA World Championship Standings for {selector.year}</p>
        </div>
        <div className="flex gap-3 items-center">
          <RaceSelector 
            {...selector} 
            loading={loading} 
            onAnalyze={() => {}} 
            hideMeeting 
          />
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
              <Award size={16} className="inline mr-1.5" />
              Constructors
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
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
      ) : driverStandings.length === 0 && constructorStandings.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-zinc-900/50 rounded-3xl border border-zinc-800/50 p-8 text-center">
           <Trophy size={48} className="text-zinc-700 mb-4" />
           <h3 className="text-xl font-bold text-zinc-300">No Standings Available</h3>
           <p className="text-zinc-500 mt-2 max-w-sm">The season {selector.year} has not started yet or data is still being processed.</p>
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
                    key={standing.driver_number || standing.full_name}
                    className="border-t border-zinc-800/50 hover:bg-zinc-800/30 transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold border ${getPositionBadge(standing.position)}`}>
                        {standing.position}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {standing.isChampion && <Crown size={16} className="text-yellow-500 drop-shadow-md" />}
                        <img 
                          src={`https://flagcdn.com/w20/${standing.country_code.toLowerCase() === 'british' ? 'gb' : standing.country_code.toLowerCase() === 'dutch' ? 'nl' : standing.country_code.toLowerCase() === 'monegasque' ? 'mc' : standing.country_code.toLowerCase() === 'spanish' ? 'es' : 'un'}.png`}
                          alt="flag"
                          className="w-5 h-auto rounded-sm opacity-60 group-hover:opacity-100 transition-opacity"
                          onError={(e: any) => e.target.style.display = 'none'}
                        />
                        <div>
                          <p className="font-bold text-zinc-100 flex items-center gap-2">
                             {standing.full_name}
                          </p>
                          <p className="text-xs text-zinc-500">#{standing.driver_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-sm">{standing.team_name}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-4">
                         {standing.wins > 0 && (
                            <span className="text-xs text-yellow-500/80 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">
                              {standing.wins} Win{standing.wins !== 1 ? 's' : ''}
                            </span>
                         )}
                         <span className="font-mono font-bold text-zinc-100 text-lg w-12">{standing.points}</span>
                      </div>
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
                key={standing.team_name}
                className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-lg font-bold border ${getPositionBadge(standing.position)}`}>
                    {standing.position}
                  </span>
                  <div>
                    <p className="font-bold text-lg text-zinc-100 flex items-center gap-2">
                      {standing.isChampion && <Crown size={18} className="text-yellow-500" />}
                      {standing.team_name}
                    </p>
                    <p className="text-xs text-zinc-500">{standing.wins} win{standing.wins !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-mono font-bold text-zinc-100">{standing.points}</p>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Points</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
