'use client';

import { startTransition, useMemo, useOptimistic, useState, useEffect } from 'react';

import { saveChatModelAsCookie } from '@/app/(chat)/actions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { chatModels, type ChatModel } from '@/lib/ai/models';
import { cn } from '@/lib/utils';

import { CheckCircleFillIcon, ChevronDownIcon } from './icons';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import type { Session } from 'next-auth';

interface ProviderData {
  name: string;
  models: ChatModel[];
}

interface ModelsResponse {
  providers: Record<string, ProviderData>;
  error: string | null;
}

export function ModelSelector({
  session,
  selectedModelId,
  className,
}: {
  session: Session;
  selectedModelId: string;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  const [optimisticModelId, setOptimisticModelId] =
    useOptimistic(selectedModelId);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providersData, setProvidersData] = useState<Record<string, ProviderData> | null>(null);

  // Fetch models from API
  useEffect(() => {
    async function fetchModels() {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('Fetching models...');
        const response = await fetch('/api/models');
        console.log('API Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`API responded with status ${response.status}`);
        }
        
        const data: ModelsResponse = await response.json();
        console.log('API Response data:', data);
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        setProvidersData(data.providers);
      } catch (err: any) {
        console.error('Failed to fetch models:', err);
        setError(err.message || 'Failed to load models');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchModels();
  }, []);

  const userType = session.user.type;
  const { availableChatModelIds } = entitlementsByUserType[userType];

  // Use fetched models if available, otherwise fall back to static list
  const availableModels = useMemo(() => {
    if (providersData) {
      // Flatten all models from all providers
      const allModels = Object.values(providersData).flatMap(provider => provider.models);
      
      // Check if user has wildcard access
      const hasWildcardAccess = availableChatModelIds.includes('*');
      
      if (hasWildcardAccess) {
        // If wildcard is included, return all models
        return allModels;
      } else {
        // Filter by user's entitlements
        return allModels.filter(model => availableChatModelIds.includes(model.id));
      }
    } else {
      // Check if user has wildcard access
      const hasWildcardAccess = availableChatModelIds.includes('*');
      
      if (hasWildcardAccess) {
        // If wildcard is included, return all static models
        return chatModels;
      } else {
        // Fall back to static list filtered by entitlements
        return chatModels.filter(model => availableChatModelIds.includes(model.id));
      }
    }
  }, [providersData, availableChatModelIds]);

  // Group models by provider
  const modelsByProvider = useMemo(() => {
    if (providersData) {
      // If we have provider data from the API, use that directly
      // Initialize with empty arrays for each provider
      const result: Record<string, { name: string, models: ChatModel[] }> = {};
      
      // First collect all provider information
      Object.keys(providersData).forEach(providerId => {
        result[providerId] = { 
          name: providersData[providerId].name,
          models: []
        };
      });
      
      // Then populate with available models
      availableModels.forEach(model => {
        if (model.provider && result[model.provider]) {
          result[model.provider].models.push(model);
        } else {
          // For models with unknown providers, add to a generic group
          if (!result['other']) {
            result['other'] = { name: 'Other Models', models: [] };
          }
          result['other'].models.push(model);
        }
      });
      
      return result;
    } else {
      // When falling back to static data, group models by their provider property
      const grouped: Record<string, { name: string, models: ChatModel[] }> = {};
      
      // Group by known provider types
      availableModels.forEach(model => {
        const provider = model.provider || 'unknown';
        
        if (!grouped[provider]) {
          // Use the helper function to get a friendly display name
          grouped[provider] = { 
            name: getProviderDisplayName(provider), 
            models: [] 
          };
        }
        
        grouped[provider].models.push(model);
      });
      
      return grouped;
    }
  }, [providersData, availableModels]);

  const selectedChatModel = useMemo(
    () => availableModels.find(model => model.id === optimisticModelId),
    [optimisticModelId, availableModels],
  );

  return (
    <div className="flex flex-col items-start">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          asChild
          className={cn(
            'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
            className,
          )}
        >
          <Button
            data-testid="model-selector"
            variant="outline"
            className="md:px-2 md:h-[34px]"
            disabled={isLoading}
          >
            {isLoading ? 'Loading models...' : selectedChatModel?.name || 'Select model'}
            <ChevronDownIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[300px]">
          {error ? (
            <div className="p-2 text-sm text-red-500">
              Error loading models: {error}
            </div>
          ) : isLoading ? (
            <div className="p-2 text-sm text-muted-foreground">Loading available models...</div>
          ) : (
            // Render providers and their models
            Object.entries(modelsByProvider).map(([providerId, { name, models }]) => {
              if (models.length === 0) return null;
              
              return (
                <div key={providerId}>
                  <DropdownMenuLabel>{name}</DropdownMenuLabel>
                  {models.map(model => (
                    <ModelMenuItem 
                      key={model.id}
                      chatModel={model}
                      isSelected={model.id === optimisticModelId}
                      onSelect={() => {
                        setOpen(false);
                        startTransition(() => {
                          setOptimisticModelId(model.id);
                          saveChatModelAsCookie(model.id);
                        });
                      }}
                    />
                  ))}
                  <DropdownMenuSeparator />
                </div>
              );
            })
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Helper component for model menu items
function ModelMenuItem({ 
  chatModel, 
  isSelected, 
  onSelect 
}: { 
  chatModel: ChatModel;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem
      data-testid={`model-selector-item-${chatModel.id}`}
      onSelect={onSelect}
      data-active={isSelected}
      asChild
    >
      <button
        type="button"
        className="gap-4 group/item flex flex-row justify-between items-center w-full"
      >
        <div className="flex flex-col gap-1 items-start">
          <div>{chatModel.name}</div>
          <div className="text-xs text-muted-foreground">
            {chatModel.description}
          </div>
        </div>

        <div className="text-foreground dark:text-foreground opacity-0 group-data-[active=true]/item:opacity-100">
          <CheckCircleFillIcon />
        </div>
      </button>
    </DropdownMenuItem>
  );
}

// Update the provider name mapping to use string type instead of specific literals
const getProviderDisplayName = (providerSlug: string): string => {
  const providerNames: Record<string, string> = {
    'openai': 'OpenAI',
    'xai': 'xAI',
    'anthropic': 'Anthropic',
    'google': 'Google',
    'mistral': 'Mistral AI',
    'cohere': 'Cohere',
    'aws': 'Amazon Bedrock',
    'azure': 'Azure OpenAI'
  };
  
  return providerNames[providerSlug] || providerSlug;
};
