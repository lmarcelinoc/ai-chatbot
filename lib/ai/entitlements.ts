import type { UserType } from '@/app/(auth)/auth';
import type { ChatModel } from './models';

interface Entitlements {
  maxMessagesPerDay: number;
  availableChatModelIds: Array<string>;
}

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For users without an account
   */
  guest: {
    maxMessagesPerDay: 20,
    availableChatModelIds: [
      // Default models
      'openai-gpt4o', 'xai-grok2',
      // Database models (will be UUIDs)
      // Adding wildcards to match any model ID pattern
      // The model component will filter these based on actual available models
      '*'
    ],
  },

  /*
   * For users with an account
   */
  regular: {
    maxMessagesPerDay: 100,
    availableChatModelIds: [
      // Default models
      'openai-gpt4o', 
      'openai-o3mini', 
      'openai-reasoning',
      'xai-grok2', 
      'xai-grok2-vision', 
      'xai-grok3-mini',
      // Database models (will be UUIDs)
      // Adding wildcards to match any model ID pattern
      // The model component will filter these based on actual available models
      '*'
    ],
  },

  /*
   * TODO: For users with an account and a paid membership
   */
};
