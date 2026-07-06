import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider, LLMResponse } from './llmProvider.js';

export class GeminiProvider implements LLMProvider {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string, modelName: string = 'gemini-1.5-flash') {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: modelName });
  }

  async analyze(prompt: string, opts?: any): Promise<LLMResponse> {
    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    return {
      text: response.text()
    };
  }
}
