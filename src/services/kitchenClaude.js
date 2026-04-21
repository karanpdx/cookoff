const ANTHROPIC_KEY =
  'DEa4sHcIC4rKJ_nu9ZE7GGvUFwXaBrP9cVpVCiL44WTtentlC1jsLZ05Epcjhopohsc4SrTixZwzXHx3PKHe-A-auJM1wAA';

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

export async function fetchChallengePrompt({ cuisineType, budget, skillLevel }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `Generate a fun cooking challenge for a party game. Cuisine: ${cuisineType}, Budget: $${budget}, Skill level: ${skillLevel}. Return only raw JSON with these exact fields: emoji (one emoji), title (short fun challenge name, max 6 words), description (2-3 sentences describing the challenge). No markdown, no backticks, just the JSON object.`,
        },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Anthropic request failed: ${response.status}`);
  const data = await response.json();
  const text = data?.content?.[0]?.text;
  return parseChallengeJson(text);
}
