'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';

export default function ProviderTest() {
  const [selectedProvider, setSelectedProvider] = useState('openai-gpt4o');
  const [fileUploadStatus, setFileUploadStatus] = useState('');

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: '/api/chat',
      body: {
        selectedChatModel: selectedProvider,
      },
    });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setFileUploadStatus(`Uploading ${file.name}...`);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      setFileUploadStatus(`File uploaded: ${data.url}`);

      // Add a message with the file attachment
      const messageWithAttachment = `${input} (See attached file for more information)`;
      handleInputChange({ target: { value: messageWithAttachment } } as any);
    } catch (error) {
      console.error('Upload error:', error);
      setFileUploadStatus(`Upload failed: ${error}`);
    }
  };

  return (
    <div className="flex flex-col p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Provider Test</h1>

      <div className="mb-4">
        <label htmlFor="provider-select" className="block mb-2">
          Select Provider:
        </label>
        <select
          id="provider-select"
          value={selectedProvider}
          onChange={(e) => setSelectedProvider(e.target.value)}
          className="p-2 border rounded w-full"
        >
          <option value="openai-gpt4o">OpenAI (GPT-4o)</option>
          <option value="anthropic-claude-3-5-sonnet">
            Anthropic (Claude 3.5 Sonnet)
          </option>
          <option value="xai-grok2">xAI (Grok-2)</option>
          <option value="2cfbf231-58f9-40c0-8e61-e657a1c67129">
            Grok-2 (UUID)
          </option>
        </select>
      </div>

      <div className="mb-4">
        <label htmlFor="file-upload" className="block mb-2">
          Upload File:
        </label>
        <input
          id="file-upload"
          type="file"
          onChange={handleFileUpload}
          className="p-2 border rounded w-full"
        />
        {fileUploadStatus && <p className="mt-2 text-sm">{fileUploadStatus}</p>}
      </div>

      <div className="mb-4 border rounded-lg p-4 h-96 overflow-y-auto bg-gray-50">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`mb-3 p-3 rounded ${m.role === 'user' ? 'bg-blue-100' : 'bg-green-100'}`}
          >
            <div className="font-bold">
              {m.role === 'user' ? 'User:' : 'AI:'}
            </div>
            <div>{m.content}</div>
          </div>
        ))}

        {isLoading && <div className="text-gray-500">AI is thinking...</div>}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask something..."
          className="flex-1 p-2 border rounded"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          Send
        </button>
      </form>
    </div>
  );
}
