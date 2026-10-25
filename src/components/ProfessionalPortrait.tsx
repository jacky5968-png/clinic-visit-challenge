import { examinerAppearance, examinerRole, roleLabel } from '../data/characterRoles';
import { useVisitMission } from '../context/VisitContext';
export function ProfessionalPortrait() {
  const mission=useVisitMission(),role=examinerRole(mission),appearance=examinerAppearance(mission);
  const coat='#'+appearance.coat.toString(16).padStart(6,'0');
  return <svg viewBox="0 0 180 300" role="img" aria-label={roleLabel(role)+'人物'} style={{width:'100%',height:'100%'}}>
    <ellipse cx="90" cy="282" rx="45" ry="10" fill="#2b4555" opacity=".12"/>
    <path d="M61 198H86L83 275H62Z M94 198H119L118 275H98Z" fill="#304755"/>
    <path d="M58 273H84V285H52Q49 278 58 273 M98 273H119L128 281V285H98Z" fill="#1d3441"/>
    <path d="M57 101Q90 82 123 101L132 207Q90 224 48 207Z" fill={coat}/>
    <path d="M74 96L90 112L106 96L104 155H77Z" fill="#fffdf4"/>
    {role==='supervisor'?<><path d="M86 111H94L98 162L90 175L82 162Z" fill="#c78b43"/><path d="M73 99L59 116L81 163L85 122Z M107 99L121 116L99 163L95 122Z" fill="#4b657e"/><path d="M59 136H74V141H59Z" fill="#fff8e8"/></>:<><path d="M75 97L90 113L105 97L101 124H79Z" fill="#2b9d88"/><rect x="107" y="129" width="14" height="20" rx="2" fill="#deeee8"/><rect x="110" y="132" width="8" height="4" fill="#168a76"/></>}
    <path d="M56 110Q39 116 33 185" stroke={coat} strokeWidth="20" strokeLinecap="round"/><path d="M123 110Q139 126 145 185" stroke={coat} strokeWidth="20" strokeLinecap="round"/>
    <path d="M33 185L31 199 M145 185L147 199" stroke="#d7ae8b" strokeWidth="15" strokeLinecap="round"/>
    <rect x="80" y="76" width="20" height="25" rx="5" fill="#d7ae8b"/>
    <ellipse cx="90" cy="57" rx="31" ry="37" fill="#e3bd99"/><path d="M59 58Q50 17 85 15Q127 10 123 57L109 38L76 39Z" fill={'#'+appearance.hair.toString(16).padStart(6,'0')}/>
    <circle cx="79" cy="59" r="2.5" fill="#263d49"/><circle cx="102" cy="59" r="2.5" fill="#263d49"/>
    {appearance.glasses&&<g fill="none" stroke="#48636c" strokeWidth="2.5"><rect x="65" y="49" width="24" height="17" rx="5"/><rect x="92" y="49" width="24" height="17" rx="5"/><path d="M89 55H92"/></g>}
    <path d="M82 77Q90 83 99 76" stroke="#a67660" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
  </svg>;
}
