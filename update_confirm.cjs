const fs = require('fs');
let file = fs.readFileSync('src/screens/CheckoutScreen.tsx', 'utf8');

file = file.replace(
  `    if (!activeCustomerName) {
      toast.error("Please enter the recipient name");
      setCurrentStep(1);
      setTimeout(() => {
        nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        nameInputRef.current?.focus();
      }, 100);
      return;
    }
    if (!activeCustomerPhone || activeCustomerPhone.replace(/\\D/g, "").length < 9) {
      toast.error("Valid Mobile Number Required", {
        description:
          "Please input a proper mobile number so our riders can call you!",
      });
      setCurrentStep(1);
      setTimeout(() => {
        phoneInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        phoneInputRef.current?.focus();
      }, 100);
      return;
    }

    if (deliveryType === "delivery") {
      if (!deliveryAddressText || deliveryAddressText.trim().length < 5) {
        toast.error("Valid Delivery Address Required", {
          description: "Please set a complete delivery address for your order.",
        });
        setCurrentStep(1);
        setShowAddressModal(true);
        setTimeout(() => {
          addressSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        return;
      }
      
      if (isOnline && (!isLocationConfirmed || !deliveryCoordinates)) {
        showAlert(
          "Location Confirmation Required",
          'Please drag the pin to your exact door and tap "Confirm Location" on the map.',
        );
        setCurrentStep(1);
        return;
      }
      if (isOnline && isLocationConfirmed && !hasVisuallyConfirmedAddress) {
        showAlert(
          "Visual Confirmation Required",
          'Please check the box confirming that your pinned map location accurately matches your delivery address.',
        );
        setCurrentStep(1);
        return;
      }`,
  `    setFormErrors({});
    if (!activeCustomerName) {
      setFormErrors({ name: "Please enter the recipient name" });
      setCurrentStep(1);
      setTimeout(() => {
        nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        nameInputRef.current?.focus();
      }, 100);
      return;
    }
    if (!activeCustomerPhone || activeCustomerPhone.replace(/\\D/g, "").length < 9) {
      setFormErrors({ phone: "Valid mobile number required" });
      setCurrentStep(1);
      setTimeout(() => {
        phoneInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        phoneInputRef.current?.focus();
      }, 100);
      return;
    }

    if (deliveryType === "delivery") {
      if (!deliveryAddressText || deliveryAddressText.trim().length < 5) {
        setFormErrors({ address: "Please set a complete delivery address for your order." });
        setCurrentStep(1);
        setShowAddressModal(true);
        setTimeout(() => {
          addressSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        return;
      }
      
      if (isOnline && (!isLocationConfirmed || !deliveryCoordinates)) {
        setFormErrors({ location: 'Please drag the pin to your exact door and tap "Confirm Location" on the map.' });
        setCurrentStep(1);
        return;
      }
      if (isOnline && isLocationConfirmed && !hasVisuallyConfirmedAddress) {
        setFormErrors({ visualConfirm: 'Please check the box confirming your map location matches.' });
        setCurrentStep(1);
        return;
      }`
);

fs.writeFileSync('src/screens/CheckoutScreen.tsx', file);
