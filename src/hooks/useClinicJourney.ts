import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LocationId, type Point, type ClinicProgress } from '../engine/clinic';
import {
  worldLocations,
  worldRouteMetrics,
  worldToClinic,
  type WorldPoint,
} from '../engine/clinic3d';
import { nearbyLocation, planWalkingRoute } from '../engine/freeWalk';
export interface ClinicJourney {
  from: LocationId;
  to: LocationId;
  points: Point[];
  startedAt: number;
  duration: number;
}
export function useClinicJourney(reduced: boolean) {
  const position = useRef<WorldPoint>({ ...worldLocations.entrance });
  const [location, setLocation] = useState<LocationId>('entrance');
  const [visited, setVisited] = useState<LocationId[]>([]);
  const [journey, setJourney] = useState<ClinicJourney | null>(null);
  const activeJourney = useRef<ClinicJourney | null>(null);
  const [freeRoam, setFreeRoam] = useState(false),
    [manualMoving, setManualMoving] = useState(false),
    [nearby, setNearby] = useState<LocationId | null>('entrance'),
    [routeError, setRouteError] = useState('');
  const finish = useCallback(() => {
    if (!journey || activeJourney.current !== journey) return;
    activeJourney.current = null;
    position.current = { ...worldLocations[journey.to] };
    setLocation(journey.to);
    setNearby(journey.to);
    setVisited((list) => (list.includes(journey.to) ? list : [...list, journey.to]));
    setJourney(null);
  }, [journey]);
  useEffect(() => {
    if (!journey) return;
    const remaining = Math.max(0, journey.duration - (performance.now() - journey.startedAt));
    const timer = window.setTimeout(finish, reduced ? 80 : remaining);
    return () => clearTimeout(timer);
  }, [journey, reduced, finish]);
  const moveTo = (to: LocationId) => {
    if (journey) return;
    try {
      const points = planWalkingRoute(position.current, worldLocations[to]).map(worldToClinic);
      setFreeRoam(false);
      setManualMoving(false);
      setRouteError('');
      const nextJourney = {
        from: location,
        to,
        points,
        startedAt: performance.now(),
        duration: worldRouteMetrics(points).duration,
      };
      activeJourney.current = nextJourney;
      setJourney(nextJourney);
    } catch (error) {
      setRouteError((error as Error).message);
    }
  };
  function beginManual() {
    activeJourney.current = null;
    setJourney(null);
    setFreeRoam(true);
    setRouteError('');
  }
  function interactAt(id: LocationId) {
    if (nearbyLocation(position.current) !== id) return false;
    activeJourney.current = null;
    setJourney(null);
    setLocation(id);
    setManualMoving(false);
    setVisited((list) => (list.includes(id) ? list : [...list, id]));
    return true;
  }
  const progress = useMemo<ClinicProgress>(
    () => ({
      location,
      destination: journey?.to ?? null,
      moving: Boolean(journey),
      visited,
      freeRoam,
      manualMoving,
      nearby,
    }),
    [location, visited, journey, freeRoam, manualMoving, nearby],
  );
  return {
    progress,
    journey,
    position,
    moveTo,
    skip: finish,
    beginManual,
    setManualMoving,
    setNearby,
    interactAt,
    routeError,
  };
}
