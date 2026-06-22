import { env } from '../../../config/env.js';
import { AIProvider } from './ai-provider.interface.js';

interface DeepSeekResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

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

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as DeepSeekResponse;
    return data.choices[0]?.message?.content || '';
  }

  async generateJSON<T>(prompt: string, systemPrompt?: string): Promise<T> {
    const messages: { role: string; content: string }[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.5,
        max_tokens: 1536,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as DeepSeekResponse;
    const content = data.choices[0]?.message?.content || '{}';

    try {
      return JSON.parse(content) as T;
    } catch {
      // Retry with explicit JSON instruction
      const retryResponse = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            ...messages,
            {
              role: 'assistant',
              content,
            },
            {
              role: 'user',
              content:
                'Your previous response was not valid JSON. Please output ONLY valid JSON with no markdown formatting, no explanation, no code blocks.',
            },
          ],
          temperature: 0.3,
          max_tokens: 1536,
        }),
      });

      if (!retryResponse.ok) {
        throw new Error(`DeepSeek retry failed: ${await retryResponse.text()}`);
      }

      const retryData = (await retryResponse.json()) as DeepSeekResponse;
      const retryContent = retryData.choices[0]?.message?.content || '{}';
      return JSON.parse(retryContent) as T;
    }
  }
}
