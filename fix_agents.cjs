const fs = require('fs');
let text = fs.readFileSync('AGENTS.md', 'utf8');

const regex = /### Phase 15: Firestore Security Audit & DB Health Diagnostic Tool[\s\S]*?Supabase-Firestore dual-auth handshake\./g;

const matches = text.match(regex);
if (matches && matches.length > 1) {
    const firstMatch = matches[0];
    const restOfText = text.substring(text.indexOf(firstMatch) + firstMatch.length);
    const cleanedRest = restOfText.replace(firstMatch, '');
    text = text.substring(0, text.indexOf(firstMatch) + firstMatch.length) + cleanedRest;
    text += "\n\n### Hotfix: App.tsx Corruption Recovery\n- **Syntax Repair**: Recovered `src/App.tsx` from file corruption near line 11871, successfully restoring the `ExploreScreen` modal component and resolving the unclosed JSX tag Vite build failure.";
    fs.writeFileSync('AGENTS.md', text);
    console.log("Fixed AGENTS.md");
} else {
    console.log("No duplicate found or error");
}
