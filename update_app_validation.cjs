const fs = require('fs');
let file = fs.readFileSync('src/App.tsx', 'utf8');

// SignUpScreen
file = file.replace(
  `  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(formatSAPhone(""));
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!fullName || !email || !phone) {
      setNotification({ message: "Please fill in all fields", type: "error" });
      return;
    }
    if (!validateSAPhone(phone)) {
      setNotification({
        message: "Invalid South African phone format. Use +27 XX XXX XXXX",
        type: "error",
      });
      return;
    }
    onNext({ fullName, email, phone });
  };`,
  `  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(formatSAPhone(""));
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const fullNameRef = useRef(null);
  const emailRef = useRef(null);
  const phoneRef = useRef(null);

  const handleSignUp = async () => {
    setFormErrors({});
    if (!fullName || !email || !phone) {
      setFormErrors({
        fullName: !fullName ? "Please enter your full name" : undefined,
        email: !email ? "Please enter your email" : undefined,
        phone: !phone ? "Please enter your phone number" : undefined
      });
      setTimeout(() => {
        if (!fullName) fullNameRef.current?.focus();
        else if (!email) emailRef.current?.focus();
        else if (!phone) phoneRef.current?.focus();
      }, 100);
      return;
    }
    if (!validateSAPhone(phone)) {
      setFormErrors({ phone: "Invalid South African phone format. Use +27 XX XXX XXXX" });
      setTimeout(() => phoneRef.current?.focus(), 100);
      return;
    }
    onNext({ fullName, email, phone });
  };`
);

// We need to inject the refs and error UI into SignUpScreen.
file = file.replace(
  `                <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="form-input flex w-full rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-14 placeholder:text-slate-400 pl-12 pr-4 text-base font-normal leading-normal transition-all"
                    placeholder="Enter your full name"
                    type="text"
                  />`,
  `                <input
                    ref={fullNameRef}
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); setFormErrors(prev => ({...prev, fullName: undefined})); }}
                    className={\`form-input flex w-full rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 border \${formErrors.fullName ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-800 focus:ring-primary/20'} bg-white dark:bg-slate-900 h-14 placeholder:text-slate-400 pl-12 pr-4 text-base font-normal leading-normal transition-all\`}
                    placeholder="Enter your full name"
                    type="text"
                  />
                </div>
                {formErrors.fullName && <p className="text-red-500 text-[10px] mt-1">{formErrors.fullName}</p>}
                <div>`
);

// We'll run the script sequentially and refine it.
fs.writeFileSync('src/App.tsx', file);
