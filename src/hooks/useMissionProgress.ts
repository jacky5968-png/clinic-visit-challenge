import { useCallback, useEffect, useState } from 'react';
import {
  MISSION_STORAGE_KEY,
  parseMissionProgress,
  recordMissionCompletion,
  type MissionCompletion,
  type MissionProgress,
} from '../engine/missionProgress';
export function useMissionProgress() {
  const [progress, setProgress] = useState<MissionProgress>(() => {
    try {
      return parseMissionProgress(localStorage.getItem(MISSION_STORAGE_KEY));
    } catch {
      return [];
    }
  });
  const [storageAvailable, setStorageAvailable] = useState(true);
  useEffect(() => {
    try {
      localStorage.setItem(
        MISSION_STORAGE_KEY,
        JSON.stringify({ version: 1, completed: progress }),
      );
      setStorageAvailable(true);
    } catch {
      setStorageAvailable(false);
    }
  }, [progress]);
  const complete = useCallback((record: MissionCompletion) => {
    setProgress((current) => recordMissionCompletion(current, record));
  }, []);
  return { progress, complete, storageAvailable };
}
