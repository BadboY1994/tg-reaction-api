import https from 'https';
import { parse } from 'url';

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { query } = parse(req.url, true);
  const tokens = query.token ? query.token.split(',').map(t => t.trim()) : [];
  const chatIds = query.chat ? query.chat.split(',').map(c => c.trim()) : [];
  const messageIds = query.message ? query.message.split(',').map(m => m.trim()) : [];

  if (!tokens.length) {
    return res.status(400).json({ error: 'No bot tokens provided' });
  }

  if (!chatIds.length) {
    return res.status(400).json({ error: 'No chat IDs provided' });
  }

  if (!messageIds.length) {
    return res.status(400).json({ error: 'No message IDs provided' });
  }

  const body = await new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(data));
  });

  let requestData;
  try {
    requestData = body ? JSON.parse(body) : {};
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const combinations = [];
  tokens.forEach(token => {
    chatIds.forEach(chatId => {
      messageIds.forEach(messageId => {
        combinations.push({ token, chatId, messageId });
      });
    });
  });

  const results = await Promise.allSettled(
    combinations.map(combo => makeRequest(combo.token, combo.chatId, combo.messageId, requestData))
  );

  const response = results.map((result, index) => ({
    token: combinations[index].token,
    chat_id: combinations[index].chatId,
    message_id: combinations[index].messageId,
    status: result.status,
    data: result.status === 'fulfilled' ? result.value : result.reason
  }));

  res.status(200).json({ results: response });
};

function makeRequest(token, chatId, messageId, data) {
  return new Promise((resolve, reject) => {
    const payload = { ...data, chat_id: chatId, message_id: messageId };
    const postData = JSON.stringify(payload);
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${token}/setMessageReaction`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const request = https.request(options, (response) => {
      let responseData = '';
      response.on('data', chunk => responseData += chunk);
      response.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (e) {
          resolve(responseData);
        }
      });
    });

    request.on('error', reject);
    request.write(postData);
    request.end();
  });
}
