import pricingData from '../data/pricing.json';

const LLM_PRICING = pricingData.llm as Record<string, { input: number; output: number }>;

export interface TokenUsage {
  prompt: number;
  completion: number;
}

export interface StreamChunk {
  content?: string;
  usage?: TokenUsage;
  done?: boolean;
}

export interface RawScene {
  script: string;
  image_description: string;
}

async function* createStreamGenerator(
  response: Response
): AsyncGenerator<StreamChunk> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API request failed: ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process complete lines
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

      const data = trimmedLine.slice(6);
      if (data === '[DONE]') {
        yield { done: true };
        return;
      }

      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        const usage = parsed.usage;

        if (content) {
          yield { content };
        }
        if (usage) {
          yield {
            usage: {
              prompt: usage.prompt_tokens,
              completion: usage.completion_tokens,
            },
          };
        }
      } catch {
        // Skip malformed JSON lines
      }
    }
  }
}

export async function* streamOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number
): AsyncGenerator<StreamChunk> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: true,
      stream_options: { include_usage: true },
      temperature,
    }),
  });

  yield* createStreamGenerator(response);
}

export async function* streamDeepSeek(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number
): AsyncGenerator<StreamChunk> {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: true,
      temperature,
    }),
  });

  yield* createStreamGenerator(response);
}

export function streamLLM(
  provider: 'openai' | 'deepseek',
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number
): AsyncGenerator<StreamChunk> {
  if (provider === 'deepseek') {
    return streamDeepSeek(apiKey, model, systemPrompt, userPrompt, temperature);
  }
  return streamOpenAI(apiKey, model, systemPrompt, userPrompt, temperature);
}

export function parseSceneBuffer(buffer: string): { scenes: RawScene[]; remainder: string } {
  // Try to find complete JSON objects in the buffer
  // LLM should output: [{"script": "...", "image_description": "..."}, ...]

  const scenes: RawScene[] = [];

  // Find the start of the array
  const arrayStart = buffer.indexOf('[');
  if (arrayStart === -1) return { scenes: [], remainder: buffer };

  let searchStart = arrayStart + 1;
  let lastParsedEnd = arrayStart;

  while (true) {
    // Find next object start
    const objStart = buffer.indexOf('{', searchStart);
    if (objStart === -1) break;

    // Find matching closing brace
    let depth = 0;
    let objEnd = -1;
    let inString = false;
    let escape = false;

    for (let i = objStart; i < buffer.length; i++) {
      const char = buffer[i];

      if (escape) {
        escape = false;
        continue;
      }

      if (char === '\\') {
        escape = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (char === '{') depth++;
      if (char === '}') depth--;

      if (depth === 0) {
        objEnd = i;
        break;
      }
    }

    if (objEnd === -1) break; // Incomplete object

    try {
      const objStr = buffer.slice(objStart, objEnd + 1);
      const obj = JSON.parse(objStr);
      if (obj.script !== undefined && obj.image_description !== undefined) {
        scenes.push({
          script: obj.script,
          image_description: obj.image_description,
        });
        lastParsedEnd = objEnd + 1;
      }
    } catch {
      // Malformed JSON, skip this object
    }

    searchStart = objEnd + 1;
  }

  return { scenes, remainder: buffer.slice(lastParsedEnd) };
}

export function calculateCost(
  model: string,
  tokenUsage: TokenUsage
): number {
  const pricing = LLM_PRICING[model];
  const fallback = LLM_PRICING['gpt-4o'] || { input: 2.50, output: 10.00 };
  const rates = pricing || fallback;

  const promptCost = (tokenUsage.prompt / 1_000_000) * rates.input;
  const completionCost = (tokenUsage.completion / 1_000_000) * rates.output;

  return promptCost + completionCost;
}
