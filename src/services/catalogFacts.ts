import type {Shop} from '../types';

export function shopRatingFacts(shop:{rating?:unknown;reviewCount?:unknown}){
 const rating=shop.rating,count=shop.reviewCount;
 if(typeof rating!=='number'||!Number.isFinite(rating)||rating<1||rating>5)return null;
 if(count!==undefined&&count!==null&&(!Number.isSafeInteger(count)||Number(count)<=0))return null;
 return {rating,count:typeof count==='number'?count:null};
}
export function shopRatingLabel(shop:{rating?:unknown;reviewCount?:unknown}):string{
 const facts=shopRatingFacts(shop);
 return facts?`${facts.rating.toFixed(1)}${facts.count!==null?` (${facts.count})`:''}`:'No rating available';
}
export function pickupDistanceLabel(distance:unknown):string{
 return typeof distance==='number'&&Number.isFinite(distance)&&distance>=0?`${distance.toFixed(1)} km`:'Distance unavailable';
}
export function restaurantMetadata(shop:Shop){
 const rating=shopRatingFacts(shop);
 const time=/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
 return {
  '@context':'https://schema.org','@type':'Restaurant',name:shop.name,description:shop.description,servesCuisine:shop.category,
  ...(shop.logo?{image:shop.logo}:{}),
  address:{'@type':'PostalAddress',streetAddress:shop.address,addressCountry:'ZA'},
  ...(rating?.count?{aggregateRating:{'@type':'AggregateRating',ratingValue:rating.rating,reviewCount:rating.count}}:{}),
  ...(typeof shop.opening_time==='string'&&time.test(shop.opening_time)&&typeof shop.closing_time==='string'&&time.test(shop.closing_time)?
   {openingHoursSpecification:[{'@type':'OpeningHoursSpecification',opens:shop.opening_time,closes:shop.closing_time}]}:{}),
 };
}
