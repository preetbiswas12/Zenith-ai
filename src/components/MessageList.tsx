import React, { useEffect, useRef } from 'react';
import { useZenith } from '../context/ZenithContext';
import { BrainCircuit, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import PromptTemplates from './PromptTemplates';

const MessageList: React.FC = () => {
  const { conversations, activeConversationId } = useZenith();
  const messageEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = activeConversationId
    ? conversations.find((c) => c.id === activeConversationId)
    : null;

  // Auto-scroll to the latest message when messages change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  if (!activeConversation) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <BrainCircuit size={48} className="mx-auto mb-4 text-indigo-500 dark:text-indigo-400" />
          <h2 className="text-xl font-semibold mb-2">No conversation selected</h2>
          <p>Select a conversation from the sidebar or create a new one.</p>
        </div>
      </div>
    );
  }

  if (activeConversation.messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-center p-4 text-gray-500 dark:text-gray-400">
          <div className="text-center max-w-md">
            <BrainCircuit size={48} className="mx-auto mb-4 text-indigo-500 dark:text-indigo-400" />
            <h2 className="text-xl font-semibold mb-2">Welcome to Zenith</h2>
            <p className="mb-4">
              Your AI study assistant powered by Gemini. I can help with research, explain concepts, summarize information, and more.
            </p>
            <p className="mb-6">Choose a template below or type your own message to start.</p>
          </div>
        </div>
        <PromptTemplates />
      </div>
    );
  }

  // Format time for message timestamp
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(date);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {activeConversation.messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`flex max-w-3xl ${
              message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            <div className={`flex-shrink-0 ${message.role === 'user' ? 'ml-4' : 'mr-4'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === 'user'
                  ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300'
                  : 'bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-300'
              }`}>
                {message.role === 'user' ? (
                  <User size={16} />
                ) : (
                  <BrainCircuit size={16} />
                )}
              </div>
            </div>
            <div
              className={`relative p-4 rounded-lg ${
                message.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none'
              }`}
            >
              <div className="prose dark:prose-invert">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
              <div
                className={`text-xs mt-2 ${
                  message.role === 'user'
                    ? 'text-indigo-200'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {formatTime(message.createdAt)}
              </div>
            </div>
          </div>
        </div>
      ))}
      <div ref={messageEndRef} />
    </div>
  );
};

export default MessageList;