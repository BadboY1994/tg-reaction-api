const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  '360046090898-rsp1okgmef2f82htuhm5jhvmf78p7n3c.apps.googleusercontent.com',
  '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',
  process.env.REDIRECT_URI || 'https://tg-token-finder.vercel.app/callback'
);

oauth2Client.setCredentials({
  refresh_token: process.env.YOUTUBE_REFRESH_TOKEN
});

const youtube = google.youtube({
  version: 'v3',
  auth: oauth2Client
});

async function getVideoComments(videoId) {
  try {
    const response = await youtube.commentThreads.list({
      part: 'snippet',
      videoId: videoId,
      maxResults: 100,
      order: 'time'
    });
    return response.data.items || [];
  } catch (error) {
    console.error('Error fetching comments:', error.message);
    return [];
  }
}

async function replyToComment(commentId, replyText) {
  try {
    const response = await youtube.comments.insert({
      part: 'snippet',
      requestBody: {
        snippet: {
          parentId: commentId,
          textOriginal: replyText
        }
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error replying to comment:', error.message);
    return null;
  }
}

function parseConfig(configString) {
  const configs = {};
  const entries = configString.split('|||');
  
  entries.forEach(entry => {
    const params = new URLSearchParams(entry);
    const videoUrl = params.get('video');
    const word = params.get('word');
    const reply = params.get('reply');
    
    if (videoUrl && word && reply) {
      const videoId = extractVideoId(videoUrl);
      if (videoId) {
        if (!configs[videoId]) {
          configs[videoId] = [];
        }
        configs[videoId].push({
          word: word.toLowerCase(),
          reply: reply.replace(/\\n/g, '\n')
        });
      }
    }
  });
  
  return configs;
}

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

const processedComments = new Set();

async function checkAndReply(videoId, rules) {
  try {
    const comments = await getVideoComments(videoId);
    
    for (const thread of comments) {
      const comment = thread.snippet.topLevelComment;
      const commentId = comment.id;
      const commentText = comment.snippet.textDisplay.toLowerCase();
      
      if (processedComments.has(commentId)) continue;
      
      for (const rule of rules) {
        if (commentText.includes(rule.word)) {
          const result = await replyToComment(commentId, rule.reply);
          if (result) {
            processedComments.add(commentId);
            console.log(`Replied to comment ${commentId} on video ${videoId}`);
          }
          break;
        }
      }
    }
  } catch (error) {
    console.error(`Error processing video ${videoId}:`, error.message);
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET' && req.url === '/') {
    res.status(200).send('YouTube Auto Reply System Running');
    return;
  }

  if (req.method === 'GET' && req.url === '/auth') {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/youtube.force-ssl'],
      prompt: 'consent'
    });
    res.status(200).json({ 
      authUrl,
      redirectUri: process.env.REDIRECT_URI || 'https://tg-token-finder.vercel.app/callback',
      note: 'Make sure this redirect URI is added in Google Cloud Console'
    });
    return;
  }

  if (req.method === 'GET' && req.url.startsWith('/callback')) {
    const urlParams = new URLSearchParams(req.url.split('?')[1]);
    const code = urlParams.get('code');
    
    if (!code) {
      res.status(400).json({ error: 'No code provided' });
      return;
    }

    try {
      const { tokens } = await oauth2Client.getToken(code);
      res.status(200).json({ 
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token,
        message: 'Add refresh_token to YOUTUBE_REFRESH_TOKEN in Vercel environment variables'
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
    return;
  }
  
  if (req.method === 'GET' && req.url === '/api/trigger') {
    const configString = process.env.VIDEO_CONFIG;
    if (!configString) {
      res.status(500).json({ error: 'VIDEO_CONFIG not set' });
      return;
    }

    if (!process.env.YOUTUBE_REFRESH_TOKEN) {
      res.status(500).json({ error: 'YOUTUBE_REFRESH_TOKEN not set' });
      return;
    }
    
    const configs = parseConfig(configString);
    let processed = 0;
    
    for (const [videoId, rules] of Object.entries(configs)) {
      await checkAndReply(videoId, rules);
      processed++;
    }
    
    res.status(200).json({ 
      message: 'Check completed',
      videosProcessed: processed
    });
    return;
  }
  
  res.status(404).send('Not Found');
};
