const messages = [];
const blockedChatIds = new Set();

function saveMessage(msg) {
  messages.push(msg);
}
function addMessage(msg) {
  messages.push(msg);
}

function getMessages(limit = 100) {
  return messages;
}

function blockChatId(chatId) {
  blockedChatIds.add(chatId);
}

function isBlocked(chatId) {
  return blockedChatIds.has(chatId);
}

module.exports = {
  saveMessage,
  getMessages,
  blockChatId,
  isBlocked,
  addMessage
};
