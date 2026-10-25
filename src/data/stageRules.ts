import type {Product} from '../types';
import type {VisitMission} from './visitMissions';
export function categoryTags(category:string){return category.split(/[|｜]/).map(t=>t.trim()).filter(Boolean);}
export function allowedInStage(product:Product,mission:VisitMission){
 return !product.demo && Boolean(mission.allowedCategories?.some(c=>categoryTags(product.category).includes(c)));
}
