import { AIProvider } from './providers/ai-provider.interface.js';
import { DeepSeekProvider } from './providers/deepseek.provider.js';
import type { AIFeedback, CEFRLevel, Message, Correction } from '@dls/shared';
import { env } from '../../config/env.js';

let provider: AIProvider | null = null;

function getProvider(): AIProvider {
  if (!provider) {
    if (env.DEEPSEEK_API_KEY && env.DEEPSEEK_API_KEY !== 'sk-placeholder') {
      provider = new DeepSeekProvider();
    } else {
      // Fallback mock provider for development when no API key is set
      provider = new MockProvider();
    }
  }
  return provider;
}

/**
 * Mock provider for development without API keys.
 * Returns realistic-sounding Danish responses for testing.
 */
class MockProvider implements AIProvider {
  async generateChat(_prompt: string, _systemPrompt?: string): Promise<string> {
    return this.generateMockReply();
  }

  async generateJSON<T>(_prompt: string, _systemPrompt?: string): Promise<T> {
    return {
      npcReply: this.generateMockReply(),
      corrections: [],
      feedback: 'Godt klaret! (Well done!) Keep practicing your Danish.',
      score: 75,
      detectedMistakes: [],
    } as T;
  }

  private generateMockReply(): string {
    const replies = [
      'Hej! Det lyder godt. Fortæl mig mere om din dag.',
      'Ja, selvfølgelig. Jeg forstår godt, hvad du mener.',
      'Tak for din besked. Lad mig spørge dig lidt mere.',
      'Det er helt fint. Prøv at sige det på en anden måde.',
      'Godt spørgsmål! Jeg vil gerne hjælpe dig.',
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }
}

export function getAIProvider(): AIProvider {
  return getProvider();
}

export function buildSystemPrompt(
  npcName: string,
  npcRole: string,
  scenarioPrompt: string,
  level: CEFRLevel,
  conversationHistory: Message[]
): string {
  const levelInstructions: Record<CEFRLevel, string> = {
    A1: 'Use very simple Danish with basic vocabulary. Speak slowly and clearly. Use present tense primarily. Provide English translations in parentheses for new words. Correct gently.',
    A2: 'Use simple Danish with common phrases. Introduce some past tense. Provide occasional English help for complex words. Correct major errors kindly.',
    B1: 'Use moderate Danish with everyday vocabulary. Use various tenses naturally. Explain corrections briefly in English. Only correct significant errors.',
    B2: 'Use natural Danish at near-native pace. Use idiomatic expressions. Correct subtle errors. Challenge the user with more complex topics.',
    C1: 'Use advanced Danish at fluent pace. Use idiomatic expressions, nuanced vocabulary, and complex sentence structures. Discuss abstract and specialised topics. Correct very subtle errors. Challenge the user with sophisticated discussions.',
  };

  const historySection =
    conversationHistory.length > 0
      ? `\n\nConversation so far:\n${conversationHistory
          .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
          .join('\n')}`
      : '';

  return `You are ${npcName}, a ${npcRole} in Denmark. You speak Danish.

Your personality: Friendly, patient, and encouraging. You help people practice Danish in realistic situations.

Scenario: ${scenarioPrompt}

Level instructions: ${levelInstructions[level]}

IMPORTANT RULES:
1. Speak primarily in Danish.
2. Adapt your language complexity to the user's level (${level}).
3. When the user makes mistakes, gently correct them.
4. Keep the conversation realistic for the scenario.
5. Explain corrections briefly in English when needed.
6. Keep responses concise (2-4 sentences typically).
7. Encourage the user to keep trying.
8. Stay in character as ${npcName} (${npcRole}) throughout.
9. End your response with a question to keep the conversation going.
10. If the user says "farvel" or "goodbye", wrap up the conversation naturally.${historySection}`;
}

export function buildNPCPrompt(userInput: string): string {
  return `The user said: "${userInput}"

Respond as your character in Danish. Remember to:
- Speak at the user's level
- Correct mistakes gently
- Keep the conversation realistic
- End with a question
- If saying goodbye, wrap up naturally`;
}

export const PLACEMENT_SYSTEM_PROMPT = `You are a Danish language assessment expert. Your job is to evaluate a Danish learner's level through natural conversation.

Rules:
1. Start the conversation in Danish with a simple greeting and question.
2. Ask 5-10 questions that range from simple to moderate difficulty.
3. Adapt your next question based on the user's previous answers.
4. After enough questions, evaluate the user across these dimensions:
   - vocabulary: breadth and appropriateness of word choice
   - grammar: sentence structure, verb conjugation, word order
   - complexity: ability to form complex sentences
   - fluency: flow and naturalness of responses
   - comprehension: understanding of your questions

Finally, provide your assessment as valid JSON.`;

export function buildPlacementPrompt(conversationHistory: Message[]): string {
  const history = conversationHistory
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n');

  return `Here is the placement conversation so far:

${history}

Based on this conversation, evaluate the user's Danish level. Respond with ONLY valid JSON in this exact format:
{
  "estimatedLevel": "A1" | "A2" | "B1" | "B2",
  "confidence": 0-100,
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "explanation": "Brief explanation of assessment"
}

If you haven't asked enough questions to assess properly, respond with just:
{
  "nextQuestion": "Your next Danish question here"
}

Do NOT include markdown, code blocks, or any text outside the JSON.`;
}

export function buildPracticePrompt(
  mistakes: { originalText: string; correctedText: string; explanation: string; type: string }[]
): string {
  const mistakeList = mistakes
    .map(
      (m, i) =>
        `${i + 1}. "${m.originalText}" → "${m.correctedText}" (${m.type}: ${m.explanation})`
    )
    .join('\n');

  return `The user has made these mistakes recently:

${mistakeList}

Create a practice scenario in Danish that naturally encourages the user to use these corrected forms.
The scenario should be a realistic Danish life situation.

Respond with JSON only:
{
  "scenario": "Description of the practice scenario",
  "openingLine": "Your opening Danish sentence to start the conversation",
  "targetPhrases": ["phrase1", "phrase2"]
}`;
}

export function buildConversationAIPrompt(
  userInput: string,
  npcName: string,
  npcRole: string,
  scenarioPrompt: string,
  level: CEFRLevel,
  conversationHistory: Message[]
): string {
  return `You are ${npcName}, a ${npcRole} in Denmark. You are helping someone practice Danish.

Scenario: ${scenarioPrompt}
User's approximate level: ${level}

Conversation history:
${conversationHistory.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}

The user just said: "${userInput}"

Respond in Danish ONLY. Never use English in your npcReply.
The user might write in English. If they do, you MUST act like a real Dane who DOES NOT understand English. Respond with confusion in Danish ONLY: "Undskyld, jeg forstår ikke engelsk. Kan du sige det på dansk?" Never guess what the English meant.
Correct mistakes naturally in the conversation, like a helpful friend would, but do NOT explain them in the reply.
Then provide your analysis as valid JSON with this exact structure:
{
  "npcReply": "Your Danish response — DANISH ONLY, never English",
  "corrections": [
    {
      "original": "what the user said wrong",
      "corrected": "the correct version",
      "explanation": "brief explanation in English",
      "type": "grammar|vocabulary|word_order|spelling|phrase"
    }
  ],
  "feedback": "Brief encouraging feedback in English",
  "score": 0-100,
  "passed": true,
  "passedReason": ""
}

Important RULES:
- npcReply MUST be Danish ONLY. Never English. Never translate. Never explain in English.
- If the user writes in English, respond in Danish confused: "Undskyld, jeg forstår ikke. Kan du sige det på dansk?"
- If the user writes gibberish, respond naturally confused in Danish
- corrections are for JSON analysis only — do NOT mention them in npcReply
- npcReply must feel like a real conversation with a Dane, not a lesson
- If the user made ANY mistake, ALWAYS include it in the corrections array
- corrections should be [] ONLY if the user wrote perfect Danish
- score 0-100: reflect overall quality of the user's Danish
- If the user says "farvel" or goodbye, set passed to true ONLY if the user demonstrated sufficient Danish for their level (${level}) in this scenario.
  Evaluate: did they use appropriate vocabulary? Did they form understandable sentences?
  Did they complete the scenario goal? Was it a meaningful conversation?
  CONTEXT CHECK: Did the user actually talk about the scenario topic?
  If the conversation is about buying butter and they talked about cars instead, they MUST fail (passed=false).
  passedReason should explain: "You didn't stay on topic. The mission was about [scenario], but you talked about [off-topic subject]."
  If passed is false, explain why in passedReason in English.
  If passed is true, leave passedReason empty.
- Respond in valid JSON format only, no markdown`;
}
