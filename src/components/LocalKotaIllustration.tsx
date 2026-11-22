import React from "react";

/** Lightweight local-food artwork for Welcome; decorative, no external image request. */
export function LocalKotaIllustration({className=""}:{className?:string}) {
 return <svg viewBox="0 0 440 290" className={className} aria-hidden="true" focusable="false">
  <defs>
   <linearGradient id="kota-bread" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#FFE29B" /><stop offset=".65" stopColor="#EEA84B" /><stop offset="1" stopColor="#BB7130" /></linearGradient>
   <linearGradient id="kota-fill" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#FDC36C" /><stop offset="1" stopColor="#BE713C" /></linearGradient>
  </defs>
  <ellipse cx="220" cy="259" rx="174" ry="19" fill="#FAD3B8" opacity=".78" />
  <ellipse cx="220" cy="250" rx="170" ry="20" fill="#FFF2E5" stroke="#FFDEBF" strokeWidth="3"/>
  <g transform="translate(4,18) rotate(-5 218 158)">
   <path d="M113 173Q210 195 330 168L322 219Q216 250 116 218Z" fill="url(#kota-bread)" stroke="#AD6D32" strokeWidth="5"/>
   <path d="M112 184Q203 206 328 179L326 202Q222 228 115 201Z" fill="#F5CB7B"/>
   <path d="M109 157Q209 133 328 154L338 180Q230 207 111 185Z" fill="#27794D" stroke="#216C41" strokeWidth="5"/>
   <path d="M114 164Q221 177 331 159" fill="none" stroke="#F36845" strokeWidth="14" strokeLinecap="round" />
   <path d="M118 173Q225 185 327 167" fill="none" stroke="#F9CD47" strokeWidth="9" strokeLinecap="round" />
   <path d="M114 150Q193 112 324 131L338 152Q224 170 114 160Z" fill="#8E4A29" stroke="#6E341D" strokeWidth="4"/>
   <g fill="none" stroke="#FFD96B" strokeWidth="10" strokeLinecap="round">
    <path d="M130 145L146 93"/><path d="M155 145L173 84"/><path d="M184 138L205 80"/><path d="M213 138L234 83"/><path d="M245 142L267 88"/><path d="M274 145L297 98"/><path d="M301 147L320 105"/>
   </g>
   <path d="M82 131Q111 62 211 47Q298 32 342 71L356 124Q242 156 103 154Z" fill="url(#kota-bread)" stroke="#A66E35" strokeWidth="5"/>
   <path d="M96 124Q174 54 323 77" fill="none" stroke="#FFDB96" strokeWidth="9" strokeLinecap="round"/>
   <g fill="#FFE6A6"><ellipse cx="151" cy="100" rx="5" ry="2"/><ellipse cx="197" cy="80" rx="5" ry="2"/><ellipse cx="235" cy="83" rx="5" ry="2"/><ellipse cx="286" cy="100" rx="5" ry="2"/></g>
  </g>
 </svg>;
}
