import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * RateLimit429 Component
 * Displayed when user exceeds rate limits (HTTP 429 - Too Many Requests)
 */
const RateLimit429 = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = React.useState(10);

  // Countdown timer
  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Auto-redirect after countdown ends
  React.useEffect(() => {
    if (countdown === 0) {
      navigate('/');
    }
  }, [countdown, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-yellow-50 via-orange-50 to-red-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 md:p-12">
        {/* Error Title */}
        <h1 className="text-4xl font-bold text-gray-800 text-center mb-3">
          Whoa, Slow Down!
        </h1>
        <h2 className="text-xl font-semibold text-orange-600 text-center mb-6">
          Too Many Requests
        </h2>

        {/* Error Message */}
        <div className="bg-orange-50 border-l-4 border-orange-500 rounded-r-lg p-4 mb-6">
          <p className="text-gray-700 leading-relaxed mb-3">
            You've made too many requests in a short period of time. Please wait a moment before trying again.
          </p>
          <p className="text-sm text-gray-600">
            This limit helps us keep the service fast and reliable for everyone.
          </p>
        </div>

        {/* Countdown Timer */}
        <div className="bg-linear-to-r from-orange-100 to-yellow-100 rounded-lg p-6 mb-6 text-center">
          <p className="text-sm text-gray-600 mb-2">Please wait before retrying</p>
          <div className="flex items-center justify-center">
            <div className="relative">
              <svg className="w-20 h-20">
                <circle
                  className="text-orange-200"
                  strokeWidth="6"
                  stroke="currentColor"
                  fill="transparent"
                  r="30"
                  cx="40"
                  cy="40"
                />
                <circle
                  className="text-orange-500 transition-all duration-1000"
                  strokeWidth="6"
                  strokeDasharray={`${(countdown / 10) * 188.5} 188.5`}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r="30"
                  cx="40"
                  cy="40"
                  style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-orange-600">{countdown}s</span>
              </div>
            </div>
          </div>
        </div>

        {/* Auto-redirecting message */}
        <div className="text-center mt-6">
          <p className="text-gray-600">Redirecting to home page...</p>
        </div>
      </div>
    </div>
  );
};

export default RateLimit429;
