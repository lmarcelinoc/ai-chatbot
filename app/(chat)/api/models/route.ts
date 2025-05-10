import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { openai } from '@ai-sdk/openai';
import { xai } from '@ai-sdk/xai';
import { ChatModel, ImageModel, chatModels } from '@/lib/ai/models';
import { getEnabledChatModels, getProviders, getProviderById } from '@/lib/db/queries';

// Cache the result for 1 hour
export const revalidate = 3600;

export async function GET() {
  try {
    const session = await auth();
    console.log('API /models - Session:', session?.user);

    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    let error = null;
    let providers = {};

    try {
      // Fetch enabled models from the database
      console.log('Fetching enabled models from database...');
      const enabledModels = await getEnabledChatModels();
      console.log('Enabled models from DB:', enabledModels);
      
      // If we have enabled models, organize them by provider
      if (enabledModels && enabledModels.length > 0) {
        // Get all providers to include their names
        const allProviders = await getProviders();
        console.log('All providers:', allProviders);
        
        // Create a mapping of provider IDs to their slugs for reference
        const providerIdToSlugMap = new Map();
        allProviders.forEach(p => {
          providerIdToSlugMap.set(p.id, p.slug);
        });
        
        // Initialize providers map with empty models arrays
        // Use the provider slugs as keys instead of IDs
        const providersMap = new Map();
        for (const p of allProviders) {
          providersMap.set(p.slug, {
            name: p.name,
            models: []
          });
        }
        
        // Add models to their respective providers
        for (const model of enabledModels) {
          // Get the provider slug from the ID
          const providerSlug = providerIdToSlugMap.get(model.providerId);
          
          if (providerSlug && providersMap.get(providerSlug)) {
            providersMap.get(providerSlug).models.push({
              id: model.id,
              name: model.name,
              description: model.name,
              provider: providerSlug, // Use slug instead of ID
              modelId: model.modelId,
            });
          }
        }
        
        // Convert the Map to an Object for the response
        providers = Object.fromEntries(providersMap);
      } else {
        console.log('No enabled models found, falling back to hardcoded models');
        // Fall back to hardcoded models when no database models are available
        providers = {
          openai: {
            name: 'OpenAI',
            models: chatModels.filter(m => m.provider === 'openai').map(m => ({
              ...m,
              id: m.id 
            })),
          },
          xai: {
            name: 'xAI',
            models: chatModels.filter(m => m.provider === 'xai').map(m => ({
              ...m,
              id: m.id
            })),
          },
        };
      }
      
      console.log('Final providers object:', providers);
    } catch (err: any) {
      console.error('Error fetching models:', err);
      error = err.message;
    }

    // Return models grouped by provider
    return NextResponse.json({
      providers,
      error,
    });
  } catch (error: any) {
    console.error('Error in models API:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
} 