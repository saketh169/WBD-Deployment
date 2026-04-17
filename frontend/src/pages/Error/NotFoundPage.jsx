import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * NotFoundPage Component
 * Generic 404 page for routes that don't exist within a role's context
 */
const NotFoundPage = ({ role }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleGoHome = () => {
    if (role) {
      navigate(`/${role}/home`);
    } else {
      navigate('/');
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-8 md:p-12 border border-gray-200">
        {/* Error Code */}
        <h1 className="text-6xl md:text-7xl font-bold text-gray-300 text-center mb-2">
          404
        </h1>

        {/* Error Title */}
        <h2 className="text-3xl font-bold text-gray-800 text-center mb-4">
          Page Not Found
        </h2>

        {/* Error Message */}
        <p className="text-gray-600 text-center mb-2 leading-relaxed">
          Sorry, we couldn't find the page you're looking for.
        </p>
        <p className="text-sm text-gray-500 text-center mb-8">
          The page at <code className="bg-gray-100 px-2 py-1 rounded text-sm">{location.pathname}</code> doesn't exist.
        </p>

        {/* Suggestions */}
        <div className="bg-green-50 border-l-4 border-[#27AE60] rounded-r-lg p-4 mb-8">
          <p className="text-sm text-[#1A4A40] font-semibold mb-2">Suggestions:</p>
          <ul className="list-disc list-inside text-sm text-[#2F4F4F] space-y-1 ml-2">
            <li>Check the URL for typos</li>
            <li>Use the navigation menu to find what you're looking for</li>
            <li>Go back to the home page and start over</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleGoBack}
            className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <svg
              className="w-4 h-4 inline-block mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Go Back
          </button>
          <button
            onClick={handleGoHome}
            className="px-6 py-3 bg-linear-to-r from-[#27AE60] to-[#1A4A40] text-white font-semibold rounded-lg hover:from-green-600 hover:to-[#1A4A40] transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <svg
              className="w-4 h-4 inline-block mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            {role ? `Go to ${role.charAt(0).toUpperCase() + role.slice(1)} Home` : 'Go to Home'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
