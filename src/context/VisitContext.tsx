import { createContext, useContext } from 'react';
import { defaultMission } from '../data/visitMissions';
export const VisitContext = createContext(defaultMission);
export const useVisitMission = () => useContext(VisitContext);
