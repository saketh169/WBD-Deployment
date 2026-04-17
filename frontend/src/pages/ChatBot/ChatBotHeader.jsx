import React from "react";
import { FiX } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { BotMessageSquare } from "lucide-react";

function ChatBotHeader() {
  const navigate = useNavigate();
  
  return (
    <div className="w-full flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-linear-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-md">
          <BotMessageSquare className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-emerald-800">NutriConnect AI</h1>
          <p className="text-xs text-emerald-600">Your Nutrition Assistant</p>
        </div>
      </div>
      <button
        onClick={() => navigate(-1)}
        className="text-gray-500 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all duration-300"
        aria-label="Close chatbot"
      >
        <FiX className="text-2xl" />
      </button>
    </div>
  );
}

export default ChatBotHeader;