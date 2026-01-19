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

function getChannelUsername(url) {
  const match = url.match(/t\.me\/([^\/]+)/);
  return match ? '@' + match[1] : null;
}

function getChannelUpdates(token, channelUsername) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${token}/getUpdates?limit=100&offset=-100`,
      method: 'GET'
    };

    const request = https.request(options, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.ok && result.result.length > 0) {
            for (let i = result.result.length - 1; i >= 0; i--) {
              const update = result.result[i];
              if (update.channel_post && update.channel_post.chat.username === channelUsername.replace('@', '')) {
                resolve(update.channel_post.message_id);
                return;
              }
            }
          }
          reject(new Error('No message found in channel'));
        } catch (e) {
          reject(e);
        }
      });
    });

    request.on('error', reject);
    request.end();
  });
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
  let messageIds = query.message ? query.message.split(',').map(m => m.trim()) : [];
  const channelUrl = query.channel;
  const reactType = query.reaction || query.react || 'mix';

  if (!tokens.length) {
    return res.status(400).json({ error: 'No bot tokens provided' });
  }

  if (!chatIds.length && !channelUrl) {
    return res.status(400).json({ error: 'No chat IDs or channel URL provided' });
  }

  if (!['positive', 'negative', 'mix'].includes(reactType)) {
    return res.status(400).json({ error: 'Invalid reaction type. Use: positive, negative, or mix' });
  }

  let finalChatIds = chatIds;
  
  if (channelUrl) {
    const channelUsername = getChannelUsername(channelUrl);
    if (!channelUsername) {
      return res.status(400).json({ error: 'Invalid channel URL' });
    }
    finalChatIds = [channelUsername];

    if (!messageIds.length) {
      try {
        const latestMessageId = await getChannelUpdates(tokens[0], channelUsername);
        messageIds = [latestMessageId.toString()];
      } catch (error) {
        return res.status(400).json({ error: 'Could not fetch latest message from channel', details: error.message });
      }
    }
  }

  if (!messageIds.length) {
    return res.status(400).json({ error: 'No message IDs provided or found' });
  }

  const usedReactions = new Map();
  const combinations = [];
  
  tokens.forEach(token => {
    finalChatIds.forEach(chatId => {
      messageIds.forEach(messageId => {
        const key = `${chatId}-${messageId}`;
        if (!usedReactions.has(key)) {
          usedReactions.set(key, new Set());
        }
        
        let reaction = getRandomReaction(reactType);
        const usedSet = usedReactions.get(key);
        let attempts = 0;
        const maxPool = reactType === 'positive' ? positiveReactions.length : 
                        reactType === 'negative' ? negativeReactions.length : allReactions.length;
        
        while (usedSet.has(reaction) && usedSet.size < maxPool && attempts < 100) {
          reaction = getRandomReaction(reactType);
          attempts++;
        }
        
        usedSet.add(reaction);
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
      message_id: parseInt(messageId),
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
