const fs = require('fs');
let file = fs.readFileSync('src/App.tsx', 'utf8');

const dupe = `  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const fullNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const fullNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);`;

const clean = `  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const fullNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);`;

file = file.replace(dupe, clean);
fs.writeFileSync('src/App.tsx', file);
