import {
  appendClientMessage,
  appendResponseMessages,
  createDataStream,
  smoothStream,
  streamText,
  type LanguageModelV1,
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
import { myProvider, getDynamicLanguageModel } from '@/lib/ai/providers';
import { openai } from '@ai-sdk/openai';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import { geolocation } from '@vercel/functions';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
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

      // Use a workaround for the waitUntil requirement
      const mockWaitUntil = (promise: Promise<any>) => {
        // Just expose the promise but don't wait for it
        promise.catch((error) => {
          console.error('Error in mock waitUntil:', error);
        });
      };

      // Provide the required waitUntil property with a mock implementation
      globalStreamContext = createResumableStreamContext({
        waitUntil: mockWaitUntil,
      });
    } catch (error: any) {
      console.error('Failed to initialize resumable streams:', error);
      if (
        error.message?.includes('REDIS_URL') ||
        error.code === 'ERR_INVALID_URL'
      ) {
        console.log(
          ' > Resumable streams are disabled due to Redis configuration error',
        );
      } else {
        console.error(error);
      }
      return null; // Explicitly return null on error
    }
  }

  return globalStreamContext;
}

// Helper function to get the appropriate model for a chat
async function getModelForChat(
  modelId: string,
  message: any,
): Promise<LanguageModelV1> {
  console.log(`Getting model for chat: ${modelId}`);

  // Check for image generation requests
  const isImageGenerationRequest =
    message.content?.toLowerCase().includes('generate an image') ||
    message.content?.toLowerCase().includes('create an image') ||
    message.content?.toLowerCase().includes('draw') ||
    message.content?.toLowerCase().includes('picture of');

  if (isImageGenerationRequest) {
    console.log('Detected image generation request, using appropriate model');
    try {
      // Depending on the provider requested, use the appropriate image model
      if (modelId.includes('anthropic')) {
        // Claude can handle image generation instructions textually
        return anthropic('claude-3.5-sonnet-20241022');
      } else if (modelId.includes('xai')) {
        // Use xAI's model for image generation if available
        return myProvider.languageModel('xai-grok2-vision');
      } else {
        // Default to OpenAI's model which has good image generation instructions
        return openai('gpt-4o');
      }
    } catch (error) {
      console.error('Error selecting image generation model:', error);
    }
  }

  // Check if message has image or document attachments
  const hasAttachments = message.experimental_attachments?.length > 0;
  const hasPDFAttachment = message.experimental_attachments?.some(
    (a: any) => a.contentType === 'application/pdf',
  );
  const hasImageAttachment = message.experimental_attachments?.some((a: any) =>
    a.contentType?.startsWith('image/'),
  );

  // For PDF attachments, prefer a provider that handles PDFs well (like Anthropic)
  if (hasPDFAttachment) {
    console.log('Message contains PDF, using model with PDF capability');
    try {
      // Try to use Anthropic's Claude model which handles PDFs well
      return anthropic('claude-3.5-sonnet-20241022');
    } catch (error) {
      console.error('Error using PDF-capable model:', error);
      // Continue to other methods
    }
  }

  // For image attachments, prefer a provider with strong vision capabilities
  if (hasImageAttachment) {
    console.log('Message contains images, using model with vision capability');
    try {
      // First try OpenAI GPT-4o for vision
      return openai('gpt-4o');
    } catch (error) {
      console.error('Error using vision-capable model:', error);
      // Continue to other methods
    }
  }

  // First try using the dynamic model loader for the specific model ID
  try {
    console.log(`Attempting to use dynamic model loader for: ${modelId}`);
    return getDynamicLanguageModel(modelId);
  } catch (error) {
    console.error('Error using dynamic model loader:', error);
  }

  // If the model ID looks like a UUID, try to look up the provider and model in the database
  if (modelId.includes('-') && modelId.length > 30) {
    console.log(
      `Model ID ${modelId} looks like a UUID, trying database lookup`,
    );
    try {
      const dbModel = await db
        .select()
        .from(providerModel)
        .where(eq(providerModel.id, modelId))
        .limit(1);

      if (dbModel.length > 0) {
        const model = dbModel[0];
        console.log(
          `Found model in database: ${model.name} (${model.modelId})`,
        );
        const provider = await getProviderById(model.providerId);

        if (provider?.slug) {
          console.log(
            `Using provider ${provider.slug} with model ID ${model.modelId}`,
          );
          // Handle each provider explicitly for better error handling
          switch (provider.slug) {
            case 'openai':
              return openai(model.modelId);
            case 'anthropic':
              return anthropic(model.modelId);
            case 'xai':
              return myProvider.languageModel(
                `xai-${model.modelId.split('-')[0]}`,
              );
            case 'google':
              // If Google provider exists in your setup
              return myProvider.languageModel('google-gemini');
            default:
              console.log(
                `Unknown provider slug: ${provider.slug}, falling back to OpenAI`,
              );
              return openai('gpt-4o');
          }
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
              } catch (err) {
                console.error('Failed to save chat', err);
              }
            }
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });

        result.consumeStream();

        try {
          result.mergeIntoDataStream(dataStream, {
            sendReasoning: true,
          });
        } catch (err) {
          console.error('Error merging stream:', err);
          dataStream.writeData({
            type: 'text',
            text: 'Sorry, there was an error processing your request. Please try again.',
          });
        }
      },
      onError: (err) => {
        console.error('Data stream error:', err);
        return 'Oops, an error occurred! Please try again.';
      },
    });

    const streamContext = getStreamContext();

    if (streamContext) {
      try {
        return new Response(
          await streamContext.resumableStream(streamId, () => stream),
        );
      } catch (err) {
        console.error('Error creating resumable stream:', err);
        // Fall back to regular streaming if resumable fails
        return new Response(stream);
      }
    } else {
      // If no stream context, just return the regular stream
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
