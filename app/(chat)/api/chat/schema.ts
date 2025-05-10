import { z } from 'zod';

const textPartSchema = z.object({
  text: z.string().min(1).max(2000),
  type: z.enum(['text']),
});

export const postRequestBodySchema = z.object({
  id: z.string().uuid(),
  message: z.object({
    id: z.string().uuid(),
    createdAt: z.coerce.date(),
    role: z.enum(['user']),
    content: z.string().min(1).max(2000),
    parts: z.array(textPartSchema),
    experimental_attachments: z
      .array(
        z.object({
          url: z.string().url(),
          name: z.string().min(1).max(2000),
          contentType: z.enum(['image/png', 'image/jpg', 'image/jpeg', 'application/pdf']),
        }),
      )
      .optional(),
  }),
  selectedChatModel: z.union([
    z.enum([
      // Legacy model IDs
      'chat-model', 
      'chat-model-reasoning',
      // OpenAI models
      'openai-gpt4o',
      'openai-o3mini',
      'openai-reasoning',
      // xAI models
      'xai-grok2',
      'xai-grok2-vision',
      'xai-grok3-mini',
      // Anthropic models
      'anthropic-claude-3-5-sonnet',
      'anthropic-claude-3-5-haiku',
      'anthropic-claude-3-opus',
      'anthropic-claude-instant'
    ]),
    // Support for database model IDs (UUIDs)
    z.string().uuid()
  ]),
  selectedVisibilityType: z.enum(['public', 'private']),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
