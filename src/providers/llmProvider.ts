export interface LLMResponse {
  text: string;
}

export interface LLMProvider {
  analyze(prompt: string, opts?: any): Promise<LLMResponse>;
}
