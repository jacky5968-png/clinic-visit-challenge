import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  initialClinicProgress,
  nodes,
  planClinicRoute,
  routeMetrics,
  sceneTransform,
  type ClinicProgress,
  type LocationId,
  type Point,
} from '../engine/clinic';
import { useReducedMotion } from './useMotion';

interface Journey {
  from: LocationId;
  to: LocationId;
  points: Point[];
}
export function useClinicMovement() {
  const travelerRef = useRef<HTMLDivElement>(null);
  const miniMapPlayerRef = useRef<SVGCircleElement>(null);
  const [location, setLocation] = useState<LocationId>('entrance');
  const [visited, setVisited] = useState<LocationId[]>([]);
  const [journey, setJourney] = useState<Journey | null>(null);
  const [facing, setFacing] = useState(1);
  const reduced = useReducedMotion();
  const finish = useCallback(() => {
    if (!journey) return;
    const last = journey.points.at(-1)!,
      previous = journey.points.at(-2) ?? last;
    setFacing(last.x < previous.x ? -1 : 1);
    setLocation(journey.to);
    setVisited((v) => (v.includes(journey.to) ? v : [...v, journey.to]));
    setJourney(null);
  }, [journey]);
  useEffect(() => {
    if (!journey) return;
    const metrics = routeMetrics(journey.points);
    const element = travelerRef.current;
    if (reduced || !element?.animate) {
      const timer = window.setTimeout(finish, reduced ? 80 : metrics.duration);
      return () => clearTimeout(timer);
    }
    const movement = element.animate(
      journey.points.map((p, i) => ({ transform: sceneTransform(p), offset: metrics.offsets[i] })),
      { duration: metrics.duration, easing: 'linear', fill: 'forwards' },
    );
    const direction = element.querySelector<HTMLElement>('.representative-facing');
    const turns = direction?.animate(
      journey.points.map((p, i) => {
        const next = journey.points[Math.min(i + 1, journey.points.length - 1)];
        const dx = i === journey.points.length - 1 ? p.x - journey.points[i - 1].x : next.x - p.x;
        return {
          transform: `scaleX(${dx < 0 ? -1 : 1})`,
          offset: metrics.offsets[i],
          easing: 'steps(1,end)',
        };
      }),
      { duration: metrics.duration, fill: 'forwards' },
    );
    movement.onfinish = finish;
    const miniMovement = miniMapPlayerRef.current?.animate(
      journey.points.map((p, i) => ({
        cx: `${p.x}px`,
        cy: `${p.y}px`,
        offset: metrics.offsets[i],
      })),
      { duration: metrics.duration, easing: 'linear', fill: 'forwards' },
    );
    return () => {
      movement.onfinish = null;
      movement.cancel();
      turns?.cancel();
      miniMovement?.cancel();
    };
  }, [journey, reduced, finish]);
  const moveTo = (to: LocationId) => {
    if (journey || to === location) return;
    setJourney({ from: location, to, points: planClinicRoute(location, to) });
  };
  const progress = useMemo<ClinicProgress>(
    () => ({
      ...initialClinicProgress,
      location,
      visited,
      moving: Boolean(journey),
      destination: journey?.to ?? null,
    }),
    [location, visited, journey],
  );
  return {
    travelerRef,
    miniMapPlayerRef,
    progress,
    journey,
    moveTo,
    skip: finish,
    facing,
    transform: sceneTransform(nodes[location]),
  };
}
