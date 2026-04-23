import Constants from 'expo-constants';

/**
 * Resolve API key for client-side Expo:
 * 1) EXPO_PUBLIC_ANTHROPIC_API_KEY — inlined by Metro from root `.env` (preferred)
 * 2) expo.extra.anthropicApiKey — from app.config.js at `expo start` / EAS
 * 3) ANTHROPIC_API_KEY — non-public fallback if ever injected into extra only
 */
function resolveAnthropicKey() {
  const fromExtra = Constants.expoConfig?.extra?.anthropicApiKey;
  const fromPublic = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  const fromEnv = process.env.ANTHROPIC_API_KEY;
  return String(fromPublic || fromExtra || fromEnv || '').trim();
}

/** Lite AI: OpenAI key from env (Metro inlines EXPO_PUBLIC_*). */
function resolveOpenAIKey() {
  const fromPublic = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  const fromExtra = Constants.expoConfig?.extra?.openaiApiKey;
  const fromEnv = process.env.OPENAI_API_KEY;
  return String(fromPublic || fromExtra || fromEnv || '').trim();
}

const LITE_OPENAI_MODEL = 'gpt-4o-mini';

/** Lite AI only: OpenAI Chat Completions (no Anthropic). */
async function openAiLiteRecipeRequest(userContent) {
  const apiKey = resolveOpenAIKey();
  if (!apiKey) {
    throw new Error(
      'Missing OpenAI API key. Set EXPO_PUBLIC_OPENAI_API_KEY in a root .env file and restart the dev server.'
    );
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: LITE_OPENAI_MODEL,
      max_tokens: 1400,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a professional chef. Reply with a single JSON object only, matching the user schema. No markdown, no code fences.',
        },
        { role: 'user', content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    let errBody = '';
    try {
      const ct = response.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const j = await response.json();
        errBody = typeof j === 'string' ? j : JSON.stringify(j);
      } else {
        errBody = await response.text();
      }
    } catch (e) {
      errBody = String(e?.message || e);
    }
    throw new Error(`OpenAI HTTP ${response.status}: ${errBody.slice(0, 240)}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text || typeof text !== 'string') {
    throw new Error('OpenAI response missing message content.');
  }
  return text;
}

async function anthropicPostMessages(body) {
  const apiKey = resolveAnthropicKey();
  if (__DEV__) {
    console.log('[kitchenClaude] ANTHROPIC key present:', Boolean(apiKey), 'length:', apiKey ? apiKey.length : 0);
    console.log('[kitchenClaude] POST https://api.anthropic.com/v1/messages (sending)');
  }
  if (!apiKey) {
    if (__DEV__) {
      console.log(
        '[kitchenClaude] Missing key: create .env with EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-... and restart Expo (full restart, not only reload).'
      );
    }
    throw new Error(
      'Missing Anthropic API key. Set EXPO_PUBLIC_ANTHROPIC_API_KEY in a root .env file and restart the dev server.'
    );
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (__DEV__) {
    console.log('[kitchenClaude] Anthropic response status:', response.status);
  }

  if (!response.ok) {
    let errBody = '';
    try {
      const ct = response.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const j = await response.json();
        errBody = typeof j === 'string' ? j : JSON.stringify(j);
      } else {
        errBody = await response.text();
      }
    } catch (e) {
      errBody = String(e?.message || e);
    }
    if (__DEV__) {
      console.log('[kitchenClaude] Anthropic error body (truncated):', errBody.slice(0, 800));
    }
    throw new Error(`Anthropic ${response.status}: ${errBody.slice(0, 240)}`);
  }

  return response.json();
}

export function parseChallengeJson(text) {
  const trimmed = (text || '').trim();
  const jsonCandidate = trimmed.startsWith('{')
    ? trimmed
    : (trimmed.match(/\{[\s\S]*\}/) || [null])[0];
  if (!jsonCandidate) throw new Error('No JSON object found in Claude response.');
  const parsed = JSON.parse(jsonCandidate);
  if (!parsed.emoji || !parsed.title || !parsed.description) {
    throw new Error('Claude response missing required fields.');
  }
  return parsed;
}

/** Lite flow: structured challenge + recipe JSON from OpenAI (gpt-4o-mini). */
export function parseLiteAiRecipeJson(text) {
  const trimmed = (text || '').trim();
  const jsonCandidate = trimmed.startsWith('{')
    ? trimmed
    : (trimmed.match(/\{[\s\S]*\}/) || [null])[0];
  if (!jsonCandidate) throw new Error('No JSON object found in Lite AI response.');
  const parsed = JSON.parse(jsonCandidate);
  const need = ['challengeTitle', 'dishName', 'shortDescription', 'cookTime', 'ingredients', 'steps'];
  for (const k of need) {
    if (parsed[k] == null) throw new Error(`Lite AI JSON missing field: ${k}`);
  }
  if (!Array.isArray(parsed.ingredients) || !Array.isArray(parsed.steps)) {
    throw new Error('ingredients and steps must be arrays.');
  }
  return {
    challengeTitle: String(parsed.challengeTitle).trim(),
    dishName: String(parsed.dishName).trim(),
    shortDescription: String(parsed.shortDescription).trim(),
    cookTime: Math.max(1, Math.min(180, Math.floor(Number(parsed.cookTime)) || 20)),
    ingredients: parsed.ingredients.map((x) => String(x).trim()).filter(Boolean),
    steps: parsed.steps.map((x) => String(x).trim()).filter(Boolean),
  };
}

export async function generateLiteChallengeRecipe({
  cuisineType,
  budget,
  skillLevel,
  cookTimeTarget,
}) {
  if (__DEV__) {
    console.log('[LITE AI] provider: OpenAI');
    const k = resolveOpenAIKey();
    console.log('[LITE AI] request start', 'keyPresent:', Boolean(k), 'keyLen:', k ? k.length : 0);
  }
  const userContent = `Create ONE specific cooking challenge and recipe for a casual multiplayer game.

CONSTRAINTS (must honor):
- Cuisine focus: ${cuisineType}
- Ingredient budget: $${budget} USD total (keep ingredients realistic for this budget)
- Skill level: ${skillLevel}
- Target active cooking time: about ${cookTimeTarget} minutes (set cookTime to an integer minutes close to this)

Return a JSON object with exactly these keys:
{
  "challengeTitle": "short punchy name for the round",
  "dishName": "specific dish players will cook",
  "shortDescription": "2 sentences max, exciting, sets the scene",
  "cookTime": integer minutes (5-120),
  "ingredients": ["quantity + ingredient", ... at least 5 items],
  "steps": ["clear step", ... at least 4 steps]
}`;
  try {
    const text = await openAiLiteRecipeRequest(userContent);
    const parsed = parseLiteAiRecipeJson(text);
    if (__DEV__) console.log('[LITE AI] response success');
    return parsed;
  } catch (e) {
    if (__DEV__) console.log('[LITE AI] response fail:', String(e?.message || e).slice(0, 400));
    throw e;
  }
}

export async function fetchChallengePrompt({ cuisineType, budget, skillLevel }) {
  const data = await anthropicPostMessages({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: `Generate a fun cooking challenge for a party game. Cuisine: ${cuisineType}, Budget: $${budget}, Skill level: ${skillLevel}. Return only raw JSON with these exact fields: emoji (one emoji), title (short fun challenge name, max 6 words), description (2-3 sentences describing the challenge). No markdown, no backticks, just the JSON object.`,
      },
    ],
  });
  const text = data?.content?.[0]?.text;
  return parseChallengeJson(text);
}
