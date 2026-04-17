import React from "react";
import MessageBubble from "./MessageBubble" ;
import { RefreshCw } from "lucide-react";


function MessageList({messages, onRetry}) {
  return (

    // this component will rneder all the messages in chat retrieving from the data passed as props 

    <div className= "flex flex-col space-y-2 " role = "log" aria-live = "polite">
      {messages.map((msg, index) => (
        <div key = {msg._id || msg.id || `msg-${index}`}>
          <MessageBubble message={msg} />
          {/* Show retry button for error messages */}
          {msg.isError && msg.failedMessage && (
            <div className="flex justify-start mt-2">
              <button
                onClick={() => onRetry(msg.failedMessage)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 shadow-md"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </div>
          )}
        </div>
      ))}

    </div>
   
    
    
  )
}

export default MessageList