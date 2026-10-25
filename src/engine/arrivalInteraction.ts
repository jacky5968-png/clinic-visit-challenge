import type { LocationId } from './clinic';

// One automatic interaction per arrival. Closing a dialogue does not rearm it;
// leaving the interaction spot (or arriving at another one) does.
export function createArrivalInteraction() {
  let occupied: LocationId | null = null;
  return (
    location: LocationId | null,
    blocked: boolean,
    interact: (id: LocationId) => boolean | void,
  ) => {
    if (location !== occupied) occupied = null;
    if (!location || location === 'entrance' || blocked || occupied === location) return false;
    if (interact(location) === false) return false;
    occupied = location;
    return true;
  };
}
