import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const OrganizationHome = () => {
  const navigate = useNavigate();

  const dutyItems = [
    { title: 'Manage Employees',  icon: 'fas fa-users-cog',  text: 'Add, update, activate or deactivate employees within your organization. Bulk-upload via CSV.',      route: '/organization/employee-management', accent: 'border-green-500',   iconColor: 'text-green-600',   hover: 'hover:bg-green-50'   },
    { title: 'Monitor Employees', icon: 'fas fa-chart-line', text: 'Track employee activity, task completion, and performance metrics across your team.',                 route: '/organization/employee-monitoring',  accent: 'border-emerald-500', iconColor: 'text-emerald-600', hover: 'hover:bg-emerald-50' },
    { title: 'Verify Dietitians', icon: 'fas fa-user-check', text: 'Review and approve credentials for new dietitian registrations to maintain platform trust.',          route: '/organization/verify-dietitian',    accent: 'border-lime-500', iconColor: 'text-lime-600', hover: 'hover:bg-lime-50' },
    { title: 'Moderate Blogs',    icon: 'fas fa-blog',       text: 'Govern community-submitted blog content. Remove inappropriate or low-quality posts.',                 route: '/organization/blog-moderation',     accent: 'border-teal-500',    iconColor: 'text-teal-600',    hover: 'hover:bg-teal-50'    },
  ];

  const quickLinks = [
    { title: 'Employee Management', subtitle: 'Add, update & manage your team',        icon: 'fas fa-users',          gradient: 'from-green-500 to-green-700',        link: '/organization/employee-management' },
    { title: 'Employee Monitoring', subtitle: 'Track activity & performance',           icon: 'fas fa-chart-bar',      gradient: 'from-emerald-500 to-emerald-700',    link: '/organization/employee-monitoring'  },
    { title: 'My Verification Status',   subtitle: 'Check your organization status',  icon: 'fas fa-shield-alt', gradient: 'from-[#27AE60] to-[#1A4A40]',    link: '/organization/doc-status'     },
  ];

  const modelSteps = [
    { step: '01', icon: 'fas fa-building',  title: 'Organization Account', desc: 'Your organization is verified by the platform admin. Once approved, you gain full access to manage your team.' },
    { step: '02', icon: 'fas fa-user-plus', title: 'Add Employees',        desc: 'Add individual employees or bulk-upload via CSV. Each gets a unique license number and login credentials.'     },
    { step: '03', icon: 'fas fa-tasks',     title: 'Employees Work',       desc: 'Employees log in to their own portal and handle dietitian verifications, blog moderation, and team support.'   },
    { step: '04', icon: 'fas fa-eye',       title: 'You Oversee',          desc: 'Monitor all employee activity, manage their status (active/inactive), and maintain full governance control.'   },
  ];

  const [openFaq, setOpenFaq] = useState(null);
  const faqs = [
    { q: 'How do I add employees to my organization?',                                         a: 'Go to Employee Management and click "Add Employee" to add individually, or use "Bulk Upload" to import multiple employees at once via CSV.' },
    { q: 'What can employees do on the platform?',                                             a: 'Employees can verify dietitian credentials, moderate reported blog content, and communicate via the support & team board — all scoped to your organization.' },
    { q: 'Can I control what employees can access?',                                           a: "Employee access is tied to your organization's verification status. If your organization is pending or rejected, employees cannot perform sensitive tasks." },
    { q: 'How do I deactivate an employee?',                                                   a: 'In the Employee Management page, find the employee and click "Mark Inactive". They will no longer be able to log in until reactivated.' },
    { q: 'What is the difference between Employee Management and Employee Monitoring?',         a: 'Management handles CRUD — adding, editing, removing employees. Monitoring shows activity logs, task history, and performance data for your team.' },
  ];

  const toggleFaq = (index) => setOpenFaq(openFaq === index ? null : index);

  return (
    <main className="flex-1 animate-fade-in ">

      {/* ======================================================= */}
      {/* 1. HERO / WELCOME SECTION */}
      {/* ======================================================= */}
      <section id="welcome-intro" className="bg-green-50 py-25 -mt-5 px-4 sm:px-6 md:px-8 min-h-150 animate-fade-in-up animate-delay-[200ms]">
        <div className="max-w-6xl mx-auto flex flex-col-reverse md:flex-row gap-12 items-center">

          {/* Content Block */}
          <div className="md:w-1/2 text-center md:text-left">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1A4A40] mb-4">
              Welcome, <div className="text-[#27AE60]">Organization Team!</div>
            </h1>
            <p className="text-xl font-medium text-gray-700 max-w-2xl mb-4">
              "Ensuring Integrity and Trust Across NutriConnect."
            </p>
            <p className="text-lg text-gray-700 max-w-2xl mb-3">
              Manage your team of employees, govern platform content, and maintain a trusted professional network on NutriConnect.
            </p>
            <p className="text-sm text-gray-500 mb-8">
              Your organization now operates on the <strong>Organization–Employee model</strong>. You manage your employees, and they carry out verification and moderation tasks under your oversight.
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <button
                onClick={() => navigate('/organization/employee-management')}
                className="bg-[#27AE60] text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-[#1E6F5C] transition-all duration-300"
              >
                <i className="fas fa-users-cog mr-2"></i>Manage Employees
              </button>
              <button
                onClick={() => navigate('/organization/employee-monitoring')}
                className="bg-[#5a8f5a] text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-[#1A4A40] transition-all duration-300"
              >
                <i className="fas fa-chart-bar mr-2"></i>Monitor Employees
              </button>
            </div>
          </div>

          {/* Image Block */}
          <div className="md:w-[60%] flex justify-center">
            <img
              src="https://img.freepik.com/free-vector/online-job-interview_23-2148613123.jpg?w=1380"
              alt="Organization Team"
              className="img-fluid rounded-xl w-[137.5] h-95 transition-transform duration-300 hover:scale-[1.02]"
            />
          </div>
        </div>
      </section>

      {/* ======================================================= */}
      {/* 2. HOW IT WORKS */}
      {/* ======================================================= */}
      <section id="how-it-works" className="py-12 px-4 sm:px-6 md:px-8 bg-gray-100 min-h-[125] animate-fade-in-up animate-delay-[350ms]">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-[#27AE60] font-semibold uppercase tracking-wider text-sm mb-2">Two-Tier System</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A4A40] mb-4">How the Organization–Employee Model Works</h2>
          <p className="text-gray-600 mb-10 text-lg">Full control over your team, from onboarding to oversight.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {modelSteps.map((step, i) => (
              <div key={step.step} className="relative bg-white rounded-xl p-6 border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300 text-left group">
                {i < modelSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 -right-4 w-8 h-0.5 bg-gray-300 z-10" />
                )}
                <div className="text-3xl font-black text-gray-100 mb-3 group-hover:text-green-100 transition-colors">{step.step}</div>
                <div className="text-5xl text-[#27AE60] mb-4"><i className={step.icon}></i></div>
                <h3 className="text-lg font-bold text-[#1A4A40] mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================= */}
      {/* 3. QUICK ACCESS */}
      {/* ======================================================= */}
      <section id="quick-access" className="py-12 px-4 sm:px-6 md:px-8 bg-white min-h-[125] animate-fade-in-up animate-delay-[500ms]">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-[#27AE60] font-semibold uppercase tracking-wider text-sm mb-2">Jump Right In</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A4A40] mb-4">Quick Access</h2>
          <p className="text-gray-600 mb-10 text-lg">Navigate directly to the most important areas of your dashboard.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {quickLinks.map((item, index) => (
              <button key={index} onClick={() => navigate(item.link)}
                className={`group relative bg-gradient-to-br ${item.gradient} rounded-xl p-6 text-white text-left shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 overflow-hidden`}>
                <div className="absolute right-4 bottom-4 text-white/10 text-6xl group-hover:text-white/20 transition-colors pointer-events-none">
                  <i className={item.icon}></i>
                </div>
                <div className="text-3xl mb-4 text-white/90"><i className={item.icon}></i></div>
                <h3 className="text-xl font-bold mb-1">{item.title}</h3>
                <p className="text-sm text-white/70 mb-4">{item.subtitle}</p>
                <span className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-1.5 rounded-full transition-colors">
                  Open <i className="fas fa-arrow-right text-xs"></i>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================= */}
      {/* 4. CORE DUTIES */}
      {/* ======================================================= */}
      <section id="core-duties" className="py-12 px-4 sm:px-6 md:px-8 bg-gray-100 min-h-[125] animate-fade-in-up animate-delay-[700ms]">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-[#27AE60] font-semibold uppercase tracking-wider text-sm mb-2">Responsibilities</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A4A40] mb-4">Core Duties</h2>
          <p className="text-gray-600 mb-10 text-lg">All areas of responsibility you manage as an organization.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {dutyItems.map((item, index) => (
              <div key={index} onClick={() => navigate(item.route)}
                className={`bg-white p-6 rounded-xl shadow-md border-b-4 border-[#27AE60] hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer`}>
                <div className={`text-4xl text-[#27AE60] mb-4`}>
                  <i className={item.icon}></i>
                </div>
                <h3 className="text-lg font-semibold text-[#2F4F4F] mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================= */}
      {/* 6. GUIDE SECTION */}
      {/* ======================================================= */}
      <section id="guide" className="py-12 px-4 sm:px-6 md:px-8 bg-gradient-to-r from-[#27AE60] to-[#1A4A40] min-h-[125] animate-fade-in-up animate-delay-[800ms]">
        <div className="max-w-6xl mx-auto text-white">
          <h2 className="text-4xl sm:text-5xl font-bold mb-8 text-center flex items-center justify-center gap-3">
            <i className="fas fa-compass text-2xl"></i>Organization Guides
          </h2>
          <p className="text-xl text-green-100 mb-8 text-center max-w-3xl mx-auto leading-relaxed">
            Select the guide that matches your role to master the organization-employee model and best practices.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Management Guide */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 hover:bg-white/20 transition-all duration-300 transform hover:scale-105">
              <div className="text-5xl mb-4 text-green-300">
                <i className="fas fa-users-cog"></i>
              </div>
              <h3 className="text-2xl font-bold mb-3">Organization Management</h3>
              <p className="text-green-100 mb-6 text-lg leading-relaxed">
                Learn to manage employees, oversee verifications, and maintain comprehensive platform governance.
              </p>
              <button
                onClick={() => navigate('/guide?role=organization-management')}
                className="bg-white text-[#1A4A40] font-bold py-3 px-8 rounded-full hover:bg-gray-100 transition-all shadow-lg inline-flex items-center gap-2"
              >
                <i className="fas fa-book"></i>Read Management Guide
              </button>
            </div>
            
            {/* Employee Guide */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 hover:bg-white/20 transition-all duration-300 transform hover:scale-105">
              <div className="text-5xl mb-4 text-green-300">
                <i className="fas fa-user-tie"></i>
              </div>
              <h3 className="text-2xl font-bold mb-3">Organization Employee</h3>
              <p className="text-green-100 mb-6 text-lg leading-relaxed">
                Master dietitian verification, blog moderation, and team collaboration with best practices.
              </p>
              <button
                onClick={() => navigate('/guide?role=organization-employee')}
                className="bg-white text-[#1A4A40] font-bold py-3 px-8 rounded-full hover:bg-gray-100 transition-all shadow-lg inline-flex items-center gap-2"
              >
                <i className="fas fa-book"></i>Read Employee Guide
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================= */}
      {/* 5. FAQs (Updated numbering after adding guide) */}
      {/* ======================================================= */}
      <section id="faqs" className="py-12 px-4 sm:px-6 md:px-8 bg-white min-h-[125] animate-fade-in-up animate-delay-[900ms]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A4A40] text-center mb-12">
            Organization Team Support FAQs
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="border border-gray-300 rounded-lg bg-gray-50 shadow-md">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full text-left p-4 font-semibold text-[#2F4F4F] flex justify-between items-center hover:bg-gray-100 transition"
                  aria-expanded={openFaq === index}
                >
                  {faq.q}
                  <i className={`fas fa-chevron-down text-[#27AE60] transition-transform duration-300 ${openFaq === index ? 'rotate-180' : 'rotate-0'}`}></i>
                </button>
                <div
                  className={`transition-all duration-300 ease-in-out ${openFaq === index ? 'max-h-96 opacity-100 p-4 pt-0' : 'max-h-0 opacity-0 overflow-hidden'}`}
                >
                  <p className="text-gray-600 border-t border-gray-200 pt-4">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==== GLOBAL STYLES (Animations/Scroll Margin) ==== */}
      <style>
        {`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          .animate-fade-in { animation: fadeIn 0.6s ease-in-out; }
          .animate-fade-in-up { 
            animation: fadeInUp 0.6s ease-out both; 
          }
          @keyframes fadeInUp { 
            from { transform: translateY(20px); opacity: 0; } 
            to { transform: translateY(0); opacity: 1; } 
          }
          
          .animate-delay-\\[200ms\\] { animation-delay: 200ms; }
          .animate-delay-\\[350ms\\] { animation-delay: 350ms; }
          .animate-delay-\\[500ms\\] { animation-delay: 500ms; }
          .animate-delay-\\[700ms\\] { animation-delay: 700ms; }
          .animate-delay-\\[900ms\\] { animation-delay: 900ms; }
          
          /* Custom Tailwind utilities for dynamic colors */
          .text-\\[\\#27AE60\\] { color: #27AE60; }
          .border-\\[\\#27AE60\\] { border-color: #27AE60; }
          .bg-\\[\\#27AE60\\] { background-color: #27AE60; }
          .hover\\:bg-\\[\\#1E6F5C\\]:hover { background-color: #1E6F5C; }
          .text-\\[\\#5a8f5a\\] { color: #5a8f5a; }

          #welcome-intro, #how-it-works, #quick-access, #core-duties, #guide, #faqs {
            scroll-margin-top: 90px; 
          }
        `}
      </style>
    </main>
  );
};

export default OrganizationHome;
