import React, { useState, useEffect, useRef } from 'react';
import { agentAPI } from '../../services/api';
import useSocket from '../../hooks/useSocket';
import MessageBubble from './MessageBubble';
import Button from '../common/Button';
import Loader from '../common/Loader';
import { HiPaperAirplane, HiOutlineCommandLine, HiOutlineDocumentText, HiOutlineShieldCheck } from 'react-icons/hi2';
import toast from 'react-hot-toast';

const AgentChat = ({ agentType, projectId }) => {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const { on, off } = useSocket();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchConversation = async () => {
      setIsLoading(true);
      try {
        const response = await agentAPI.getConversation(agentType, projectId);
        if (response.success && response.data.conversation) {
          setConversation(response.data.conversation);
          setMessages(response.data.conversation.messages || []);
        } else {
          setMessages([]);
        }
      } catch (error) {
        console.error('Failed to fetch conversation:', error);
        toast.error('Failed to load conversation');
      } finally {
        setIsLoading(false);
      }
    };

    if (agentType && projectId) {
      fetchConversation();
    }
  }, [agentType, projectId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleTaskStarted = (data) => {
      if (data.agentType === agentType && data.projectId === projectId) {
        setIsSending(true);
        // Optionally add a system message
      }
    };

    const handleTaskCompleted = (data) => {
      if (data.agentType === agentType && data.projectId === projectId) {
        setIsSending(false);
        // Fetch latest messages to get the actual response
        agentAPI.getConversation(agentType, projectId)
          .then(res => {
            if (res.success && res.data.conversation) {
              setMessages(res.data.conversation.messages || []);
            }
          })
          .catch(console.error);
      }
    };

    const handleTaskFailed = (data) => {
      if (data.agentType === agentType && data.projectId === projectId) {
        setIsSending(false);
        toast.error(`Agent task failed: ${data.error}`);
        // Optionally fetch messages to show error message from agent
      }
    };

    on('agent:task-started', handleTaskStarted);
    on('agent:task-completed', handleTaskCompleted);
    on('agent:task-failed', handleTaskFailed);

    return () => {
      off('agent:task-started', handleTaskStarted);
      off('agent:task-completed', handleTaskCompleted);
      off('agent:task-failed', handleTaskFailed);
    };
  }, [agentType, projectId, on, off]);

  const handleSendMessage = async (e, action = null) => {
    if (e) e.preventDefault();
    
    const textToSend = inputMessage.trim();
    if (!textToSend && !action) return;

    // Optimistically add user message
    const newMessage = {
      role: 'user',
      content: textToSend || `Action: ${action}`,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    setIsSending(true);

    try {
      const response = await agentAPI.execute(agentType, {
        projectId,
        message: textToSend,
        action
      });
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Execution failed');
      }
      
      // If it's a sync response, add it immediately
      if (response.data && response.data.response) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.data.response,
          timestamp: new Date().toISOString()
        }]);
        setIsSending(false);
      }
      // If async, wait for socket event
      
    } catch (error) {
      toast.error(error.message || 'Failed to send message');
      setIsSending(false);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m !== newMessage));
    }
  };

  const getAgentIcon = () => {
    switch(agentType) {
      case 'coding': return <HiOutlineCommandLine className="w-5 h-5" />;
      case 'documentation': return <HiOutlineDocumentText className="w-5 h-5" />;
      case 'monitor': return <HiOutlineShieldCheck className="w-5 h-5" />;
      default: return null;
    }
  };

  const getAgentActions = () => {
    switch(agentType) {
      case 'coding':
        return ['Generate Code', 'Refactor', 'Debug'];
      case 'documentation':
        return ['Generate README', 'API Docs', 'Architecture'];
      case 'monitor':
        return ['Analyze Project', 'Risk Assessment'];
      default:
        return [];
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex justify-center items-center h-full min-h-[400px]">
        <Loader />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center text-white font-medium capitalize">
          <span className="text-indigo-400 mr-2">{getAgentIcon()}</span>
          {agentType} Agent
        </div>
        {isSending && (
          <div className="flex items-center text-xs text-indigo-400">
            <Loader size="sm" className="mr-2" />
            Agent is thinking...
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-900 min-h-[300px]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
            <div className="p-4 bg-gray-800 rounded-full">
              {getAgentIcon()}
            </div>
            <p>No messages yet. Start a conversation!</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <MessageBubble key={index} message={msg} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-gray-800 border-t border-gray-700">
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mb-3">
          {getAgentActions().map(action => (
            <button
              key={action}
              onClick={() => handleSendMessage(null, action)}
              disabled={isSending}
              className="px-3 py-1 text-xs font-medium rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition-colors disabled:opacity-50"
            >
              {action}
            </button>
          ))}
        </div>

        <form onSubmit={(e) => handleSendMessage(e)} className="relative">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            placeholder={`Message ${agentType} agent... (Press Enter to send, Shift+Enter for new line)`}
            className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-3 pr-12 resize-none custom-scrollbar"
            rows={Math.min(Math.max(inputMessage.split('\n').length, 1), 4)}
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={(!inputMessage.trim() && !isSending) || isSending}
            className="absolute right-2 bottom-2 p-2 text-indigo-400 hover:text-indigo-300 disabled:text-gray-600 transition-colors bg-gray-800 rounded-md"
          >
            {isSending ? <Loader size="sm" /> : <HiPaperAirplane className="w-5 h-5 transform rotate-90" />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AgentChat;
