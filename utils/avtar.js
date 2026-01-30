const fs = require("fs");
const path = require("path");
const Users = require("../models/users");
const PROFILE_DIR = path.join(__dirname, "../uploads/profile");
const COLORS = [
  "#4290EC",
  "#A64DD9",
  "#F07969",
  "#F2A04C",
  "#ED8AC7",
  "#56C6E8",
];


function hashString(str = "") {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function AvatarSvg(name = "") {
  const letter = name?.trim()?.[0]?.toUpperCase() || "?";

  const hash = hashString(name);
  const bgIndex = hash % COLORS.length;

  let borderIndex = (bgIndex + 2) % COLORS.length;
  if (borderIndex === bgIndex) {
    borderIndex = (bgIndex + 1) % COLORS.length;
  }

  const bg = COLORS[bgIndex];
  const Avatar = `
<svg xmlns="http://www.w3.org/2000/svg"
     width="256"
     height="256"
     viewBox="0 0 256 256"
     preserveAspectRatio="xMidYMid meet">

  <defs>
    <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      ${COLORS
      .filter(c => c !== bg)
      .map((color, i, arr) => {
        const offset = Math.round((i / (arr.length - 1)) * 100);
        return `<stop offset="${offset}%" stop-color="${color}" />`;
      })
      .join("")}
    </linearGradient>
  </defs>

  <!-- Border ring -->
  <circle
    cx="128"
    cy="128"
    r="118"
    fill="none"
    stroke="url(#borderGradient)"
    stroke-width="8"
  />

  <!-- Background -->
  <circle
    cx="128"
    cy="128"
    r="108"
    fill="${bg}"
  />

  <!-- Letter -->
  <text
    x="50%"
    y="52%"
    text-anchor="middle"
    dominant-baseline="middle"
    font-size="120"
    font-weight="700"
    fill="#ffffff"
    font-family="Inter, system-ui, -apple-system, sans-serif">
    ${letter}
  </text>

</svg>
`.trim();


  return Avatar;
}

async function replacePhoto(userId, file) {
  if (!file) {
    const err = new Error("No file uploaded");
    err.status = 400;
    throw err;
  }

  const [rows] = await Users.findById(userId);
  if (!rows.length) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }

  const oldPhoto = rows[0].photo;

  if (oldPhoto) {
    const oldPath = path.join(PROFILE_DIR, oldPhoto);
    if (fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }
  }

  await Users.updatePhoto(userId, file.filename);

  return {
    photo: file.filename,
    updated_at: new Date()
  };
}


module.exports = { AvatarSvg, replacePhoto };
