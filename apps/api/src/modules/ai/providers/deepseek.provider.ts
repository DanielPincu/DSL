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

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: this.model, messages, temperature: 0.7, max_tokens: 1024 }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'unknown error');
      throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as { choices: { message: { content: string } }[] };
    return data.choices[0]?.message?.content || '';
  }

  async generateJSON<T>(prompt: string, systemPrompt?: string): Promise<T> {
    const messages: { role: string; content: string }[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    // Make the request
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.5,
        max_tokens: 1536,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'unknown error');
      throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
    }

    // Extract content from the response
    let content: string;
    try {
      const data = await response.json() as { choices: { message: { content: string } }[] };
      content = data.choices[0]?.message?.content || '{}';
    } catch {
      throw new Error('DeepSeek returned invalid JSON response');
    }

    // Try to parse, with one retry
    return this.tryParseJSON<T>(content, messages);
  }

  private async tryParseJSON<T>(content: string, previousMessages: { role: string; content: string }[]): Promise<T> {
    // First attempt
    try {
      return JSON.parse(content) as T;
    } catch {
      // Retry with explicit instruction
      try {
        const retryResponse = await fetch(`${this.baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
          body: JSON.stringify({
            model: this.model,
            messages: [
              ...previousMessages,
              { role: 'assistant', content },
              { role: 'user', content: 'Your previous response was not valid JSON. Output ONLY valid JSON with no markdown, no explanation, no code blocks.' },
            ],
            temperature: 0.3,
            max_tokens: 1536,
          }),
        });

        if (!retryResponse.ok) {
          throw new Error(`Retry failed: ${await retryResponse.text().catch(() => 'unknown')}`);
        }

        const retryData = await retryResponse.json() as { choices: { message: { content: string } }[] };
        const retryContent = retryData.choices[0]?.message?.content || '{}';

        try {
          return JSON.parse(retryContent) as T;
        } catch {
          throw new Error('AI returned invalid JSON after retry');
        }
      } catch (err) {
        // If retry also fails (e.g. rate limited), throw a clean error
        if (err instanceof Error && err.message !== 'AI returned invalid JSON after retry') {
          throw err; // pass through network/rate-limit errors
        }
        throw new Error('Failed to get valid JSON from AI after retry');
      }
    }
  }
}
