/**
 * L3-N8U-Y: browser-only component fixture.
 * Real ShopCard/MenuItemCard and actual CSS, synthetic data only.
 * No Firebase sign-in, API, browser GPS, Production calls or order creation.
 */
import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ShopCard,MenuItemCard} from '../src/components/ShopCard';
import {mapPickupShop} from '../src/services/pickupMapping';
import '../src/index.css';

const mode=new URLSearchParams(window.location.search).get('mode')==='outside'?'outside':'no-gps';
const item={id:'synthetic-kota-25',name:'CHEEZE, PALONE AND MEAT',price:25,is_available:true,description:'',image_url:''};
const raw={
 id:'shop-my-kota-ivory-park',name:'My-Kota',is_active:false,
 lat:-25.9830322643032,lng:28.2074831464466,location:'Katlego Street, Ivory Park',
 category:'Street Food',rating:4.8,
 // No review_count supplied by current public catalog: must NOT show 4.8.
};
const shop=mapPickupShop({...raw,distance_km:mode==='outside'?4.1:undefined},[item]);

function Pilot(){
 const [open,setOpen]=useState(false);
 const [notice,setNotice]=useState('');
 const [cartAdds,setCartAdds]=useState(0);
 const [selectionCount,setSelectionCount]=useState(0);
 return <main className="mx-auto w-full max-w-xl p-3 sm:p-5" data-testid="pilot-root">
   <h1 className="mb-3 text-lg font-black text-slate-900">My-Kota pickup browse test</h1>
   <p className="mb-3 text-sm font-medium text-slate-600">Synthetic component fixture, not a live ordering session.</p>
   <div data-testid="shop-card">
     <ShopCard shop={shop} isFollowed={false} onStoreInfo={()=>setOpen(true)}
       dataSaverEnabled={true} triggerHaptic={()=>{}}/>
   </div>
   {open && <section data-testid="shop-menu" className="mt-4 space-y-3">
     <h2 className="text-base font-black">My-Kota menu</h2>
     <MenuItemCard item={shop.menu[0]} shop={shop}
       showAlert={(title,message)=>setNotice(title+': '+message)}
       onSelect={()=>{setSelectionCount(x=>x+1);setCartAdds(x=>x+1);}}
       addToCart={()=>setCartAdds(x=>x+1)}/>
   </section>}
   <output data-testid="notice" role="status" className="block mt-2 text-sm">{notice}</output>
   <output data-testid="cart-add-count" aria-label="Cart additions">{cartAdds}</output>
   <output data-testid="item-selection-count" aria-label="Menu selections">{selectionCount}</output>
 </main>;
}
createRoot(document.getElementById('root')!).render(<Pilot/>);
