import { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Crown, Loader2, AlertTriangle, ChevronRight, Calendar, Flag } from 'lucide-react';
import axios from 'axios';
import { ErgastResponse, ErgastDriverStanding, ErgastConstructorStanding } from '../types';

const nationalityToCode: Record<string, string> = {
  British: 'gb', Dutch: 'nl', Spanish: 'es', Monegasque: 'mc', German: 'de',
  Mexican: 'mx', Australian: 'au', Finnish: 'fi', French: 'fr', Canadian: 'ca',
  Japanese: 'jp', Thai: 'th', Chinese: 'cn', Danish: 'dk', American: 'us',
  Italian: 'it', Brazilian: 'br', 'New Zealander': 'nz', Austrian: 'at',
  Swiss: 'ch', Belgian: 'be', Argentine: 'ar', Swedish: 'se', Polish: 'pl',
  Russian: 'ru', Indonesian: 'id', Israeli: 'il', Indian: 'in', Colombian: 'co',
  Venezuelan: 've', Portuguese: 'pt', Irish: 'ie', Norwegian: 'no',
};

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
  const [year, setYear] = useState('2026');
  const [round, setRound] = useState('final');
  const [races, setRaces] = useState<any[]>([]);
  const [view, setView] = useState<'drivers' | 'constructors'>('drivers');
  const [driverStandings, setDriverStandings] = useState<DriverStanding[]>([]);
  const [constructorStandings, setConstructorStandings] = useState<ConstructorStanding[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch races for the selected year
  useEffect(() => {
    const fetchRaces = async () => {
      try {
        const res = await axios.get(`https://api.jolpi.ca/ergast/f1/${year}.json`);
        const raceList = res.data.MRData.RaceTable.Races;
        // Filter by date to only include past races for current year
        const pastRaces = raceList.filter((r: any) => new Date(`${r.date}T${r.time || '00:00:00Z'}`).getTime() < Date.now());
        setRaces(pastRaces);
        setRound('final'); // Reset to final standings when year changes
      } catch (err) {
        console.error('Failed to fetch races:', err);
        setRaces([]);
      }
    };
    fetchRaces();
  }, [year]);

  // Fetch standings for the selected year and round
  useEffect(() => {
    const fetchStandings = async () => {
      setLoading(true);
      setError(null);
      try {
        let driverUrl = `https://api.jolpi.ca/ergast/f1/${year}/driverStandings.json`;
        let constructorUrl = `https://api.jolpi.ca/ergast/f1/${year}/constructorStandings.json`;

        if (round !== 'final') {
          driverUrl = `https://api.jolpi.ca/ergast/f1/${year}/${round}/driverStandings.json`;
          constructorUrl = `https://api.jolpi.ca/ergast/f1/${year}/${round}/constructorStandings.json`;
        }

        const [driverRes, constructorRes] = await Promise.all([
          axios.get<ErgastResponse<ErgastDriverStanding>>(driverUrl),
          axios.get<ErgastResponse<ErgastConstructorStanding>>(constructorUrl)
        ]);

        const drvData = driverRes.data.MRData.StandingsTable.StandingsLists[0]?.DriverStandings || [];
        const conData = constructorRes.data.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings || [];

        // Check if champion logic
        const isFinished = (year < new Date().getFullYear().toString() || (year === new Date().getFullYear().toString() && new Date().getMonth() === 11)) && round === 'final';

        const dStandings: DriverStanding[] = drvData.map(d => ({
          position: parseInt(d.position),
          driver_number: parseInt(d.Driver.permanentNumber || '0'),
          full_name: `${d.Driver.givenName} ${d.Driver.familyName}`,
          team_name: d.Constructors[0]?.name || 'Unknown',
          points: parseFloat(d.points),
          wins: parseInt(d.wins),
          country_code: d.Driver.nationality,
          isChampion: isFinished && d.position === '1'
        }));

        const cStandings: ConstructorStanding[] = conData.map(c => ({
          position: parseInt(c.position),
          team_name: c.Constructor.name,
          points: parseFloat(c.points),
          wins: parseInt(c.wins),
          isChampion: isFinished && c.position === '1'
        }));

        setDriverStandings(dStandings);
        setConstructorStandings(cStandings);

      } catch (err) {
        console.error('Failed to fetch Ergast standings:', err);
        // Only set error if it is not the current early season
        if (year !== new Date().getFullYear().toString()) {
           setError(`Impossibile caricare le classifiche per l'annata/gara selezionata.`);
        }
        setDriverStandings([]);
        setConstructorStandings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchStandings();
  }, [year, round]);

  const getPositionBadge = (pos: number) => {
    if (pos === 1) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    if (pos === 2) return 'bg-zinc-400/20 text-zinc-300 border-zinc-400/30';
    if (pos === 3) return 'bg-orange-600/20 text-orange-400 border-orange-600/30';
    return 'bg-zinc-800 text-zinc-400 border-zinc-700';
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start lg:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Championship Standings</h2>
          <p className="text-zinc-400 mt-1">
            {round === 'final' 
              ? `Official FIA World Championship Final Standings for ${year}`
              : `Standings after ${races.find(r => r.round === round)?.raceName || `Round ${round}`} ${year}`
            }
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center">
          
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 gap-0">
            <div className="relative group min-w-[100px]">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-zinc-400 group-focus-within:text-red-500 transition-colors" />
              </div>
              <select
                value={year}
                onChange={e => setYear(e.target.value)}
                disabled={loading}
                className="w-full bg-transparent text-zinc-100 rounded-lg pl-9 pr-6 py-2 text-sm focus:outline-none appearance-none cursor-pointer font-bold border-r border-zinc-800"
              >
                <option className="bg-zinc-900 text-zinc-100" value="2026">2026</option>
                <option className="bg-zinc-900 text-zinc-100" value="2025">2025</option>
                <option className="bg-zinc-900 text-zinc-100" value="2024">2024</option>
                <option className="bg-zinc-900 text-zinc-100" value="2023">2023</option>
                <option className="bg-zinc-900 text-zinc-100" value="2022">2022</option>
              </select>
            </div>

            <div className="relative group min-w-[180px]">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Flag className="h-4 w-4 text-zinc-400 group-focus-within:text-red-500 transition-colors" />
              </div>
              <select
                value={round}
                onChange={e => setRound(e.target.value)}
                disabled={loading || races.length === 0}
                className="w-full bg-transparent text-zinc-100 rounded-lg pl-9 pr-6 py-2 text-sm focus:outline-none appearance-none cursor-pointer font-bold truncate"
              >
                <option className="bg-zinc-900 text-zinc-100 font-bold" value="final">Overall Standings</option>
                {races.map(r => (
                   <option className="bg-zinc-900 text-zinc-100" key={r.round} value={r.round}>
                     Round {r.round} - {r.raceName}
                   </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden h-10 w-full sm:w-auto">
            <button
              onClick={() => setView('drivers')}
              className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold transition-all flex items-center justify-center ${
                view === 'drivers' ? 'bg-red-500/10 text-red-500' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Trophy size={16} className="mr-2" />
              Drivers
            </button>
            <button
              onClick={() => setView('constructors')}
              className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold transition-all flex items-center justify-center ${
                view === 'constructors' ? 'bg-red-500/10 text-red-500' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Award size={16} className="mr-2" />
              Teams
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
           <p className="text-zinc-500 mt-2 max-w-sm">The season {year} has not started yet or data is still being processed.</p>
        </div>
      ) : view === 'drivers' ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
            <table className="w-full">
              <thead className="bg-zinc-950/80 sticky top-0 z-10">
                <tr className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  <th className="px-4 py-4 text-left w-16">Pos</th>
                  <th className="px-4 py-4 text-left">Driver</th>
                  <th className="px-4 py-4 text-left">Team</th>
                  <th className="px-4 py-4 text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {driverStandings.map((standing) => (
                  <tr
                    key={standing.driver_number || standing.full_name}
                    className="border-t border-zinc-800/50 hover:bg-zinc-800/40 transition-colors group"
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
                          src={`https://flagcdn.com/w20/${nationalityToCode[standing.country_code] || 'un'}.png`}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {constructorStandings.map((standing) => (
              <div
                key={standing.team_name}
                className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5 flex items-center justify-between hover:bg-zinc-800/60 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className={`inline-flex items-center justify-center w-12 h-12 rounded-xl text-xl font-bold border ${getPositionBadge(standing.position)}`}>
                    {standing.position}
                  </span>
                  <div>
                    <p className="font-bold text-xl text-zinc-100 flex items-center gap-2">
                      {standing.isChampion && <Crown size={20} className="text-yellow-500" />}
                      {standing.team_name}
                    </p>
                    <p className="text-sm text-zinc-500 mt-1 flex gap-2 items-center">
                       {standing.wins > 0 && <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-md text-xs font-bold">{standing.wins} win{standing.wins !== 1 ? 's' : ''}</span>}
                    </p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-3xl font-mono font-black text-white px-2">{standing.points}</p>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Points</p>
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
