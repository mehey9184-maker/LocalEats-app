const fs = require('fs');

let content = fs.readFileSync('src/screens/CheckoutScreen.tsx', 'utf-8');

const searchValidation = `    if (deliveryType === "delivery" && isOnline) {
      if (!isLocationConfirmed || !deliveryCoordinates) {
        showAlert(
          "Location Confirmation Required",
          'Please drag the pin to your exact door and tap "Confirm Location" on the map.',
        );
        return;
      }`;
      
const replaceValidation = `    if (deliveryType === "delivery") {
      if (!deliveryAddressText || deliveryAddressText.trim().length < 5) {
        toast.error("Valid Delivery Address Required", {
          description: "Please set a complete delivery address for your order.",
        });
        setShowAddressModal(true);
        return;
      }
      
      if (isOnline && (!isLocationConfirmed || !deliveryCoordinates)) {
        showAlert(
          "Location Confirmation Required",
          'Please drag the pin to your exact door and tap "Confirm Location" on the map.',
        );
        return;
      }`;

content = content.replace(searchValidation, replaceValidation);

fs.writeFileSync('src/screens/CheckoutScreen.tsx', content);
