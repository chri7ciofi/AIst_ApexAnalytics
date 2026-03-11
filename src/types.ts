// === OpenF1 API Types ===

export interface Meeting {
  meeting_key: number;
  meeting_name: string;
  date_start: string;
  gmt_offset?: string;
  year: number;
  location?: string;
  country_name?: string;
  circuit_short_name?: string;
}

export interface Session {
  session_key: number;
  session_name: string;
  date_start: string;
  date_end?: string;
  meeting_key: number;
  session_type?: string;
}

export interface Driver {
  driver_number: number;
  name_acronym: string;
  full_name?: string;
  team_name?: string;
  team_colour?: string;
  country_code?: string;
  headshot_url?: string;
}

export interface LapData {
  lap_number: number;
  lap_duration: number | null;
  date_start: string;
  driver_number: number;
  is_pit_out_lap?: boolean;
  sector_1_duration?: number;
  sector_2_duration?: number;
  sector_3_duration?: number;
}

export interface CarData {
  date: string;
  speed: number;
  throttle: number;
  brake: number;
  n_gear: number;
  rpm: number;
  drs: number;
  driver_number: number;
}

export interface Stint {
  stint_number: number;
  lap_start: number;
  lap_end: number;
  compound: string;
  tyre_age_at_start: number;
  driver_number: number;
}

// === Calendar Types ===

export interface RaceSession {
  name: string;
  date: string;
}

export interface Race {
  round: number;
  name: string;
  circuit: string;
  date: string;
  timezone: string;
  length: number;
  drsZones: number;
  record: string;
  history?: string;
  sessions?: RaceSession[];
}

// === Regulations Types ===

export interface Regulation {
  id: number;
  title: string;
  category: string;
  summary: string;
}

// === Telemetry Merged Data ===

export interface TelemetryPoint {
  time: number;
  distance: number;
  speed1: number;
  throttle1: number;
  brake1: number;
  gear1: number;
  rpm1: number;
  speed2: number;
  throttle2: number;
  brake2: number;
  gear2: number;
  rpm2: number;
}

// === Strategy Chart Data ===

export interface StrategyLapPoint {
  lap: number;
  time1: number | null;
  time2: number | null;
  trend1: number | null;
  trend2: number | null;
}

// === Ergast (Jolpi API) Types ===

export interface ErgastDriver {
  driverId: string;
  permanentNumber: string;
  code: string;
  givenName: string;
  familyName: string;
  dateOfBirth: string;
  nationality: string;
}

export interface ErgastConstructor {
  constructorId: string;
  url: string;
  name: string;
  nationality: string;
}

export interface ErgastDriverStanding {
  position: string;
  positionText: string;
  points: string;
  wins: string;
  Driver: ErgastDriver;
  Constructors: ErgastConstructor[];
}

export interface ErgastConstructorStanding {
  position: string;
  positionText: string;
  points: string;
  wins: string;
  Constructor: ErgastConstructor;
}

export interface ErgastResponse<T> {
  MRData: {
    StandingsTable: {
      season: string;
      StandingsLists: {
        season: string;
        round: string;
        DriverStandings?: T[];
        ConstructorStandings?: T[];
      }[];
    };
  };
}
