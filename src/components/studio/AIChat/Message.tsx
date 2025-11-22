/**
 * Message Component
 * Displays individual chat messages
 */

'use client';

import { marked } from 'marked';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface MessageProps {
  message: Message;
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-black text-white'
              : 'bg-gray-100 text-gray-900'
          }`}
        >
          <div
            className="text-sm prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{
              __html: marked.parse(message.content || ''),
            }}
          />
        </div>
        
        {!isUser && (
          <div className="flex items-center gap-1 mt-1 px-2">
            <span className="text-xs text-gray-400">AI Assistant</span>
          </div>
        )}
      </div>
    </div>
  );
}

