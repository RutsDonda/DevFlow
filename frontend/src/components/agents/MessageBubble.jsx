import React from 'react';

const MessageBubble = ({ message }) => {
  const { role, content, timestamp } = message;
  const isUser = role === 'user';
  const isSystem = role === 'system';

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Simple markdown renderer for code blocks
  const renderContent = (text) => {
    if (!text) return null;
    
    // Split by code block regex
    const parts = text.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        // Extract language and code
        const lines = part.slice(3, -3).split('\n');
        const lang = lines[0].trim();
        const code = lines.slice(1).join('\n');
        
        return (
          <div key={index} className="my-3 rounded-md overflow-hidden border border-gray-700 bg-[#1e1e1e]">
            {lang && (
              <div className="bg-gray-800 px-3 py-1 text-xs text-gray-400 border-b border-gray-700 flex justify-between items-center">
                <span>{lang}</span>
              </div>
            )}
            <pre className="p-3 text-sm overflow-x-auto text-gray-300 font-mono whitespace-pre">
              <code>{code || lines.join('\n')}</code>
            </pre>
          </div>
        );
      }
      
      // Render text with standard whitespace
      return (
        <span key={index} className="whitespace-pre-wrap">
          {part}
        </span>
      );
    });
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-gray-800/50 rounded-full px-4 py-1 text-xs text-gray-400 border border-gray-700">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`max-w-[85%] rounded-2xl px-5 py-4 ${
          isUser 
            ? 'bg-indigo-600 text-white rounded-br-sm' 
            : 'bg-gray-800 text-gray-200 border border-gray-700 rounded-bl-sm'
        }`}
      >
        <div className="text-sm leading-relaxed">
          {renderContent(content)}
        </div>
        <div className={`text-[10px] mt-2 ${isUser ? 'text-indigo-200 text-right' : 'text-gray-500 text-left'}`}>
          {formatTime(timestamp)}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
