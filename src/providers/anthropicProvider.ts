import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, LLMResponse } from './llmProvider.js';

export class AnthropicProvider implements LLMProvider {
  private anthropic: Anthropic;
  private modelName: string;

  constructor(apiKey: string, modelName: string = 'claude-3-5-sonnet-latest') {
    this.anthropic = new Anthropic({
      apiKey
    });
    this.modelName = modelName;
  }

  async analyze(prompt: string, opts?: any): Promise<LLMResponse> {
    const response = await this.anthropic.messages.create({
      model: this.modelName,
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    let text = '';
    if (response.content && response.content.length > 0) {
      const block = response.content[0];
      if (block.type === 'text') {
        text = block.text;
      }
    }

    return { text };
  }
}
