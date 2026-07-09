const fs = require('fs');
let content = fs.readFileSync('src/screens/CheckoutScreen.tsx', 'utf-8');

content = content.replace("import { BlurUpImage } from \"../components/BlurUpImage\"; // Assuming this exists or I will just import it. Let me just add it to utils if needed, or I'll just change BlurUpImage to img.",
`import { BlurUpImage } from "../components/BlurUpImage";
import { audioHelper } from "../lib/audioHelper";
import { detectTownship } from "../utils";

const LOCAL_PROMO_DB: Record<
  string,
  {
    code: string;
    type: "percent" | "fixed" | "delivery_free";
    value: number;
    expiry_date: string;
    is_active: boolean;
  }
> = {
  LOCALEATS10: {
    code: "LOCALEATS10",
    type: "percent",
    value: 10,
    expiry_date: "2027-12-31T23:59:59Z",
    is_active: true,
  },
  FIRSTTREAT: {
    code: "FIRSTTREAT",
    type: "fixed",
    value: 20,
    expiry_date: "2027-12-31T23:59:59Z",
    is_active: true,
  },
  FREEDELIVERY: {
    code: "FREEDELIVERY",
    type: "delivery_free",
    value: 0,
    expiry_date: "2027-12-31T23:59:59Z",
    is_active: true,
  }
};
`);

fs.writeFileSync('src/screens/CheckoutScreen.tsx', content);
