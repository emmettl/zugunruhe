import septemberProfiles from '../data/processed/regional-air-2018-09-09-night.json?url';
import septemberWind from '../data/processed/regional-air-2018-09-09-wind.json?url';
import septemberBirds from '../data/processed/regional-air-2018-09-09-birds.json?url';
import octoberProfiles from '../data/processed/regional-air-2018-10-08-night.json?url';
import octoberWind from '../data/processed/regional-air-2018-10-08-wind.json?url';
import octoberBirds from '../data/processed/regional-air-2018-10-08-birds.json?url';

export const airNights=[
 {date:'2018-09-09',label:'9–10 September',urls:[septemberProfiles,septemberWind,septemberBirds]},
 {date:'2018-09-24',label:'24–25 September'},
 {date:'2018-10-08',label:'8–9 October',urls:[octoberProfiles,octoberWind,octoberBirds]},
];

// Alternative nights are fetched only when selected. The browser HTTP cache
// keeps revisits inexpensive without retaining every decoded path in memory.
export async function loadAirNight(night){
 const [study,...flows]=await Promise.all(night.urls.map(async url=>{
  const response=await fetch(url);
  if(!response.ok)throw new Error('Night data unavailable');
  return response.json();
 }));
 if(study.date!==night.date||flows.some(f=>f.start!==`${night.date}T19:00:00Z`))throw new Error('Night data mismatch');
 return {study,flows};
}
