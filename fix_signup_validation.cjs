const fs = require('fs');
let file = fs.readFileSync('src/App.tsx', 'utf8');

const signUpBad = `  const handleSignUp = async () => {
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
  };`;
  
const signUpGood = `  const handleSignUp = async () => {
    setFormErrors({});
    if (!fullName || !email || !phone) {
      setFormErrors({
        fullName: !fullName ? "Please enter your full name" : undefined,
        email: !email ? "Please enter your email" : undefined,
        phone: !phone ? "Please enter your phone number" : undefined
      } as any);
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
  };`;

file = file.replace(signUpBad, signUpGood);
fs.writeFileSync('src/App.tsx', file);
