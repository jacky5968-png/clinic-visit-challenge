import { useEffect, useRef } from 'react';
import type { LocationId } from '../engine/clinic';
import { createArrivalInteraction } from '../engine/arrivalInteraction';

export function useArrivalInteraction(
  location: LocationId | null,
  blocked: boolean,
  interact: (id: LocationId) => boolean | void,
) {
  const arrive = useRef(createArrivalInteraction());
  useEffect(() => {
    arrive.current(location, blocked, interact);
  }, [location, blocked, interact]);
}
