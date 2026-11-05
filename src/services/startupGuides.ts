export type GuideStage='overview'|'interactive'|null;
type Options={storage:Pick<Storage,'getItem'|'setItem'>;onChange:(stage:GuideStage)=>void;
 schedule?:(callback:()=>void)=>ReturnType<typeof setTimeout>;cancel?:(timer:ReturnType<typeof setTimeout>)=>void};
export function createGuideFlow({storage,onChange,schedule=callback=>setTimeout(callback,1200),cancel=clearTimeout}:Options){
 const read=(key:string)=>{try{return storage.getItem(key)==='true';}catch{return false;}};
 let overviewSeen=read('localeats_tour_seen'),interactiveSeen=read('localeats_interactive_tour_seen');
 let stage:GuideStage=null,disposed=false,generation=0,timer:ReturnType<typeof setTimeout>|undefined;
 const stopTimer=()=>{generation++;if(timer!==undefined)cancel(timer);timer=undefined;};
 const set=(next:GuideStage)=>{stage=next;onChange(next);};
 const remember=(key:string)=>{try{storage.setItem(key,'true');}catch{/* Session dismissal still works when storage is unavailable. */}};
 const start=(next:Exclude<GuideStage,null>)=>{if(disposed)return;stopTimer();set(next);};
 const initial= !overviewSeen ? 'overview' : !interactiveSeen ? 'interactive' : null;
 if(initial){const version=generation;timer=schedule(()=>{if(!disposed && version===generation){timer=undefined;set(initial);}});}
 return {
  start,
  skip(){if(disposed)return;stopTimer();overviewSeen=interactiveSeen=true;remember('localeats_tour_seen');remember('localeats_interactive_tour_seen');set(null);},
  complete(){if(disposed || !stage)return;stopTimer();if(stage==='overview'){overviewSeen=true;remember('localeats_tour_seen');set(interactiveSeen ? null : 'interactive');}
   else {interactiveSeen=true;remember('localeats_interactive_tour_seen');set(null);}},
  dispose(){disposed=true;stopTimer();},
 };
}
