import React, { useState, useRef, useEffect } from 'react';
import TextareaAutoSize from "react-textarea-autosize";
import { FiSend } from "react-icons/fi";
import { UtensilsCrossed, Copy, Check, RefreshCw, Trash2, MessageCircle } from 'lucide-react';
import { getChatbotResponse, getChatbotFAQs } from '../../services/misc/miscService';
import SubscriptionAlert from '../../middleware/SubscriptionAlert';
import { useAuthContext } from '../../hooks/useAuthContext';

const ChatBotHeader = () => (
  <div className="flex items-center space-x-3">
    <div className="relative">
      <div className="w-10 h-10 bg-linear-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white shadow-md">
        <i className="fas fa-robot text-lg" />
      </div>
      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" />
    </div>
    <div>
      <h1 className="text-xl font-bold text-slate-800">NutriBot</h1>
      <p className="text-xs text-emerald-600 font-medium flex items-center">
        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse" />
        Online • AI Nutrition Assistant
      </p>
    </div>
  </div>
);

const NutritionCard = ({ data }) => (
  <div className="bg-linear-to-r from-emerald-50 to-teal-50 border-l-4 border-emerald-500 p-4 rounded-r-lg shadow-md hover:shadow-lg transition-shadow duration-300">
    <h4 className="font-bold text-emerald-800 text-base mb-2 flex items-center gap-2">
      <UtensilsCrossed className="w-4 h-4 text-emerald-600" />
      {data.foodName}
    </h4>
    <div className="flex flex-wrap gap-3 text-sm text-gray-700">
      <div className="flex items-center">
        <span className="font-semibold text-emerald-600 mr-1">Calories:</span>
        <span className="font-bold">{data.nutrients.calories}</span>
        <span className="ml-1 text-xs text-gray-600">kcal</span>
      </div>
      <div className="flex items-center">
        <span className="font-semibold text-emerald-600 mr-1">Protein:</span>
        <span className="font-bold">{data.nutrients.protein}</span>
        <span className="ml-1 text-xs text-gray-600">g</span>
      </div>
      <div className="flex items-center">
        <span className="font-semibold text-emerald-600 mr-1">Carbs:</span>
        <span className="font-bold">{data.nutrients.carbs}</span>
        <span className="ml-1 text-xs text-gray-600">g</span>
      </div>
    </div>
  </div>
);

const MessageBubble = ({ message }) => {
  const isUser = message.type === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatBotMessage = (text) => {
    if (!text) return null;
    const paragraphs = text.split('\n\n');

    return paragraphs.map((para, idx) => {
      const trimmedPara = para.trim();

      if (trimmedPara.startsWith('#')) {
        const level = trimmedPara.match(/^#+/)[0].length;
        const headingText = trimmedPara.replace(/^#+\s*/, '');
        if (level === 1) return <h1 key={idx} className="text-xl font-bold text-gray-900 mb-2 mt-4 first:mt-0">{headingText}</h1>;
        if (level === 2) return <h2 key={idx} className="text-lg font-bold text-gray-800 mb-2 mt-3 first:mt-0">{headingText}</h2>;
        return <h3 key={idx} className="text-base font-semibold text-gray-700 mb-2 mt-2 first:mt-0">{headingText}</h3>;
      }

      if (/^\d+\./.test(trimmedPara)) {
        const items = para.split('\n').filter(line => line.trim());
        return (
          <ol key={idx} className="list-decimal list-inside space-y-2 my-3 pl-2">
            {items.map((item, i) => {
              const cleanItem = item.replace(/^\d+\.\s*/, '');
              const boldItem = cleanItem.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
              return <li key={i} className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: boldItem }} />;
            })}
          </ol>
        );
      }

      if (/^[•\-*✓]/.test(trimmedPara)) {
        const items = para.split('\n').filter(line => line.trim());
        return (
          <ul key={idx} className="space-y-2 my-3">
            {items.map((item, i) => {
              const cleanItem = item.replace(/^[•\-*✓]\s*/, '');
              const boldItem = cleanItem.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
              return (
                <li key={i} className="text-sm leading-relaxed flex items-start">
                  <span className="text-emerald-600 mr-2 font-bold shrink-0">&#10003;</span>
                  <span dangerouslySetInnerHTML={{ __html: boldItem }} />
                </li>
              );
            })}
          </ul>
        );
      }

      let processedText = trimmedPara
        .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-gray-800">$1</code>')
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em class="italic text-gray-700">$1</em>');

      return (
        <p key={idx} className="text-sm md:text-base leading-relaxed mb-3 last:mb-0" dangerouslySetInnerHTML={{ __html: processedText }} />
      );
    });
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className="max-w-xs md:max-w-md lg:max-w-lg">
        <div
          className={`px-4 py-3 rounded-lg shadow-md relative group ${
            isUser
              ? "bg-linear-to-r from-emerald-500 to-teal-600 text-white rounded-br-none"
              : "bg-white text-gray-800 border-2 border-emerald-100 rounded-bl-none"
          }`}
        >
          {isUser ? (
            <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none">{formatBotMessage(message.content)}</div>
          )}

          {message.timestamp && (
            <p className={`text-xs mt-1 ${isUser ? "text-emerald-100" : "text-gray-500"}`}>
              {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}

          {!isUser && (
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs font-medium shadow-sm flex items-center gap-1 cursor-pointer"
              title="Copy message"
            >
              {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
            </button>
          )}
        </div>

        {!isUser && message.nutritionData && (
          <div className="mt-2 space-y-2">
            {message.nutritionData.map((item, index) => (
              <NutritionCard key={index} data={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const MessageList = ({ messages, onRetry }) => (
  <div className="flex flex-col space-y-2" role="log" aria-live="polite">
    {messages.map((msg, index) => (
      <div key={msg._id || msg.id || `msg-${index}`}>
        <MessageBubble message={msg} />
        {msg.isError && msg.failedMessage && (
          <div className="flex justify-start mt-2">
            <button
              onClick={() => onRetry(msg.failedMessage)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        )}
      </div>
    ))}
  </div>
);

const InputArea = ({ onSendMessage }) => {
  const [inputValue, setInputValue] = useState("");

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex px-6 py-4 bg-white rounded-b-2xl shadow-md gap-3 border-t-2 border-emerald-100">
      <TextareaAutoSize
        minRows={1}
        maxRows={6}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyPress={handleKeyPress}
        className="flex-1 border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-base resize-none"
        placeholder="Type your message here... (Press Enter to send)"
      />
      <button
        onClick={handleSend}
        disabled={!inputValue.trim()}
        className="bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white rounded-lg px-6 py-3 flex items-center justify-center transition-all shadow-md cursor-pointer"
      >
        <FiSend className="text-xl" />
      </button>
    </div>
  );
};

function ChatBotPage() {
  const { user } = useAuthContext();
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      content: 'Hello! I\'m your NutriConnect nutrition assistant.\n\nI can help you with:\n• Nutrition information for foods\n• Diet and meal planning advice\n• Health and wellness guidance\n• Answer your nutrition questions\n\nTry asking me something or click a Quick Question below!',
      timestamp: new Date()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingMessage, setTypingMessage] = useState('Typing...');
  const [faqQuestions, setFaqQuestions] = useState([]);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [showSubscriptionAlert, setShowSubscriptionAlert] = useState(false);
  const [subscriptionAlertData, setSubscriptionAlertData] = useState({});

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        handleClearChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchTopFAQs = async () => {
    const res = await getChatbotFAQs();
    if (!res.isError && res.faqs && res.faqs.length > 0) {
      setFaqQuestions(res.faqs);
    } else {
      setFaqQuestions([
        'What is NutriConnect?',
        'How can I lose weight?',
        'How to use the ChatBot?',
        'What are the benefits?'
      ]);
    }
  };

  useEffect(() => {
    fetchTopFAQs();
  }, []);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleClearChat = () => {
    setMessages([{
      type: 'bot',
      content: 'Chat cleared!\n\nReady to help with your nutrition questions. What would you like to know?',
      timestamp: new Date()
    }]);
  };

  const handleRetry = async (failedMessage) => {
    setMessages(prev => prev.slice(0, -1));
    await handleSendMessage(failedMessage);
  };

  const handleRegenerate = async () => {
    if (messages.length < 2) return;
    const lastUserMessage = messages.slice().reverse().find(msg => msg.type === 'user');
    if (!lastUserMessage) return;
    setMessages(prev => prev.slice(0, -1));
    await handleSendMessage(lastUserMessage.content);
  };

  const handleSendMessage = async (messageText) => {
    if (!messageText.trim()) return;

    const userMessage = {
      type: 'user',
      content: messageText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      if (messageText.toLowerCase().includes('nutrition') || messageText.toLowerCase().includes('calorie')) {
        setTypingMessage('Analyzing nutrition data...');
      } else if (messageText.toLowerCase().includes('diet') || messageText.toLowerCase().includes('meal')) {
        setTypingMessage('Preparing diet recommendations...');
      } else if (messageText.toLowerCase().includes('weight') || messageText.toLowerCase().includes('lose')) {
        setTypingMessage('Consulting weight management expert...');
      } else {
        setTypingMessage('Consulting AI nutritionist...');
      }

      const userId = user?.id || null;
      const res = await getChatbotResponse(messageText, sessionId, userId);

      if (!res.isError && res.success) {
        const botMessage = {
          type: 'bot',
          content: res.message,
          timestamp: new Date(),
          nutritionData: res.nutritionData || null,
          source: res.source
        };
        setMessages(prev => [...prev, botMessage]);
      } else if (res.limitReached) {
        const errorData = res.limitData || {};
        setSubscriptionAlertData({
          message: errorData.message || res.message,
          planType: errorData.planType || 'free',
          limitType: 'chatbot',
          currentCount: errorData.currentCount || 0,
          limit: errorData.limit || 0
        });
        setShowSubscriptionAlert(true);
      } else {
        setMessages(prev => [
          ...prev,
          {
            type: 'bot',
            content: res.message || 'Sorry, I encountered an error connecting to the server. Please try again.',
            timestamp: new Date(),
            isError: true,
            failedMessage: messageText
          }
        ]);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleFAQClick = async (question) => {
    const userMessage = {
      type: 'user',
      content: question,
      timestamp: new Date(),
      isQuickQuestion: true
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    setTypingMessage('Finding answer...');

    try {
      const userId = user?.id || null;
      const res = await getChatbotResponse(question, sessionId, userId);

      if (!res.isError && res.success) {
        setMessages(prev => [
          ...prev,
          {
            type: 'bot',
            content: res.message,
            timestamp: new Date(),
            nutritionData: res.nutritionData || null,
            source: res.source,
            isQuickQuestionMatch: res.source === 'faq'
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            type: 'bot',
            content: 'Sorry, I couldn\'t find an answer to that question. Please try asking another way.',
            timestamp: new Date(),
            isError: true
          }
        ]);
      }
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto -mt-30 bg-linear-to-b from-emerald-50 to-teal-50 rounded-2xl shadow-2xl flex flex-col h-[84vh] border border-emerald-200 overflow-hidden">
      <div className="bg-white rounded-t-2xl px-6 py-4 shadow-md border-b-4 border-emerald-500 shrink-0">
        <div className="flex justify-between items-center">
          <ChatBotHeader />
        </div>
      </div>

      <div 
        ref={messagesContainerRef}
        className="flex-1 p-6 overflow-y-auto bg-linear-to-b from-white to-emerald-50" 
        style={{ scrollBehavior: 'smooth' }}
      >
        <MessageList messages={messages} onRetry={handleRetry} />
        
        {messages.length > 1 && messages[messages.length - 1].type === 'bot' && !messages[messages.length - 1].isError && (
          <div className="flex justify-start mb-4">
            <button
              onClick={handleRegenerate}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border border-emerald-200 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Regenerate response</span>
            </button>
          </div>
        )}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-linear-to-r from-gray-100 to-gray-200 text-gray-700 px-4 py-3 rounded-lg mb-2 max-w-xs md:max-w-md shadow-md">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
                <span className="text-sm font-medium">{typingMessage}</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-linear-to-r from-slate-50 to-emerald-50 px-6 py-3 border-t-2 border-emerald-200 shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <h2 className="text-sm font-bold text-emerald-800 mb-2 flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5" />
              Quick Questions
            </h2>
            <div className="flex gap-2 flex-wrap">
              {faqQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleFAQClick(question)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-all shadow-md cursor-pointer"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleClearChat}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 shadow-md ml-4 cursor-pointer"
            title="Clear Chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="shrink-0">
        <InputArea onSendMessage={handleSendMessage} />
      </div>

      {showSubscriptionAlert && (
        <SubscriptionAlert
          message={subscriptionAlertData.message}
          planType={subscriptionAlertData.planType}
          limitType={subscriptionAlertData.limitType}
          currentCount={subscriptionAlertData.currentCount}
          limit={subscriptionAlertData.limit}
          onClose={() => setShowSubscriptionAlert(false)}
        />
      )}
    </div>
  );
}

export default ChatBotPage;