import type {ProfileEditBasis,ProfileActor} from './customerProfileState';
export function canRenderAddressEditor(open:boolean,basis:ProfileEditBasis|null,actor:ProfileActor|null,profileId:string|undefined|null):boolean {
  return open && !!actor && !actor.isAnonymous && basis?.identity===actor && profileId===actor.uid;
}
