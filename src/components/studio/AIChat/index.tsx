/**
 * AI Chat Component
 * Conversational interface with streaming AI responses
 */

'use client';

import { useStudioStore, type FrameConfiguration } from '@/store/studio';
import { useEffect, useRef, useState } from 'react';
import { Message } from './Message';
import { QuickActions } from './QuickActions';
import { TypingIndicator } from './TypingIndicator';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function AIChat() {
  const { config, updateConfig } = useStudioStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/studio/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          frameConfig: config,
          imageAnalysis: config.imageAnalysis,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Add assistant message
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.content || 'I apologize, I encountered an error.',
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Handle function calls AFTER displaying message
        if (data.function_call) {
          await handleFunctionCall(data.function_call);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Chat API error:', errorData);
        throw new Error('Failed to get response');
      }
    } catch (error) {
      console.error('Error in chat:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'I apologize, I encountered an error. Please try again.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send welcome message if no messages
  useEffect(() => {
    if (messages.length === 0 && !config.imageUrl) {
      // Auto-send welcome
      setTimeout(() => {
        const welcomeMessage = {
          role: 'assistant' as const,
          content: `Welcome to Art Framer Studio! 👋\n\nI'm here to help you create the perfect custom frame. You can:\n\n🎨 Upload an image to get started\n✨ Generate art with AI\n💬 Chat with me about your vision\n\nWhat would you like to create today?`,
          id: 'welcome',
        };
        // This is a hack to show initial message
        // In production, manage this better
      }, 100);
    }
  }, []);

  const handleFunctionCall = async (functionCall: any) => {
    console.log('Function call received:', functionCall);
    
    try {
      const { name, arguments: argsString } = functionCall;
      const args = typeof argsString === 'string' ? JSON.parse(argsString) : argsString;

      switch (name) {
        case 'update_frame':
          // Update the configuration
          updateConfig(args);
          
          // Show confirmation message
          const confirmMessage: ChatMessage = {
            id: `system-${Date.now()}`,
            role: 'assistant',
            content: '✅ Updated! Check the preview on the right.',
          };
          setMessages((prev) => [...prev, confirmMessage]);
          
          // Trigger pricing update
          updatePricing(args);
          break;
          
        case 'show_in_room':
          const roomMessage: ChatMessage = {
            id: `system-${Date.now()}`,
            role: 'assistant',
            content: '🏠 Room visualization coming soon! You can use the "See in room" button to upload a photo of your space.',
          };
          setMessages((prev) => [...prev, roomMessage]);
          break;
          
        case 'show_comparison':
          const compareMessage: ChatMessage = {
            id: `system-${Date.now()}`,
            role: 'assistant',
            content: '🔄 Comparison view coming soon!',
          };
          setMessages((prev) => [...prev, compareMessage]);
          break;
          
        case 'generate_variations':
          const varMessage: ChatMessage = {
            id: `system-${Date.now()}`,
            role: 'assistant',
            content: '✨ Generating variations...',
          };
          setMessages((prev) => [...prev, varMessage]);
          break;
          
        default:
          console.log('Unknown function:', name);
      }
    } catch (error) {
      console.error('Error handling function call:', error);
    }
  };

  const updatePricing = async (newConfig: Partial<FrameConfiguration>) => {
    try {
      const response = await fetch('/api/studio/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: { ...config, ...newConfig } }),
      });

      if (response.ok) {
        const { pricing } = await response.json();
        updateConfig({ price: pricing.total, shippingCost: pricing.shipping });
      }
    } catch (error) {
      console.error('Error updating pricing:', error);
    }
  };

  const handleQuickAction = async (action: string) => {
    // Create user message immediately
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: action,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput(''); // Clear input
    setIsLoading(true);

    try {
      const response = await fetch('/api/studio/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          frameConfig: config,
          imageAnalysis: config.imageAnalysis,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.content || 'I apologize, I encountered an error.',
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Handle function calls
        if (data.function_call) {
          handleFunctionCall(data.function_call);
        }
      } else {
        throw new Error('Failed to get response');
      }
    } catch (error) {
      console.error('Error in chat:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'I apologize, I encountered an error. Please try again.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">✨</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Welcome to Art Framer Studio
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              I'm your AI framing consultant. Upload an image or tell me about
              your vision, and I'll help you create the perfect frame.
            </p>
            <QuickActions onAction={handleQuickAction} />
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <Message key={message.id} message={message} />
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Quick Actions (when conversation started) */}
      {messages.length > 0 && (
        <div className="border-t border-gray-200 p-3">
          <QuickActions onAction={handleQuickAction} />
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <textarea
              value={input}
              onChange={handleInputChange}
              placeholder="Type or speak..."
              className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
              }}
            />
          </div>
          
          {/* Voice Input Button */}
          <button
            type="button"
            onClick={() => setShowVoiceInput(!showVoiceInput)}
            className="flex-shrink-0 w-12 h-12 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            🎤
          </button>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex-shrink-0 w-12 h-12 rounded-lg bg-black text-white flex items-center justify-center hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

