import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const ACCENTS = {
  indigo: "#2E286B",
  teal: "#2097A7",
  green: "#5BA46B",
};

const slots = [
  { file: "assets/images/hero/hero-leacon.svg", w: 1600, h: 1000, label: "LEACON II", sub: "HERO PHOTO \u2014 16:10", accent: "indigo", cropSafe: true },
  { file: "assets/images/about/session-photo.svg", w: 1200, h: 900, label: "LEADERSHIP SESSION", sub: "ABOUT PHOTO \u2014 4:3", accent: "teal" },
  { file: "assets/images/about/obt-photo.svg", w: 1200, h: 900, label: "OBT / ACTIVITY", sub: "ABOUT PHOTO \u2014 4:3", accent: "green" },
  { file: "assets/images/branding/oc-team.svg", w: 1600, h: 900, label: "OC TEAM / BEHIND THE SCENES", sub: "STRUCTURE PHOTO \u2014 16:9", accent: "indigo" },

  { file: "assets/images/gallery/motion-01.svg", w: 900, h: 1200, label: "PHOTOGRAPHIC ESSAY", sub: "MOTION 01 \u2014 LEADERSHIP SESSION \u2014 3:4", accent: "teal" },
  { file: "assets/images/gallery/motion-02.svg", w: 1200, h: 900, label: "PHOTOGRAPHIC ESSAY", sub: "MOTION 02 \u2014 OBT / ACTIVITY \u2014 4:3", accent: "green" },
  { file: "assets/images/gallery/motion-03.svg", w: 1200, h: 1200, label: "PHOTOGRAPHIC ESSAY", sub: "MOTION 03 \u2014 DELEGATES \u2014 1:1", accent: "indigo" },
  { file: "assets/images/gallery/motion-04.svg", w: 1600, h: 900, label: "PHOTOGRAPHIC ESSAY", sub: "MOTION 04 \u2014 TEAM MOMENT \u2014 16:9", accent: "teal" },

  { file: "assets/images/gallery/gallery-01.svg", w: 900, h: 1200, label: "LAST YEAR AT LEACON", sub: "GALLERY 01 \u2014 PORTRAIT \u2014 3:4", accent: "indigo" },
  { file: "assets/images/gallery/gallery-02.svg", w: 1000, h: 1000, label: "LAST YEAR AT LEACON", sub: "GALLERY 02 \u2014 SQUARE \u2014 1:1", accent: "teal" },
  { file: "assets/images/gallery/gallery-03.svg", w: 1000, h: 1000, label: "LAST YEAR AT LEACON", sub: "GALLERY 03 \u2014 SQUARE \u2014 1:1", accent: "green" },
  { file: "assets/images/gallery/gallery-04.svg", w: 1680, h: 720, label: "LAST YEAR AT LEACON", sub: "GALLERY 04 \u2014 WIDE \u2014 21:9", accent: "indigo" },
  { file: "assets/images/gallery/gallery-05.svg", w: 960, h: 1200, label: "LAST YEAR AT LEACON", sub: "GALLERY 05 \u2014 OFFSET PORTRAIT \u2014 4:5", accent: "teal" },
  { file: "assets/images/gallery/gallery-06.svg", w: 1440, h: 960, label: "LAST YEAR AT LEACON", sub: "GALLERY 06 \u2014 LANDSCAPE \u2014 3:2", accent: "green" },

  { file: "assets/images/gallery/preapply.svg", w: 1920, h: 800, label: "WIDE LEACON PHOTO", sub: "PRE-APPLICATION IMAGE \u2014 12:5", accent: "indigo", cropSafe: true },
];

function svg({ w, h, label, sub, accent, cropSafe }) {
  const hex = ACCENTS[accent];
  const fs = Math.max(
    16,
    Math.round(Math.min(w * 0.055, h * 0.11, (w * 0.86) / (label.length * 0.78)))
  );
  const fsSub = Math.round(fs * 0.3);
  const micro = cropSafe
    ? Math.round(Math.min(Math.min(w, h) * 0.028, w / 64))
    : Math.round(Math.min(w, h) * 0.028);
  const cut = Math.round(Math.min(w, h) * 0.05);
  const inset = Math.round(Math.min(w, h) * 0.035);
  const cx = w / 2;
  const cy = h / 2;
  const dash = Math.round(Math.min(w, h) * 0.06);
  const barX = cropSafe ? cx - Math.round(w * 0.08) : inset;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">
  <defs>
    <pattern id="hatch" width="${dash * 2}" height="${dash * 2}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="${dash * 2}" height="${dash * 2}" fill="none"/>
      <line x1="0" y1="0" x2="0" y2="${dash * 2}" stroke="${hex}" stroke-opacity="0.05" stroke-width="${Math.max(2, dash * 0.12)}"/>
    </pattern>
  </defs>
  <rect width="${w}" height="${h}" fill="#EFEFEB"/>
  <rect width="${w}" height="${h}" fill="url(#hatch)"/>
  <path d="M ${inset} ${inset + cut} L ${inset + cut} ${inset} L ${w - inset} ${inset} L ${w - inset} ${h - inset - cut} L ${w - inset - cut} ${h - inset} L ${inset} ${h - inset} Z"
        fill="none" stroke="#D9D9D4" stroke-width="${Math.max(2, Math.round(micro * 0.35))}"/>
  <rect x="${barX}" y="${inset}" width="${Math.round(w * 0.16)}" height="${Math.round(h * 0.012)}" fill="${hex}"/>
  <g fill="${hex}" opacity="0.85">
    <circle cx="${cx}" cy="${cy - fs * 1.15}" r="${Math.round(fs * 0.42)}" fill="none" stroke="${hex}" stroke-width="${Math.max(3, Math.round(fs * 0.07))}"/>
    <circle cx="${cx}" cy="${cy - fs * 1.15}" r="${Math.round(fs * 0.12)}"/>
  </g>
  <text x="${cx}" y="${cy + fs * 0.1}" text-anchor="middle" font-family="'Arial Black','Helvetica Neue',Arial,sans-serif"
        font-size="${fs}" font-weight="900" letter-spacing="${Math.round(fs * 0.06)}" fill="#2E286B">${label}</text>
  <text x="${cx}" y="${cy + fs * 0.72}" text-anchor="middle" font-family="Arial,'Helvetica Neue',sans-serif"
        font-size="${fsSub}" letter-spacing="${Math.round(fsSub * 0.28)}" fill="#5F5F5F">${sub}</text>
  <text x="${cx}" y="${h - inset - micro * 0.4}" text-anchor="middle" font-family="Arial,'Helvetica Neue',sans-serif"
        font-size="${micro}" letter-spacing="${Math.round(micro * 0.22)}" fill="#5F5F5F">REPLACE WITH EVENT PHOTOGRAPHY</text>
</svg>
`;
}

for (const slot of slots) {
  const out = join(root, slot.file);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, svg(slot), "utf8");
  console.log("wrote", slot.file);
}
