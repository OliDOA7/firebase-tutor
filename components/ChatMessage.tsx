
import React from 'react';
import { ChatMessageData, ActionButtonProps as ActionButtonType } from '../types'; // Renamed to avoid conflict

interface ChatMessageProps {
  message: ChatMessageData;
}

const ActionButton: React.FC<ActionButtonType> = ({ label, onClick, value, className }) => (
  <button
    onClick={() => onClick()} // if value is needed, the parent onClick should handle it
    className={`mt-2 mr-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-opacity-50 ${className || 'bg-sky-500 hover:bg-sky-600 text-white focus:ring-sky-400'}`}
  >
    {label}
  </button>
);

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isBot = message.sender === 'bot';
  const messageBg = isBot ? 'bg-slate-700' : 'bg-sky-600';
  const textAlign = isBot ? 'text-left' : 'text-right';
  const margin = isBot ? 'mr-auto' : 'ml-auto';

  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-4`}>
      <div className={`max-w-xl lg:max-w-2xl xl:max-w-3xl px-4 py-3 rounded-xl shadow-md ${messageBg} ${textAlign} ${margin}`}>
        {message.isLoading ? (
          <div className="flex items-center">
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse mr-1"></div>
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse mr-1 delay-150"></div>
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-300"></div>
          </div>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none break-words">{message.text}</div>
        )}
        {message.actions && !message.isLoading && (
          <div className="mt-3 flex flex-wrap">
            {message.actions.map((action, index) => (
              <ActionButton key={index} {...action} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
    