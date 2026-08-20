const fs = require('fs');
let file = fs.readFileSync('src/screens/CheckoutScreen.tsx', 'utf8');

file = file.replace(
  'const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);',
  'const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);\n  const [formErrors, setFormErrors] = useState<Record<string, string>>({});'
);

file = file.replace(
  `  const handleNextToStep2 = () => {
    if (!customerName.trim()) {
      toast.error("Please enter the recipient name");
      nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      nameInputRef.current?.focus();
      return;
    }
    if (!customerPhone.trim()) {
      toast.error("Please enter a valid mobile number");
      phoneInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      phoneInputRef.current?.focus();
      return;
    }
    if (deliveryType === "delivery" && !deliveryAddressText.trim()) {
      setShowAddressModal(true);
      toast.error("Please select your delivery spot location");
      addressSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setCurrentStep(2);
    triggerHaptic(10);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };`,
  `  const handleNextToStep2 = () => {
    setFormErrors({});
    if (!customerName.trim()) {
      setFormErrors({ name: "Please enter the recipient name" });
      nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      nameInputRef.current?.focus();
      return;
    }
    if (!customerPhone.trim() || customerPhone.replace(/\\D/g, "").length < 9) {
      setFormErrors({ phone: "Valid mobile number required" });
      phoneInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      phoneInputRef.current?.focus();
      return;
    }
    if (deliveryType === "delivery" && (!deliveryAddressText.trim() || deliveryAddressText.trim().length < 5)) {
      setFormErrors({ address: "Please provide a complete delivery address" });
      setShowAddressModal(true);
      addressSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (deliveryType === "delivery" && isOnline && (!isLocationConfirmed || !deliveryCoordinates)) {
      setFormErrors({ location: 'Please confirm location on the map.' });
      return;
    }
    if (deliveryType === "delivery" && isOnline && isLocationConfirmed && !hasVisuallyConfirmedAddress) {
      setFormErrors({ visualConfirm: 'Please check the box confirming your address.' });
      return;
    }
    setCurrentStep(2);
    triggerHaptic(10);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };`
);

file = file.replace(
  `  const handleNextToStep3 = () => {
    if (!paymentMethod) {
      toast.error("Please select a settlement payment method");
      paymentMethodSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setCurrentStep(3);
    triggerHaptic(10);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };`,
  `  const handleNextToStep3 = () => {
    setFormErrors({});
    if (!paymentMethod) {
      setFormErrors({ payment: "Please select a settlement payment method" });
      paymentMethodSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setCurrentStep(3);
    triggerHaptic(10);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };`
);

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

file = file.replace(
  `                <input
                  ref={nameInputRef}
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Thabo Mokoena"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-3 text-xs font-bold focus:ring-1 focus:ring-orange-500 outline-none transition-all dark:text-white"
                />`,
  `                <input
                  ref={nameInputRef}
                  type="text"
                  value={customerName}
                  onChange={(e) => { setCustomerName(e.target.value); setFormErrors(prev => ({...prev, name: undefined})); }}
                  placeholder="e.g. Thabo Mokoena"
                  className={\`w-full bg-slate-50 dark:bg-slate-950 border \${formErrors.name ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-800 focus:ring-orange-500'} rounded-2xl px-3.5 py-3 text-xs font-bold focus:ring-1 outline-none transition-all dark:text-white\`}
                />
                {formErrors.name && <p className="text-red-500 text-[10px] whitespace-nowrap mt-1">{formErrors.name}</p>}`
);

file = file.replace(
  `                <input
                  ref={phoneInputRef}
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 072 123 4567"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-3 text-xs font-bold focus:ring-1 focus:ring-orange-500 outline-none transition-all dark:text-white"
                />`,
  `                <input
                  ref={phoneInputRef}
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => { setCustomerPhone(formatSAPhone(e.target.value)); setFormErrors(prev => ({...prev, phone: undefined})); }}
                  placeholder="e.g. 072 123 4567"
                  className={\`w-full bg-slate-50 dark:bg-slate-950 border \${formErrors.phone ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-800 focus:ring-orange-500'} rounded-2xl px-3.5 py-3 text-xs font-bold focus:ring-1 outline-none transition-all dark:text-white\`}
                />
                {formErrors.phone && <p className="text-red-500 text-[10px] whitespace-nowrap mt-1">{formErrors.phone}</p>}`
);

fs.writeFileSync('src/screens/CheckoutScreen.tsx', file);
