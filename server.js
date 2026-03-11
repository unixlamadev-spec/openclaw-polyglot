require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3013;
const LIGHTNINGPROX_URL = 'https://lightningprox.com/v1/messages';
const AIPROX_REGISTER_URL = 'https://aiprox.dev/api/agents/register';

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'polyglot' });
});

// Capabilities endpoint
app.get('/v1/capabilities', (req, res) => {
  res.json({
    capabilities: ['translation', 'language-detection', 'cultural-notes', 'formality-control'],
    accepts: ['text', 'target_language (optional)', 'formality (optional): formal|informal|neutral'],
    returns: ['translated', 'language', 'target_language', 'notes', 'formality']
  });
});

// Main task endpoint
app.post('/v1/task', async (req, res) => {
  const { task, text, target_language, formality } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }

  const resolvedTarget = target_language || 'English';
  const resolvedFormality = ['formal', 'informal', 'neutral'].includes(formality) ? formality : 'neutral';

  console.log(`[POLYGLOT] Target: ${resolvedTarget}, Formality: ${resolvedFormality}`);
  console.log(`[POLYGLOT] Text: ${text.slice(0, 100)}...`);

  const formalityInstruction = resolvedFormality === 'neutral'
    ? ''
    : `Use a ${resolvedFormality} register in the translation.\n`;

  const prompt = `You are a professional translator. Translate the following text to ${resolvedTarget}.
${formalityInstruction}${task ? `Additional instructions: ${task}\n` : ''}
TEXT TO TRANSLATE:
${text}

Respond in JSON format only:
{
  "translated": "the translated text",
  "language": "detected source language",
  "notes": "any translation notes or cultural context (optional, can be empty string)"
}`;

  console.log('[DEBUG] Token:', process.env.LIGHTNINGPROX_TOKEN ? 'loaded' : 'MISSING');
  if (!process.env.LIGHTNINGPROX_TOKEN) {
    return res.status(500).json({ error: 'LIGHTNINGPROX_TOKEN not set' });
  }

  try {
    console.log('[POLYGLOT] Calling LightningProx...');
    const lpxRes = await fetch(LIGHTNINGPROX_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Spend-Token': process.env.LIGHTNINGPROX_TOKEN
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    console.log('[POLYGLOT] LightningProx status:', lpxRes.status);

    const responseText = await lpxRes.text();
    console.log('[DEBUG] Response:', responseText.slice(0, 300));

    if (!lpxRes.ok) {
      throw new Error(`LightningProx error: ${lpxRes.status} ${responseText}`);
    }

    const data = JSON.parse(responseText);
    const content = data.content?.[0]?.text || '';

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('[POLYGLOT] Translation complete');
        return res.json({
          translated: parsed.translated ?? '',
          language: parsed.language ?? '',
          target_language: resolvedTarget,
          notes: parsed.notes ?? '',
          formality: resolvedFormality
        });
      } catch (parseErr) {
        console.log('[POLYGLOT] JSON parse failed:', parseErr.message);
      }
    }

    // Fallback: return raw content
    res.json({
      translated: content,
      language: 'unknown',
      target_language: resolvedTarget,
      notes: 'Could not parse structured response',
      formality: resolvedFormality
    });
  } catch (err) {
    console.error('[POLYGLOT ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Register with AIProx on startup
async function registerWithAIProx() {
  try {
    const endpoint = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
    const res = await fetch(AIPROX_REGISTER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'polyglot',
        description: 'Professional translation agent. Provide text and optional target language (defaults to English). Supports formality control (formal/informal/neutral), source language auto-detection, and cultural notes.',
        capability: 'translation',
        rail: 'bitcoin-lightning',
        endpoint: `${endpoint}/v1/task`,
        price_per_call: 20,
        price_unit: 'sats'
      })
    });

    const data = await res.json();
    if (res.ok) {
      console.log('[REGISTER] Registered with AIProx:', data.name || 'polyglot');
    } else {
      console.log('[REGISTER] AIProx response:', data.error || data.message || 'already registered');
    }
  } catch (err) {
    console.log('[REGISTER] Could not register with AIProx:', err.message);
  }
}

app.listen(PORT, () => {
  console.log(`[POLYGLOT] Running on port ${PORT}`);
  if (process.env.AUTO_REGISTER === 'true') {
    registerWithAIProx();
  }
});
