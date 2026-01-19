import https from 'https';
import { parse } from 'url';

const positiveReactions = ["👍", "❤", "🔥", "🥰", "👏", "😁", "🎉", "🤩", "🙏", "👌", "🕊", "😍", "🐳", "❤‍🔥", "🌭", "💯", "🤣", "⚡", "🍌", "🏆", "😘", "🍓", "🍾", "💋", "😇", "🤝", "✍", "🤗", "🫡", "🎅", "🎄", "☃", "🆒", "💘", "🦄", "😎"];
const negativeReactions = ["👎", "🤔", "🤯", "😱", "🤬", "😢", "🤮", "💩", "🤡", "🥱", "🥴", "💔", "🤨", "😐", "🖕", "😈", "😴", "😭", "😨", "🙈", "🙉", "🙊", "😡", "🗿"];
const allReactions = ["👍", "👎", "❤", "🔥", "🥰", "👏", "😁", "🤔", "🤯", "😱", "🤬", "😢", "🎉", "🤩", "🤮", "💩", "🙏", "👌", "🕊", "🤡", "🥱", "🥴", "😍", "🐳", "❤‍🔥", "🌚", "🌭", "💯", "🤣", "⚡", "🍌", "🏆", "💔", "🤨", "😐", "🍓", "🍾", "💋", "🖕", "😈", "😴", "😭", "🤓", "👻", "👨‍💻", "👀", "🎃", "🙈", "😇", "😨", "🤝", "✍", "🤗", "🫡", "🎅", "🎄", "☃", "💅", "🤪", "🗿", "🆒", "💘", "🙉", "🦄", "😘", "💊", "🙊", "😎", "👾", "🤷‍♂", "🤷", "🤷‍♀", "😡"];

function getRandomReaction(type) {
  let pool;
  if (type === 'positive') {
    pool = positiveReactions;
  } else if (type === 'negative') {
    pool = negativeReactions;
  } else {
    pool = allReactions;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

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
  const reactType = query.react || 'mix';

  if (!tokens.length) {
    return res.status(400).json({ error: 'No bot tokens provided' });
  }

  if (!chatIds.length) {
    return res.status(400).json({ error: 'No chat IDs provided' });
  }

  if (!messageIds.length) {
    return res.status(400).json({ error: 'No message IDs provided' });
  }

  if (!['positive', 'negative', 'mix'].includes(reactType)) {
    return res.status(400).json({ error: 'Invalid react type. Use: positive, negative, or mix' });
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
    requestData = {};
  }

  const usedReactions = new Set();
  const combinations = [];
  tokens.forEach(token => {
    chatIds.forEach(chatId => {
      messageIds.forEach(messageId => {
        let reaction = getRandomReaction(reactType);
        while (usedReactions.has(reaction) && usedReactions.size < allReactions.length) {
          reaction = getRandomReaction(reactType);
        }
        usedReactions.add(reaction);
        combinations.push({ token, chatId, messageId, reaction });
      });
    });
  });

  const results = await Promise.allSettled(
    combinations.map(combo => makeRequest(combo.token, combo.chatId, combo.messageId, combo.reaction))
  );

  const response = results.map((result, index) => ({
    token: combinations[index].token,
    chat_id: combinations[index].chatId,
    message_id: combinations[index].messageId,
    reaction: combinations[index].reaction,
    status: result.status,
    data: result.status === 'fulfilled' ? result.value : result.reason
  }));

  res.status(200).json({ results: response });
};

function makeRequest(token, chatId, messageId, reaction) {
  return new Promise((resolve, reject) => {
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      reaction: [{ type: "emoji", emoji: reaction }],
      is_big: false
    };
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
```

**Usage examples:**
```
GET https://your-url.vercel.app/?token=TOKEN1,TOKEN2&chat=CHAT1&message=MSG1&react=positive
GET https://your-url.vercel.app/?token=TOKEN1,TOKEN2&chat=CHAT1&message=MSG1&react=negative
GET https://your-url.vercel.app/?token=TOKEN1,TOKEN2&chat=CHAT1&message=MSG1&react=mix
