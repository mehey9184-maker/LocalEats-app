import {auth} from '../lib/firebase';
import {createProfileApiClient} from '../lib/customerProfileApi';

export const customerProfileApi=createProfileApiClient({
  baseUrl:import.meta.env.VITE_LOCALEATS_API_URL || '',
  production:import.meta.env.PROD,
  currentUser:()=>auth.currentUser,
});

export const readCustomerProfile=(uid:string,options?:{signal?:AbortSignal})=>customerProfileApi.read(uid,options);
