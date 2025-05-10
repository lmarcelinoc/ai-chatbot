import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
  type LanguageModelV1,
} from 'ai';
import { xai, type XaiProvider } from '@ai-sdk/xai';
import { openai, type OpenAIProvider } from '@ai-sdk/openai';

// Use a dynamic import approach for TypeScript type safety while maintaining compatibility
let anthropic: any;
try {
  // This is a runtime check that won't affect TypeScript compilation
  const anthropicModule = require('@ai-sdk/anthropic');
  anthropic = anthropicModule.anthropic; // Extract the anthropic function from the module
} catch (error) {
  console.warn('Anthropic SDK not installed, some models may not be available');
  // Mock function to prevent runtime errors
  anthropic = (modelId: string) => {
    console.warn(`Anthropic model ${modelId} requested but SDK not installed`);
    return openai('gpt-4o'); // Fallback
  };
}

import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';
import { chatModels, imageModels } from './models';

// Re-export openai and other providers for easy access
export { openai, xai };
export { anthropic };

// Map to hold all provider SDK functions by slug
export const providerSDKs: Record<string, any> = {
  openai,
  xai,
  anthropic,
  // Add other providers as needed
};

// Get a model instance based on provider slug and model ID
export function getProviderModel(providerSlug: string, modelId: string): LanguageModelV1 {
  if (providerSDKs[providerSlug]) {
    try {
      return providerSDKs[providerSlug](modelId);
    } catch (error) {
      console.error(`Error creating model for ${providerSlug}/${modelId}:`, error);
      // Fallback to OpenAI if there's an error
      return openai('gpt-4o');
    }
  }
  
  // Default to OpenAI if provider not found
  console.warn(`Provider ${providerSlug} not found, falling back to OpenAI`);
  return openai('gpt-4o');
}

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    })
  : customProvider({
      languageModels: {
        // OpenAI Models
        'openai-gpt4o': openai('gpt-4o'),
        'openai-o3mini': openai('o3-mini'),
        'openai-reasoning': wrapLanguageModel({
          model: openai('gpt-4o'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        
        // xAI Models
        'xai-grok2': xai('grok-2-1212'),
        'xai-grok2-vision': xai('grok-2-vision-1212'),
        'xai-grok3-mini': wrapLanguageModel({
          model: xai('grok-3-mini-beta'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        
        // Anthropic/Claude models
        'anthropic-claude-3-5-sonnet': anthropic('claude-3.5-sonnet-20241022'),
        'anthropic-claude-3-5-haiku': anthropic('claude-3.5-haiku-20241022'),
        'anthropic-claude-3-opus': anthropic('claude-3-opus-20240229'),
        'anthropic-claude-instant': anthropic('claude-instant-1.2'),
        
        // Legacy model IDs (for backward compatibility)
        'chat-model': openai('gpt-4o'),
        'chat-model-reasoning': wrapLanguageModel({
          model: openai('gpt-4o'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': openai('gpt-3.5-turbo'),
        'artifact-model': openai('gpt-4o'),
      },
      imageModels: {
        'openai-dalle3': openai.image('dall-e-3'),
        'xai-grok2-image': xai.image('grok-2-image'),
        // Legacy model ID
        'small-model': openai.image('dall-e-3'),
      },
    });

// Helper function to get the appropriate image model based on the provider
export function getImageModelForProvider(provider: string) {
  if (provider === 'openai') return 'openai-dalle3';
  if (provider === 'xai') return 'xai-grok2-image';
  return 'openai-dalle3'; // Default fallback
}

// Dynamic model loading for database models
export function getDynamicLanguageModel(modelId: string): LanguageModelV1 {
  console.log(`[getDynamicLanguageModel] Attempting to load model: ${modelId}`);
  
  // First check if it's a predefined model in myProvider
  try {
    // @ts-ignore - Accessing language models directly
    if (myProvider.languageModels && myProvider.languageModels[modelId]) {
      console.log(`[getDynamicLanguageModel] Found predefined model: ${modelId}`);
      // @ts-ignore - Accessing language models directly
      return myProvider.languageModels[modelId];
    }
  } catch (error) {
    console.log(`[getDynamicLanguageModel] Error accessing predefined model: ${error}`);
    // Ignore errors and continue to next approach
  }
  
  // If model ID matches UUID pattern, it might be a database model
  // UUID pattern matching is simple here - could be more robust
  if (modelId.includes('-') && modelId.length > 30) {
    console.log(`[getDynamicLanguageModel] Model ID ${modelId} appears to be a UUID`);
    try {
      // For database models, we would ideally query the database here
      // Since we can't do that directly, use a fallback OpenAI model
      console.log(`[getDynamicLanguageModel] Using openai fallback for UUID: ${modelId}`);
      return openai('gpt-4o');
    } catch (error) {
      console.error(`[getDynamicLanguageModel] Failed to create model for UUID ${modelId}:`, error);
      return openai('gpt-4o');
    }
  }
  
  // For legacy model IDs that aren't in myProvider
  try {
    console.log(`[getDynamicLanguageModel] Using legacy approach for: ${modelId}`);
    return myProvider.languageModel('openai-gpt4o');
  } catch (error) {
    console.error(`[getDynamicLanguageModel] All approaches failed for ${modelId}:`, error);
    return openai('gpt-4o'); // Direct fallback
  }
}
