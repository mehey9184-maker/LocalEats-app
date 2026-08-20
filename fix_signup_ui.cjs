const fs = require('fs');
let file = fs.readFileSync('src/App.tsx', 'utf8');

// Fix email input
file = file.replace(
  `                <div className="relative w-full max-w-[100vw] overflow-x-hidden">
                  <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input flex w-full rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-14 placeholder:text-slate-400 pl-12 pr-4 text-base font-normal leading-normal transition-all"
                    placeholder="Enter your email"
                    type="email"
                  />
                </div>`,
  `                <div className="relative w-full max-w-[100vw] overflow-x-hidden">
                  <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={emailRef}
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setFormErrors(prev => ({...prev, email: undefined})); }}
                    className={\`form-input flex w-full rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 border \${formErrors.email ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-800 focus:ring-primary/20'} bg-white dark:bg-slate-900 h-14 placeholder:text-slate-400 pl-12 pr-4 text-base font-normal leading-normal transition-all\`}
                    placeholder="Enter your email"
                    type="email"
                  />
                </div>
                {formErrors.email && <p className="text-red-500 text-[10px] mt-1">{formErrors.email}</p>}`
);

// Fix phone input
file = file.replace(
  `                <div className="relative w-full max-w-[100vw] overflow-x-hidden">
                  <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(formatSAPhone(e.target.value))}
                    className="form-input flex w-full rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-14 placeholder:text-slate-400 pl-12 pr-4 text-base font-normal leading-normal transition-all"
                    placeholder="072 123 4567"
                    type="tel"
                  />
                </div>`,
  `                <div className="relative w-full max-w-[100vw] overflow-x-hidden">
                  <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={phoneRef}
                    value={phone}
                    onChange={(e) => { setPhone(formatSAPhone(e.target.value)); setFormErrors(prev => ({...prev, phone: undefined})); }}
                    className={\`form-input flex w-full rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 border \${formErrors.phone ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-800 focus:ring-primary/20'} bg-white dark:bg-slate-900 h-14 placeholder:text-slate-400 pl-12 pr-4 text-base font-normal leading-normal transition-all\`}
                    placeholder="072 123 4567"
                    type="tel"
                  />
                </div>
                {formErrors.phone && <p className="text-red-500 text-[10px] mt-1">{formErrors.phone}</p>}`
);

// CompleteProfileScreen logic
file = file.replace(
  `  const [longitude, setLongitude] = useState<number | undefined>(
    userProfile.longitude,
  );
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
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
  `  const [longitude, setLongitude] = useState<number | undefined>(
    userProfile.longitude,
  );
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const fullNameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setFormErrors({});
    if (!fullName || !phone || !city || !address) {
      setFormErrors({
        fullName: !fullName ? "Please enter your full name" : undefined,
        phone: !phone ? "Please enter your phone number" : undefined,
        address: !address ? "Please enter your address" : undefined
      });
      setTimeout(() => {
        if (!fullName) fullNameRef.current?.focus();
        else if (!phone) phoneRef.current?.focus();
        else if (!address) addressRef.current?.focus();
      }, 100);
      return;
    }
    if (!validateSAPhone(phone)) {
      setFormErrors({ phone: "Invalid South African phone format. Use +27 XX XXX XXXX" });
      setTimeout(() => phoneRef.current?.focus(), 100);
      return;
    }
    if (!latitude || !longitude) {
      setFormErrors({ address: "Please search and select your precise address on the map to provide delivery coordinates." });
      setTimeout(() => addressRef.current?.focus(), 100);
      return;
    }`
);

// CompleteProfileScreen UI
file = file.replace(
  `              <div className="relative group">
                <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-2xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-14 pl-12 pr-4 text-base font-medium transition-all outline-none"
                  placeholder="e.g. John Doe"
                  type="text"
                />
              </div>`,
  `              <div className="relative group">
                <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input
                  ref={fullNameRef}
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setFormErrors(prev => ({...prev, fullName: undefined})); }}
                  className={\`w-full rounded-2xl text-slate-900 dark:text-slate-100 focus:ring-2 outline-none border-2 \${formErrors.fullName ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-800 focus:ring-primary/20 focus:border-primary'} bg-white dark:bg-slate-900 h-14 pl-12 pr-4 text-base font-medium transition-all\`}
                  placeholder="e.g. John Doe"
                  type="text"
                />
              </div>
              {formErrors.fullName && <p className="text-red-500 text-[10px] mt-1">{formErrors.fullName}</p>}`
);

file = file.replace(
  `              <div className="relative group">
                <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input
                  value={phone}
                  onChange={(e) => setPhone(formatSAPhone(e.target.value))}
                  className="w-full rounded-2xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-14 pl-12 pr-4 text-base font-medium transition-all outline-none"
                  placeholder="072 123 4567"
                  type="tel"
                />
              </div>`,
  `              <div className="relative group">
                <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input
                  ref={phoneRef}
                  value={phone}
                  onChange={(e) => { setPhone(formatSAPhone(e.target.value)); setFormErrors(prev => ({...prev, phone: undefined})); }}
                  className={\`w-full rounded-2xl text-slate-900 dark:text-slate-100 focus:ring-2 outline-none border-2 \${formErrors.phone ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-800 focus:ring-primary/20 focus:border-primary'} bg-white dark:bg-slate-900 h-14 pl-12 pr-4 text-base font-medium transition-all\`}
                  placeholder="072 123 4567"
                  type="tel"
                />
              </div>
              {formErrors.phone && <p className="text-red-500 text-[10px] mt-1">{formErrors.phone}</p>}`
);

fs.writeFileSync('src/App.tsx', file);
