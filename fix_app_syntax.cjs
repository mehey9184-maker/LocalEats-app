const fs = require('fs');
let file = fs.readFileSync('src/App.tsx', 'utf8');

// Fix SignUpScreen
file = file.replace(
  `  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(formatSAPhone(""));
  const [loading, setLoading] = useState(false);`,
  `  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(formatSAPhone(""));
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const fullNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);`
);

// Fix CompleteProfileScreen
file = file.replace(
  `  const [longitude, setLongitude] = useState<number | undefined>(
    userProfile.longitude,
  );
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {`,
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

  const handleSave = async () => {`
);

fs.writeFileSync('src/App.tsx', file);
