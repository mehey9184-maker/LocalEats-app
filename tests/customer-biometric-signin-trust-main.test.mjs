import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const src=readFileSync(new URL("../src/screens/auth/LoginScreen.tsx",import.meta.url),"utf8");
test("customer login cannot treat remembered localStorage or unverified WebAuthn assertion as authentication",()=>{
 assert.doesNotMatch(src,/handleBiometricAuth|navigator\.credentials\.get|assertionSucceeded|Biometric authentication successful!/);
 assert.doesNotMatch(src,/generateSecureToken|registerBiometrics|setHasRememberedToken|setIsScanningBiometrics/);
 assert.doesNotMatch(src,/localStorage\.setItem\(\s*["']remember_me_secure_token/);
 assert.doesNotMatch(src,/localStorage\.setItem\(\s*["']biometric_credential_id/);
 assert.doesNotMatch(src,/fallback_mock_credential_id/);
 assert.match(src,/Fingerprint \/ Face ID sign-in is coming soon\. Use your password\./);
 assert.doesNotMatch(src,/id=["']biometric-login-btn["']/);
});
test("customer password login, ordinary remember-email and recovery are retained",()=>{
 assert.match(src,/supabase\.auth\.signInWithPassword\(/);
 assert.match(src,/localStorage\.setItem\(["']remembered_identifier["'], identifier\.trim\(\)\)/);
 assert.match(src,/localStorage\.removeItem\(["']remember_me_secure_token["']\)/);
 assert.match(src,/localStorage\.removeItem\(["']biometric_credential_id["']\)/);
 assert.match(src,/supabase\.auth\.resetPasswordForEmail\(/);
 assert.match(src,/const handleLogin = async \(\) =>/);
});
test("customer app never derives authorization role from editable identity metadata",()=>{
 assert.doesNotMatch(src,/userMeta\.role|user_metadata\.role|is_admin:\s*userMeta|is_vendor:\s*userMeta/);
 const block=src.slice(src.indexOf("const handleLogin ="),src.indexOf("const handleForgotPassword ="));
 assert.equal((block.match(/role:\s*["']user["']/g)||[]).length,1,
  "Customer UI uses its ordinary nonstaff display role");
 assert.doesNotMatch(block,/upsertProfileWithRPC|saveCustomerProfile|role:\s*["']customer["']/);
 assert.match(block,/supabase\.auth\.signInWithPassword/);
});
