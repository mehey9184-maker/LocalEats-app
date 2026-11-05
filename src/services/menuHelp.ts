export type MenuHelpShop={name?:string;address?:string;menu?:{name:string;description?:string}[]};
export function menuHelpReply(query:string,shop:MenuHelpShop):string{
 const text=query.toLowerCase();
 if(/\b(time|prep|long|eta)\b/.test(text))return 'I don’t have a confirmed preparation estimate. Follow your pickup status and wait for Ready before collecting.';
 if(/cash|payment|pay/.test(text))return 'Pickup is paid at the shop using cash or its physical card machine. Checkout shows the available payment choices; there is no in-app payment.';
 if(/halal|veg|diet|allerg|ingredient|custom|instruction/.test(text))return 'Check dietary needs, allergens and special requests directly with the shop before ordering. This automated guide cannot confirm them or send instructions to the kitchen.';
 if(/location|where|address/.test(text))return shop.address?`The listed shop address is ${shop.address}. Use Directions on its page for navigation.`:'A shop address is not available in this menu guide.';
 if(/recommend|top|special|popular|menu/.test(text)){
  const names=shop.menu?.slice(0,3).map(item=>item.name).filter(Boolean)??[];
  return names.length?`The current menu includes ${names.join(', ')}. Review the menu and server quote for availability and pricing; I don’t have verified popularity or promotion data.`:'The current menu is unavailable. Retry the shop page before ordering.';
 }
 return 'This is automated menu help. Your message has not been sent to the shop. Check the menu and pickup status in the app; contact the shop directly for questions requiring its confirmation.';
}
