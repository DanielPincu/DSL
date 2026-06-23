export interface AIProvider {
  generateChat(prompt: string, systemPrompt?: string): Promise<string>;
  generateJSON<T>(prompt: string, systemPrompt?: string): Promise<T>;
}
