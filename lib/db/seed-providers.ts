// seed-providers.ts
// Run this file to seed the database with providers and models
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { provider, providerModel } from './schema';

// Connect to the database
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

async function seedProviders() {
  console.log('Seeding providers and models...');

  try {
    // First create providers if they don't exist
    const openaiProvider = await db.insert(provider).values({
      name: 'OpenAI',
      slug: 'openai',
      enabled: true,
    }).onConflictDoUpdate({
      target: provider.slug,
      set: {
        name: 'OpenAI',
        enabled: true,
      }
    }).returning();

    const xaiProvider = await db.insert(provider).values({
      name: 'xAI',
      slug: 'xai',
      enabled: true,
    }).onConflictDoUpdate({
      target: provider.slug,
      set: {
        name: 'xAI',
        enabled: true,
      }
    }).returning();

    console.log('Providers created:', openaiProvider, xaiProvider);

    // Add OpenAI models
    if (openaiProvider.length > 0) {
      const openaiId = openaiProvider[0].id;
      await db.insert(providerModel).values([
        {
          providerId: openaiId,
          name: 'GPT-4o',
          modelId: 'gpt-4o',
          isChat: true,
          isImage: false,
          enabled: true,
        },
        {
          providerId: openaiId,
          name: 'O3-mini',
          modelId: 'o3-mini',
          isChat: true,
          isImage: false,
          enabled: true,
        },
        {
          providerId: openaiId,
          name: 'GPT-4o Reasoning',
          modelId: 'gpt-4o',
          isChat: true,
          isImage: false,
          enabled: true,
        }
      ]).onConflictDoNothing().returning();
    }

    // Add xAI models
    if (xaiProvider.length > 0) {
      const xaiId = xaiProvider[0].id;
      await db.insert(providerModel).values([
        {
          providerId: xaiId,
          name: 'Grok-2',
          modelId: 'grok-2-1212',
          isChat: true,
          isImage: false,
          enabled: true,
        },
        {
          providerId: xaiId,
          name: 'Grok-2 Vision',
          modelId: 'grok-2-vision-1212',
          isChat: true,
          isImage: false,
          enabled: true,
        },
        {
          providerId: xaiId,
          name: 'Grok-3 Mini',
          modelId: 'grok-3-mini-beta',
          isChat: true, 
          isImage: false,
          enabled: true,
        }
      ]).onConflictDoNothing().returning();
    }

    console.log('Models created successfully!');
  } catch (error) {
    console.error('Error seeding providers:', error);
  } finally {
    await client.end();
  }
}

seedProviders(); 