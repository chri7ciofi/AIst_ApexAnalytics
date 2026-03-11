import { useState, useEffect } from 'react';
import axios from 'axios';
import type { Meeting, Session, Driver } from '../types';

interface UseRaceSelectorReturn {
  // State
  year: string;
  meetingKey: string;
  sessionKey: string;
  driver1: string;
  driver2: string;
  meetings: Meeting[];
  sessions: Session[];
  drivers: Driver[];
  loadingOptions: boolean;
  error: string | null;

  // Setters
  setYear: (year: string) => void;
  setMeetingKey: (key: string) => void;
  setSessionKey: (key: string) => void;
  setDriver1: (driver: string) => void;
  setDriver2: (driver: string) => void;

  // Derived
  d1Info: Driver | undefined;
  d2Info: Driver | undefined;
}

export function formatSessionTime(dateString: string, gmtOffset?: string): string {
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
  } catch {
    return '';
  }
}

export function useRaceSelector(): UseRaceSelectorReturn {
  const [year, setYear] = useState('2024');
  const [meetingKey, setMeetingKey] = useState('');
  const [sessionKey, setSessionKey] = useState('');
  const [driver1, setDriver1] = useState('');
  const [driver2, setDriver2] = useState('');

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const [loadingOptions, setLoadingOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch Meetings when Year changes
  useEffect(() => {
    const fetchMeetings = async () => {
      setLoadingOptions(true);
      setError(null);
      try {
        const res = await axios.get(`/api/openf1/meetings?year=${year}`);
        const sortedMeetings = (res.data as Meeting[]).sort(
          (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
        );
        setMeetings(sortedMeetings);
        if (sortedMeetings.length > 0) {
          setMeetingKey(sortedMeetings[0].meeting_key.toString());
        } else {
          setMeetingKey('');
        }
      } catch (err) {
        console.error("Failed to fetch meetings", err);
        setError("Impossibile caricare i meeting. Controlla la connessione.");
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
      setError(null);
      try {
        const res = await axios.get(`/api/openf1/sessions?meeting_key=${meetingKey}`);
        const sortedSessions = (res.data as Session[]).sort(
          (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
        );
        setSessions(sortedSessions);
        if (sortedSessions.length > 0) {
          setSessionKey(sortedSessions[sortedSessions.length - 1].session_key.toString());
        } else {
          setSessionKey('');
        }
      } catch (err) {
        console.error("Failed to fetch sessions", err);
        setError("Impossibile caricare le sessioni.");
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
      setError(null);
      try {
        const res = await axios.get(`/api/openf1/drivers?session_key=${sessionKey}`);
        const validDrivers = (res.data as Driver[]).filter(
          (d) => d.driver_number && d.name_acronym
        );
        const sortedDrivers = validDrivers.sort((a, b) => a.driver_number - b.driver_number);
        const uniqueDrivers = Array.from(
          new Map(sortedDrivers.map((item) => [item.driver_number, item])).values()
        );

        setDrivers(uniqueDrivers);
        if (uniqueDrivers.length >= 2) {
          setDriver1(uniqueDrivers[0].driver_number.toString());
          const secondDriver =
            uniqueDrivers.find((d) => d.driver_number === 16 || d.driver_number === 4) ||
            uniqueDrivers[1];
          setDriver2(secondDriver.driver_number.toString());
        } else if (uniqueDrivers.length === 1) {
          setDriver1(uniqueDrivers[0].driver_number.toString());
          setDriver2('');
        } else {
          setDriver1('');
          setDriver2('');
        }
      } catch (err) {
        console.error("Failed to fetch drivers", err);
        setError("Impossibile caricare i piloti.");
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchDrivers();
  }, [sessionKey]);

  const d1Info = drivers.find((d) => d.driver_number.toString() === driver1);
  const d2Info = drivers.find((d) => d.driver_number.toString() === driver2);

  return {
    year, meetingKey, sessionKey, driver1, driver2,
    meetings, sessions, drivers,
    loadingOptions, error,
    setYear, setMeetingKey, setSessionKey, setDriver1, setDriver2,
    d1Info, d2Info,
  };
}
