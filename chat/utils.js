const crypto = require("crypto");
const MaskIDPrefix = process.env.Prefix || "awc";

function generateChatId() {
  return crypto.randomUUID();
}

function maskChatId(chatId) {
  return `${MaskIDPrefix}-${chatId.slice(0, 4)}****${chatId.slice(-4)}`;
}

module.exports = { generateChatId, maskChatId };
