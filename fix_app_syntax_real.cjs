const fs = require('fs');
let file = fs.readFileSync('src/App.tsx', 'utf8');

// Looking for SignUpScreen state
const signUpOld = `  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(formatSAPhone(""));
  const [loading, setLoading] = useState(false);`;

const signUpNew = `  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(formatSAPhone(""));
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const fullNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);`;

if (file.includes(signUpOld)) {
  file = file.replace(signUpOld, signUpNew);
  console.log("SignUpScreen fixed");
} else {
  console.log("SignUpScreen old logic not found, trying regex");
  // maybe different spacing?
}

// CompleteProfileScreen state
const profileOld = `  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {`;
  
const profileNew = `  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const fullNameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {`;

if (file.includes(profileOld)) {
  file = file.replace(profileOld, profileNew);
  console.log("CompleteProfileScreen fixed");
} else {
  console.log("CompleteProfileScreen old logic not found");
}

fs.writeFileSync('src/App.tsx', file);
