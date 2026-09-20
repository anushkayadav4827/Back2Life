const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function verifyLLM() {
  console.log('🔄 Running deploy-time LLM sanity check...');
  
  const apiKey = process.env.GROQ_API_KEY;
  const modelId = process.env.GROQ_MODEL_ID || 'openai/gpt-oss-120b';

  if (!apiKey) {
    console.error('❌ Error: GROQ_API_KEY is not set in .env');
    process.exit(1);
  }

  const payload = JSON.stringify({
    model: modelId,
    messages: [{ role: 'user', content: 'Ping. Reply with exactly "Pong" and nothing else.' }],
    max_tokens: 10,
    temperature: 0.1
  });

  const options = {
    hostname: 'api.groq.com',
    path: '/openai/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ Success: Model '${modelId}' is active and responding (Status: 200).`);
          resolve();
        } else {
          console.error(`❌ CRITICAL FAILURE: Model '${modelId}' returned status ${res.statusCode}.`);
          console.error('Response details:', data);
          console.error(`\nDeploy aborted. The model ID '${modelId}' may be decommissioned or invalid for your API key. Update GROQ_MODEL_ID in .env before deploying.`);
          process.exit(1);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`❌ Network error contacting Groq API:`, e);
      process.exit(1);
    });

    req.write(payload);
    req.end();
  });
}

verifyLLM();
