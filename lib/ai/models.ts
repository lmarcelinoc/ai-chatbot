import type { LanguageModelV1 } from 'ai';

export const DEFAULT_CHAT_MODEL: string = 'openai-gpt4o';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
  provider: 'openai' | 'xai';
  modelId: string;
}

export const chatModels: Array<ChatModel> = [
  // OpenAI models
  {
    id: 'openai-gpt4o',
    name: 'GPT-4o (OpenAI)',
    description: 'Advanced vision-capable model',
    provider: 'openai',
    modelId: 'gpt-4o',
  },
  {
    id: 'openai-o3mini',
    name: 'O3-mini (OpenAI)',
    description: 'Fast STEM reasoning model',
    provider: 'openai',
    modelId: 'o3-mini',
  },
  {
    id: 'openai-reasoning',
    name: 'Reasoning (OpenAI)',
    description: 'Advanced reasoning capabilities',
    provider: 'openai',
    modelId: 'gpt-4o',
  },

  // xAI models
  {
    id: 'xai-grok2',
    name: 'Grok-2 (xAI)',
    description: 'General purpose chat model',
    provider: 'xai',
    modelId: 'grok-2-1212',
  },
  {
    id: 'xai-grok2-vision',
    name: 'Grok-2 Vision (xAI)',
    description: 'Vision-capable model',
    provider: 'xai',
    modelId: 'grok-2-vision-1212',
  },
  {
    id: 'xai-grok3-mini',
    name: 'Grok-3 Mini (xAI)',
    description: 'Compact reasoning model',
    provider: 'xai',
    modelId: 'grok-3-mini-beta',
  },
];

// Helper function to get the model's provider
export function getModelProvider(modelId: string): 'openai' | 'xai' {
  const model = chatModels.find((m) => m.id === modelId);
  if (!model) return 'openai';
  return model.provider;
}

// Define image models for each provider
export interface ImageModel {
  id: string;
  provider: 'openai' | 'xai';
  modelId: string;
  size?: string;
  quality?: 'standard' | 'hd';
}

export const imageModels: Record<'openai' | 'xai', ImageModel> = {
  openai: {
    id: 'openai-dalle3',
    provider: 'openai',
    modelId: 'dall-e-3',
    size: '1024x1024',
    quality: 'standard',
  },
  xai: {
    id: 'xai-grok2-image',
    provider: 'xai',
    modelId: 'grok-2-image',
  },
};

// Safe mock implementation that doesn't use test utilities
export const createSafeMockModel = (modelName: string): LanguageModelV1 => {
  // Cast to unknown first then to LanguageModelV1 to avoid type checking issues
  return {
    version: 'v1',
    specificationVersion: 'v1',
    provider: 'openai',
    modelId: modelName,
    id: modelName,
    defaultObjectGenerationMode: 'json',
    supportedFeatures: {
      tools: false,
      vision: false,
    },
    generate: async () => ({
      text: `Mock response from ${modelName}`,
      usage: { promptTokens: 10, completionTokens: 20 },
      finishReason: 'stop',
    }),
    stream: async () => {
      throw new Error('Stream not implemented in safe mock model');
    },
  } as unknown as LanguageModelV1;
};

// Export safe mock models for testing
export const safeChatModel = createSafeMockModel('chat-model');
export const safeReasoningModel = createSafeMockModel('reasoning-model');
export const safeTitleModel = createSafeMockModel('title-model');
export const safeArtifactModel = createSafeMockModel('artifact-model');
