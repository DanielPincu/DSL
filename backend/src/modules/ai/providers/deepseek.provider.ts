import { env } from '../../../config/env.js';
import { AIProvider } from './ai-provider.interface.js';

export class DeepSeekProvider implements AIProvider {
  private baseUrl: string;
  private model: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = env.DEEPSEEK_BASE_URL;
    this.model = env.DEEPSEEK_MODEL;
    this.apiKey = env.DEEPSEEK_API_KEY;
  }

  async generateChat(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: { role: string; content: string }[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const body = JSON.stringify({ model: this.model, messages, temperature: 0.7, max_tokens: 1024 });
    const response = await this.fetchWithRetry(body);

    const data = await response.json() as { choices: { message: { content: string } }[] };
    return data.choices[0]?.message?.content || '';
  }

  async generateJSON<T>(prompt: string, systemPrompt?: string): Promise<T> {
    const messages: { role: string; content: string }[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const body = JSON.stringify({
      model: this.model,
      messages,
      temperature: 0.5,
      max_tokens: 1536,
      response_format: { type: 'json_object' },
    });

    const response = await this.fetchWithRetry(body);

    let content: string;
    try {
      const data = await response.json() as { choices: { message: { content: string } }[] };
      content = data.choices[0]?.message?.content || '{}';
    } catch {
      throw new Error('DeepSeek returned invalid JSON response');
    }

    return this.tryParseJSON<T>(content, messages);
  }

  /** Fetch with retry logic for 429 and 5xx errors */
  private async fetchWithRetry(body: string, attempt = 1): Promise<Response> {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body,
    });

    if (response.ok) return response;

    // 429 = rate limited — retry with backoff
    if (response.status === 429 && attempt <= 3) {
      const retryAfter = response.headers.get('Retry-After');
      const delayMs = retryAfter ? parseInt(retryAfter) * 1000 : Math.min(1000 * Math.pow(2, attempt - 1), 4000);
      console.warn(`DeepSeek rate limited (429). Retry ${attempt}/3 in ${delayMs}ms...`);
      await new Promise((r) => setTimeout(r, delayMs + Math.random() * 500));
      return this.fetchWithRetry(body, attempt + 1);
    }

    // 5xx = server error — retry once after short delay
    if (response.status >= 500 && response.status < 600 && attempt <= 2) {
      console.warn(`DeepSeek server error (${response.status}). Retry ${attempt}/2...`);
      await new Promise((r) => setTimeout(r, 1000));
      return this.fetchWithRetry(body, attempt + 1);
    }

    const errorText = await response.text().catch(() => 'unknown error');
    throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
  }

  private async tryParseJSON<T>(content: string, previousMessages: { role: string; content: string }[]): Promise<T> {
    try {
      return JSON.parse(content) as T;
    } catch {
      // Retry with explicit instruction
      try {
        const retryBody = JSON.stringify({
          model: this.model,
          messages: [
            ...previousMessages,
            { role: 'assistant', content },
            {
              role: 'user',
              content:
                'Your previous response was not valid JSON. Output ONLY valid JSON with no markdown, no explanation, no code blocks.',
            },
          ],
          temperature: 0.3,
          max_tokens: 1536,
        });

        const retryResponse = await this.fetchWithRetry(retryBody);
        const retryData = await retryResponse.json() as { choices: { message: { content: string } }[] };
        const retryContent = retryData.choices[0]?.message?.content || '{}';

        try {
          return JSON.parse(retryContent) as T;
        } catch {
          throw new Error('AI returned invalid JSON after retry');
        }
      } catch (err) {
        if (err instanceof Error && err.message !== 'AI returned invalid JSON after retry') {
          throw err;
        }
        throw new Error('Failed to get valid JSON from AI after retry');
      }
    }
  }
}
