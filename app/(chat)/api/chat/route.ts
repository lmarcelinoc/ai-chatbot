import {
  appendClientMessage,
  appendResponseMessages,
  createDataStream,
  smoothStream,
  streamText,
  type LanguageModelV1
} from 'ai';
import { auth, type UserType } from '@/app/(auth)/auth';
import { type RequestHints, systemPrompt } from '@/lib/ai/prompts';
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getDefaultUserPersona,
  getMessageCountByUserId,
  getMessagesByChatId,
  getStreamIdsByChatId,
  saveChat,
  saveMessages,
  getProviderById,
} from '@/lib/db/queries';
import { generateUUID, getTrailingMessageId } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { braveSearch } from '@/lib/ai/tools/brave-search';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider, getDynamicLanguageModel, getProviderModel } from '@/lib/ai/providers';
import { openai } from '@ai-sdk/openai';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import { geolocation } from '@vercel/functions';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { after } from 'next/server';
import type { Chat } from '@/lib/db/schema';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { providerModel } from '@/lib/db/schema';
import { differenceInSeconds } from 'date-fns';
import { anthropic } from '@ai-sdk/anthropic';

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

function getStreamContext() {
  if (!globalStreamContext) {
    try {
      // Check if REDIS_URL is properly configured
      const redisUrl =
        process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
      if (!redisUrl || redisUrl.includes('SSS')) {
        console.log(
          ' > Resumable streams are disabled due to invalid Redis URL configuration',
        );
        return null;
      }

      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      console.error('Failed to initialize resumable streams:', error);
      if (
        error.message.includes('REDIS_URL') ||
        error.code === 'ERR_INVALID_URL'
      ) {
        console.log(
          ' > Resumable streams are disabled due to Redis configuration error',
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

// Helper function to get the appropriate model for a chat
async function getModelForChat(modelId: string, message: any): Promise<LanguageModelV1> {
  console.log(`Getting model for chat: ${modelId}`);
  
  // Check if message has PDF or document attachments
  const hasPDFAttachment = message.experimental_attachments?.some(
    (a: any) => a.contentType === 'application/pdf'
  );
  
  // If there's a PDF, prefer a provider that handles PDFs well (like Anthropic)
  if (hasPDFAttachment) {
    console.log('Message contains PDF, using model with PDF capability');
    try {
      // Try to use Anthropic's Claude model which handles PDFs well
      return anthropic ? 
        anthropic('claude-3.5-sonnet-20241022') : 
        openai('gpt-4o'); // Fallback to GPT-4o if anthropic not available
    } catch (error) {
      console.error('Error using PDF-capable model:', error);
    }
  }
  
  // First try using the dynamic model loader
  try {
    console.log(`Attempting to use dynamic model loader for: ${modelId}`);
    return getDynamicLanguageModel(modelId);
  } catch (error) {
    console.error('Error using dynamic model loader:', error);
  }
  
  // If the model ID looks like a UUID, try to look up the provider and model in the database
  if (modelId.includes('-') && modelId.length > 30) {
    console.log(`Model ID ${modelId} looks like a UUID, trying database lookup`);
    try {
      const dbModel = await db.select().from(providerModel).where(eq(providerModel.id, modelId)).limit(1);
      
      if (dbModel.length > 0) {
        const model = dbModel[0];
        console.log(`Found model in database: ${JSON.stringify(model)}`);
        const provider = await getProviderById(model.providerId);
        console.log(`Provider for model: ${JSON.stringify(provider)}`);
        
        if (provider && provider.slug) {
          console.log(`Using provider ${provider.slug} with model ID ${model.modelId}`);
          return getProviderModel(provider.slug, model.modelId);
        }
      } else {
        console.log(`No database model found for ID: ${modelId}`);
      }
    } catch (dbError) {
      console.error('Database error looking up model:', dbError);
    }
  }
  
  // Fallback to a default model
  console.warn(`Falling back to default model for ${modelId}`);
  return openai('gpt-4o');
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new Response('Invalid request body', { status: 400 });
  }

  try {
    const { id, message, selectedChatModel, selectedVisibilityType } =
      requestBody;

    const session = await auth();

    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const userType: UserType = session.user.type;

    // Try to fetch user's default persona but don't wait or block on failure
    let defaultPersona = null;
    try {
      defaultPersona = await getDefaultUserPersona(session.user.id);
    } catch (error) {
      console.error(
        'Failed to fetch default persona, using system defaults:',
        error,
      );
      // Continue with null persona - the systemPrompt function will use defaults
    }

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new Response(
        'You have exceeded your maximum number of messages for the day! Please try again later.',
        {
          status: 429,
        },
      );
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
    } else {
      if (chat.userId !== session.user.id) {
        return new Response('Forbidden', { status: 403 });
      }
    }

    const previousMessages = await getMessagesByChatId({ id });

    const messages = appendClientMessage({
      // @ts-expect-error: todo add type conversion from DBMessage[] to UIMessage[]
      messages: previousMessages,
      message,
    });

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: 'user',
          parts: message.parts,
          attachments: message.experimental_attachments ?? [],
          createdAt: new Date(),
        },
      ],
    });

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    // Get the model before creating the data stream
    const model = await getModelForChat(selectedChatModel, message);

    const stream = createDataStream({
      execute: (dataStream) => {
        const result = streamText({
          model,
          system: systemPrompt({
            selectedChatModel,
            requestHints,
            userPersona: defaultPersona,
          }),
          messages,
          maxSteps: 5,
          experimental_activeTools:
            selectedChatModel === 'chat-model-reasoning' ||
            selectedChatModel === 'openai-reasoning' ||
            selectedChatModel === 'xai-grok3-mini'
              ? []
              : [
                  'getWeather',
                  'createDocument',
                  'updateDocument',
                  'requestSuggestions',
                  'braveSearch',
                ],
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: generateUUID,
          tools: {
            getWeather,
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
            }),
            braveSearch,
          },
          onFinish: async ({ response }) => {
            if (session.user?.id) {
              try {
                const assistantId = getTrailingMessageId({
                  messages: response.messages.filter(
                    (message) => message.role === 'assistant',
                  ),
                });

                if (!assistantId) {
                  throw new Error('No assistant message found!');
                }

                const [, assistantMessage] = appendResponseMessages({
                  messages: [message],
                  responseMessages: response.messages,
                });

                await saveMessages({
                  messages: [
                    {
                      id: assistantId,
                      chatId: id,
                      role: assistantMessage.role,
                      parts: assistantMessage.parts,
                      attachments:
                        assistantMessage.experimental_attachments ?? [],
                      createdAt: new Date(),
                    },
                  ],
                });
              } catch (_) {
                console.error('Failed to save chat');
              }
            }
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });

        result.consumeStream();

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
      onError: () => {
        return 'Oops, an error occurred!';
      },
    });

    const streamContext = getStreamContext();

    if (streamContext) {
      return new Response(
        await streamContext.resumableStream(streamId, () => stream),
      );
    } else {
      return new Response(stream);
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response('An error occurred while processing your request!', {
      status: 500,
    });
  }
}

export async function GET(request: Request) {
  const streamContext = getStreamContext();
  const resumeRequestedAt = new Date();

  if (!streamContext) {
    return new Response(null, { status: 204 });
  }

  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return new Response('id is required', { status: 400 });
  }

  const session = await auth();

  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  let chat: Chat;

  try {
    chat = await getChatById({ id: chatId });
  } catch {
    return new Response('Not found', { status: 404 });
  }

  if (!chat) {
    return new Response('Not found', { status: 404 });
  }

  if (chat.visibility === 'private' && chat.userId !== session.user.id) {
    return new Response('Forbidden', { status: 403 });
  }

  const streamIds = await getStreamIdsByChatId({ chatId });

  if (!streamIds.length) {
    return new Response('No streams found', { status: 404 });
  }

  const recentStreamId = streamIds.at(-1);

  if (!recentStreamId) {
    return new Response('No recent stream found', { status: 404 });
  }

  const emptyDataStream = createDataStream({
    execute: () => {},
  });

  const stream = await streamContext.resumableStream(
    recentStreamId,
    () => emptyDataStream,
  );

  /*
   * For when the generation is streaming during SSR
   * but the resumable stream has concluded at this point.
   */
  if (!stream) {
    const messages = await getMessagesByChatId({ id: chatId });
    const mostRecentMessage = messages.at(-1);

    if (!mostRecentMessage) {
      return new Response(emptyDataStream, { status: 200 });
    }

    if (mostRecentMessage.role !== 'assistant') {
      return new Response(emptyDataStream, { status: 200 });
    }

    const messageCreatedAt = new Date(mostRecentMessage.createdAt);

    if (differenceInSeconds(resumeRequestedAt, messageCreatedAt) > 15) {
      return new Response(emptyDataStream, { status: 200 });
    }

    const restoredStream = createDataStream({
      execute: (buffer) => {
        buffer.writeData({
          type: 'append-message',
          message: JSON.stringify(mostRecentMessage),
        });
      },
    });

    return new Response(restoredStream, { status: 200 });
  }

  return new Response(stream, { status: 200 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response('Forbidden', { status: 403 });
    }

    const deletedChat = await deleteChatById({ id });

    return Response.json(deletedChat, { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response('An error occurred while processing your request!', {
      status: 500,
    });
  }
}
