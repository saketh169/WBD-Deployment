import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../contexts/AuthContext';

const EmployeeHome = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const employeeName = user?.name || 'Employee';

  const taskCards = [
    {
      title: 'Dietitian Verification',
      icon: 'fas fa-user-check',
      description: 'Verify dietitian credentials and approve professional profiles submitted for review.',
      route: '/employee/verify-dietitian',
      color: 'bg-[#27AE60]/10 border-[#27AE60]/30',
      iconColor: 'text-[#27AE60]',
      btnColor: 'bg-[#27AE60] hover:bg-[#1A4A40]',
    },
    {
      title: 'Blog Moderation',
      icon: 'fas fa-blog',
      description: 'Review and moderate reported blog posts. Ensure all content meets community guidelines.',
      route: '/employee/blog-moderation',
      color: 'bg-emerald-50 border-emerald-200',
      iconColor: 'text-emerald-600',
      btnColor: 'bg-emerald-600 hover:bg-emerald-700',
    },
    {
      title: 'Support & Team Board',
      icon: 'fas fa-headset',
      description: 'Raise queries or issues related to verifications, content, or internal matters. Collaborate with fellow employees on the Team Board.',
      route: '/employee/support',
      color: 'bg-lime-50 border-lime-200',
      iconColor: 'text-lime-600',
      btnColor: 'bg-lime-600 hover:bg-lime-700',
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-linear-to-r from-green-50 to-green-50 rounded-2xl p-8 mb-8 border border-green-200 text-[#1A4A40] shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#27AE60]/20 flex items-center justify-center text-3xl font-bold text-[#27AE60]">
            {employeeName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-bold">Welcome, {employeeName}!</h1>
            <p className="text-[#27AE60] mt-1 text-lg font-semibold">NutriConnect Employee Portal</p>
          </div>
        </div>
        <p className="mt-4 text-gray-700 max-w-2xl text-lg">
          You're logged in as an organization employee. Use the sidebar or the quick links below to access your assigned tasks.
        </p>
      </div>

      {/* Task Cards */}
      <h2 className="text-xl font-bold text-[#27AE60] mb-4">
        <i className="fas fa-tasks mr-2"></i>Your Tasks
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {taskCards.map((card) => (
          <div
            key={card.route}
            className={`rounded-2xl border-2 p-6 ${card.color} transition-all duration-200 hover:shadow-md`}
          >
            <div className={`text-4xl mb-4 ${card.iconColor}`}>
              <i className={card.icon}></i>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{card.title}</h3>
            <p className="text-gray-600 text-sm mb-5 leading-relaxed">{card.description}</p>
            <button
              onClick={() => navigate(card.route)}
              className={`${card.btnColor} text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm`}
            >
              <i className="fas fa-arrow-right mr-2"></i>Go to {card.title}
            </button>
          </div>
        ))}
      </div>

      {/* Info Section */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-[#1A4A40] mb-3">
          <i className="fas fa-info-circle mr-2 text-[#27AE60]"></i>About Your Role
        </h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start gap-3">
            <i className="fas fa-check-circle text-[#27AE60] mt-0.5"></i>
            <span><strong>Dietitian Verification:</strong> Examine credentials, licenses, and documents submitted by dietitians to ensure they meet platform standards.</span>
          </div>
          <div className="flex items-start gap-3">
            <i className="fas fa-check-circle text-[#27AE60] mt-0.5"></i>
            <span><strong>Blog Moderation:</strong> Review user-submitted blog posts that have been reported for inappropriate or low-quality content.</span>
          </div>
          <div className="flex items-start gap-3">
            <i className="fas fa-check-circle text-[#27AE60] mt-0.5"></i>
            <span><strong>Support & Team Board:</strong> Submit queries or issues to the organization, and communicate with fellow employees via the shared team board.</span>
          </div>
          <div className="flex items-start gap-3">
            <i className="fas fa-check-circle text-[#27AE60] mt-0.5"></i>
            <span>All actions are logged and reviewed by your organization's management team.</span>
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-gray-100 rounded-2xl border border-gray-200 p-8 shadow-lg mt-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h3 className="text-2xl font-bold text-[#27AE60] mb-3">
              <i className="fas fa-book-open mr-3"></i>Employee Guide
            </h3>
            <p className="text-gray-700 mb-4 text-lg">
              Learn everything you need to know about your role, responsibilities, and how to excel in your position on NutriConnect.
            </p>
            <button
              onClick={() => navigate('/guide?role=organization-employee')}
              className="bg-[#27AE60] text-white font-bold py-3 px-8 rounded-full hover:bg-[#1A4A40] transition-all shadow-md inline-flex items-center gap-2"
            >
              <i className="fas fa-compass"></i>Go to Guide
            </button>
          </div>
          <div className="text-6xl opacity-10 hidden sm:block text-[#27AE60]">
            <i className="fas fa-user-tie"></i>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeHome;
