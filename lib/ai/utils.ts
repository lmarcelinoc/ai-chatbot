// Utility functions for AI SDK
// This wrapper helps isolate Node.js-specific modules

export function safeImport() {
  if (typeof window === 'undefined') {
    // Server-side only imports
    try {
      return {
        // Import server-side modules safely
        isServer: true,
      };
    } catch (error) {
      console.error('Error importing server-side AI modules:', error);
      return { isServer: true, error };
    }
  } else {
    // Client-side shims/mocks
    return {
      isServer: false,
      // Add client-side compatible implementations if needed
    };
  }
}
