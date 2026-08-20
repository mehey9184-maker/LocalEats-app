const fs = require('fs');
let file = fs.readFileSync('src/App.tsx', 'utf8');

// ProfileScreen logic
file = file.replace(
  `  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);`,
  `  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const fullNameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);`
);

file = file.replace(
  `  const handleSave = async () => {
    if (!fullName || !phone || !city || !address) {
      setNotification({
        message: "Please fill in all required fields to proceed.",
        type: "error",
      });
      return;
    }
    if (!validateSAPhone(phone)) {
      setNotification({
        message: "Invalid South African phone format. Use +27 XX XXX XXXX",
        type: "error",
      });
      return;
    }
    if (!latitude || !longitude) {
      setNotification({
        message:
          "Please search and select your precise address on the map to provide delivery coordinates.",
        type: "error",
      });
      return;
    }`,
  `  const handleSave = async () => {
    setFormErrors({});
    if (!fullName || !phone || !city || !address) {
      setFormErrors({
        fullName: !fullName ? "Full name is required" : undefined,
        phone: !phone ? "Phone number is required" : undefined,
        address: !address ? "Delivery address is required" : undefined
      });
      setTimeout(() => {
        if (!fullName) fullNameRef.current?.focus();
        else if (!phone) phoneRef.current?.focus();
        else if (!address) addressRef.current?.focus();
      }, 100);
      return;
    }
    if (!validateSAPhone(phone)) {
      setFormErrors({ phone: "Invalid format. Use +27 XX XXX XXXX" });
      setTimeout(() => phoneRef.current?.focus(), 100);
      return;
    }
    if (!latitude || !longitude) {
      setFormErrors({ address: "Please search and select your precise address on the map to provide delivery coordinates." });
      setTimeout(() => addressRef.current?.focus(), 100);
      return;
    }`
);

// ProfileScreen UI
file = file.replace(
  `            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                disabled={isSaving || uploading}
                className="w-full pl-12 pr-24 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">`,
  `            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input
                ref={fullNameRef}
                type="text"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setFormErrors(prev => ({...prev, fullName: undefined})); }}
                placeholder="Your full name"
                disabled={isSaving || uploading}
                className={\`w-full pl-12 pr-24 py-4 bg-slate-50 dark:bg-slate-900 border \${formErrors.fullName ? 'border-red-500 focus:ring-red-500' : 'border-slate-100 dark:border-slate-800 focus:ring-primary/20'} rounded-2xl text-sm focus:outline-none focus:ring-2 transition-all disabled:opacity-50\`}
              />
              {formErrors.fullName && <p className="absolute -bottom-5 left-2 text-red-500 text-[10px] m-0">{formErrors.fullName}</p>}
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">`
);

file = file.replace(
  `            <div className="relative group">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatSAPhone(e.target.value))}
                placeholder="072 123 4567"
                disabled={isSaving || uploading}
                className="w-full pl-12 pr-24 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">`,
  `            <div className="relative group">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input
                ref={phoneRef}
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(formatSAPhone(e.target.value)); setFormErrors(prev => ({...prev, phone: undefined})); }}
                placeholder="072 123 4567"
                disabled={isSaving || uploading}
                className={\`w-full pl-12 pr-24 py-4 bg-slate-50 dark:bg-slate-900 border \${formErrors.phone ? 'border-red-500 focus:ring-red-500' : 'border-slate-100 dark:border-slate-800 focus:ring-primary/20'} rounded-2xl text-sm focus:outline-none focus:ring-2 transition-all disabled:opacity-50\`}
              />
              {formErrors.phone && <p className="absolute -bottom-5 left-2 text-red-500 text-[10px] m-0">{formErrors.phone}</p>}
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">`
);


fs.writeFileSync('src/App.tsx', file);
