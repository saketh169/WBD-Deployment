import React, { useState, useEffect, useRef } from 'react';
import { globalSearch } from '../../services/misc/miscService';
import { useNavigate } from 'react-router-dom';

const GlobalSearch = ({ onClose, currentRole }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ dietitians: [], blogs: [], users: [], mealplans: [], organizations: [] });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef(null);

  // Detect logged-in role from currentRole or localStorage session
  const getStoredRole = () => {
    const roles = ['user', 'dietitian', 'admin', 'organization', 'employee'];
    for (const r of roles) {
      if (localStorage.getItem(`authToken_${r}`)) return r;
    }
    return null;
  };

  const effectiveRole = currentRole || getStoredRole();
  const isLoggedIn = !!effectiveRole;

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults({ dietitians: [], blogs: [], users: [], mealplans: [], organizations: [] });
      return;
    }

    const fetchResults = async () => {
      setIsLoading(true);
      const res = await globalSearch(query, 3);
      if (!res.isError && res.success) {
        if (!isLoggedIn) {
          // Unauthenticated users ONLY receive public articles & blogs
          setResults({
            dietitians: [],
            blogs: res.results?.blogs || [],
            users: [],
            mealplans: [],
            organizations: []
          });
        } else {
          // Logged-in users receive role-scoped results
          setResults({
            dietitians: ['user', 'admin', 'organization', 'employee'].includes(effectiveRole) ? (res.results?.dietitians || []) : [],
            blogs: res.results?.blogs || [],
            users: ['dietitian', 'admin'].includes(effectiveRole) ? (res.results?.users || []) : [],
            mealplans: ['user', 'dietitian', 'admin'].includes(effectiveRole) ? (res.results?.mealplans || []) : [],
            organizations: effectiveRole === 'admin' ? (res.results?.organizations || []) : []
          });
        }
      }
      setIsLoading(false);
    };

    const timer = setTimeout(fetchResults, 300); // debounce
    return () => clearTimeout(timer);
  }, [query, isLoggedIn, effectiveRole]);

  // Static navigation shortcuts
  const staticNavigations = [
    // --- Universal Public Pages (Accessible to everyone) ---
    { keywords: ['home', 'main', 'landing'], title: 'Home', icon: 'fa-home', path: isLoggedIn ? `/${effectiveRole}/home` : '/' },
    { keywords: ['about', 'about us', 'mission', 'who we are', 'team'], title: 'About Us', icon: 'fa-info-circle', path: '/about-us' },
    { keywords: ['contact', 'contact us', 'support', 'help', 'email', 'get in touch'], title: 'Contact Us', icon: 'fa-headset', path: isLoggedIn ? `/${effectiveRole}/contact-us` : '/contact-us' },
    { keywords: ['guide', 'how to use', 'manual', 'documentation', 'walkthrough'], title: 'User Guide', icon: 'fa-book-open', path: '/guide' },
    { keywords: ['blog', 'blogs', 'articles', 'posts', 'news', 'stories'], title: 'Community Blogs', icon: 'fa-blog', path: isLoggedIn ? `/${effectiveRole}/blog` : '/blog' },
    { keywords: ['privacy', 'privacy policy', 'policy', 'confidentiality', 'data protection', 'gdpr'], title: 'Privacy Policy', icon: 'fa-shield-halved', path: '/privacy-policy' },
    { keywords: ['terms', 'terms of use', 'terms and conditions', 'tos', 'conditions', 'legal', 'user agreement'], title: 'Terms of Use', icon: 'fa-file-contract', path: '/terms-of-use' },

    // --- Not Logged In Actions ---
    ...(!isLoggedIn ? [
      { keywords: ['login', 'signin', 'sign in', 'log in', 'access'], title: 'Sign In', icon: 'fa-sign-in-alt', path: '/signin' },
      { keywords: ['signup', 'register', 'create account', 'join'], title: 'Sign Up', icon: 'fa-user-plus', path: '/signup' },
    ] : []),

    // --- Role-Specific Actions (Admin) ---
    ...(effectiveRole === 'admin' ? [
      { keywords: ['dashboard', 'admin home'], title: 'Admin Dashboard', icon: 'fa-tachometer-alt', path: '/admin/home' },
      { keywords: ['analytics', 'stats', 'data', 'metrics', 'revenue'], title: 'Admin Analytics', icon: 'fa-chart-bar', path: '/admin/analytics' },
      { keywords: ['users', 'clients', 'management', 'accounts'], title: 'User Management', icon: 'fa-users-cog', path: '/admin/users' },
      { keywords: ['organizations', 'verification', 'verify'], title: 'Verify Organizations', icon: 'fa-shield-halved', path: '/admin/verify-organizations' },
      { keywords: ['queries', 'help', 'tickets', 'issues'], title: 'Admin Queries', icon: 'fa-question-circle', path: '/admin/queries' },
      { keywords: ['settings', 'config', 'system'], title: 'System Settings', icon: 'fa-cogs', path: '/admin/settings' },
    ] : []),

    // --- Role-Specific Actions (Organization) ---
    ...(effectiveRole === 'organization' ? [
      { keywords: ['dashboard', 'org home'], title: 'Organization Dashboard', icon: 'fa-tachometer-alt', path: '/organization/home' },
      { keywords: ['dietitians', 'verify', 'credentials'], title: 'Verify Dietitians', icon: 'fa-user-check', path: '/organization/verify-dietitian' },
      { keywords: ['employees', 'staff', 'management'], title: 'Employee Management', icon: 'fa-user-tie', path: '/organization/employee-management' },
      { keywords: ['monitoring', 'tracking', 'activity', 'overview'], title: 'Staff Overview', icon: 'fa-desktop', path: '/organization/employee-monitoring' },
      { keywords: ['blogs', 'content', 'moderation'], title: 'Blog Moderation', icon: 'fa-blog', path: '/organization/blog-moderation' },
    ] : []),

    // --- Role-Specific Actions (Employee) ---
    ...(effectiveRole === 'employee' ? [
      { keywords: ['dashboard', 'employee home'], title: 'Employee Dashboard', icon: 'fa-tachometer-alt', path: '/employee/home' },
      { keywords: ['dietitians', 'verify', 'credentials'], title: 'Verify Dietitians', icon: 'fa-user-check', path: '/employee/verify-dietitian' },
      { keywords: ['blogs', 'moderation', 'content'], title: 'Blog Moderation', icon: 'fa-shield-alt', path: '/employee/blog-moderation' },
      { keywords: ['support', 'help', 'assistance'], title: 'Employee Support', icon: 'fa-headset', path: '/employee/support' },
    ] : []),

    // --- Role-Specific Actions (Dietitian) ---
    ...(effectiveRole === 'dietitian' ? [
      { keywords: ['dashboard', 'dietitian home'], title: 'Dietitian Dashboard', icon: 'fa-tachometer-alt', path: '/dietitian/home' },
      { keywords: ['schedule', 'calendar', 'slots', 'timing'], title: 'My Schedule', icon: 'fa-calendar-check', path: '/dietitian/schedule' },
      { keywords: ['patients', 'clients', 'appointments'], title: 'My Clients', icon: 'fa-user-friends', path: '/dietitian/clients-profiles' },
      { keywords: ['meal plan', 'meals', 'diet', 'add plan'], title: 'Meal Plans', icon: 'fa-utensils', path: '/dietitian/add-plans' },
      { keywords: ['lab reports', 'medical reports', 'records'], title: 'Lab Reports', icon: 'fa-file-medical', path: '/dietitian/lab-reports' },
    ] : []),

    // --- Role-Specific Actions (Client/User) ---
    ...(effectiveRole === 'user' ? [
      { keywords: ['dashboard', 'user home'], title: 'Client Dashboard', icon: 'fa-tachometer-alt', path: '/user/home' },
      { keywords: ['dietitians', 'specialists', 'find', 'doctors'], title: 'Find Dietitians', icon: 'fa-user-md', path: '/user/dietitian-profiles' },
      { keywords: ['appointments', 'my bookings', 'consultations'], title: 'My Appointments', icon: 'fa-calendar-check', path: '/user/my-dietitians' },
      { keywords: ['schedule', 'calendar', 'time'], title: 'My Schedule', icon: 'fa-calendar-alt', path: '/user/schedule' },
      { keywords: ['meal plan', 'meals', 'diet'], title: 'My Meal Plans', icon: 'fa-utensils', path: '/user/get-plans' },
      { keywords: ['progress', 'goals', 'tracking', 'health'], title: 'My Health Progress', icon: 'fa-heartbeat', path: '/user/progress' },
      { keywords: ['pricing', 'subscription', 'plans'], title: 'Membership Pricing', icon: 'fa-credit-card', path: '/user/pricing' },
      { keywords: ['nutriagent', 'agent', 'ai', 'assistant'], title: 'NutriAgent AI', icon: 'fa-robot', path: '/user/nutriagent' },
    ] : []),

    // --- Universal Settings (Only for Logged-In Users) ---
    ...(isLoggedIn ? [
      { keywords: ['profile', 'account', 'view profile'], title: 'My Profile', icon: 'fa-user-circle', path: `/${effectiveRole}/profile` },
      { keywords: ['edit profile', 'update profile'], title: 'Edit Profile', icon: 'fa-user-edit', path: `/${effectiveRole}/edit-profile` },
      { keywords: ['password', 'security', 'change pass'], title: 'Security Settings', icon: 'fa-shield-alt', path: `/${effectiveRole}/change-pass` },
    ] : [])
  ];

  const matchedNavs = query.trim().length >= 2 
    ? staticNavigations.filter(nav => 
        nav.keywords.some(k => query.toLowerCase().includes(k)) || 
        nav.title.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const handleNavClick = (path) => {
    onClose();
    navigate(path);
  };

  const handleDietitianClick = (id) => {
    onClose();
    navigate(`/user/dietitian-profiles/${id}`);
  };

  const handleMealPlanClick = () => {
    onClose();
    const targetPath = effectiveRole === 'dietitian' ? '/dietitian/add-plans' : '/user/get-plans';
    navigate(targetPath);
  };

  const handleBlogClick = (id) => {
    onClose();
    const targetPath = effectiveRole ? `/${effectiveRole}/blog/${id}` : `/blog/${id}`;
    navigate(targetPath);
  };

  const hasNoResults = !isLoading && query.trim().length >= 2 && 
    results.dietitians.length === 0 && results.blogs.length === 0 && 
    results.users.length === 0 && results.mealplans.length === 0 && results.organizations.length === 0 && matchedNavs.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 pb-4 px-4 bg-black/40 backdrop-blur-xs transition-all duration-300">
      <div 
        ref={searchRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200"
      >
        {/* Search Input */}
        <div className="flex items-center p-4 border-b border-gray-100 relative">
          <i className="fas fa-search text-gray-400 text-xl ml-2 absolute left-6"></i>
          <input
            autoFocus
            type="text"
            className="w-full pl-12 pr-10 py-3 text-lg focus:outline-none bg-gray-50 rounded-xl"
            placeholder={isLoggedIn ? "Search for Dietitians, Blogs, features..." : "Search Articles, Help, Pages..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {isLoading && (
            <i className="fas fa-spinner fa-spin text-[#059669] text-xl absolute right-16"></i>
          )}
          <button 
            onClick={onClose}
            className="absolute right-6 text-gray-400 hover:text-red-500 transition-colors"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Search Results */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {hasNoResults && (
            <div className="text-center py-8 text-gray-500">
              <i className="fas fa-search-minus text-4xl mb-3 text-gray-300"></i>
              <p>No results found for "{query}"</p>
            </div>
          )}

          {query.trim().length < 2 && (
            <div className="text-center py-8 text-gray-400">
              <p>Type at least 2 characters to search</p>
            </div>
          )}

          {/* Quick Actions (Static Navigation) */}
          {matchedNavs.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase px-4 py-2">Quick Actions</h3>
              <ul>
                {matchedNavs.map((nav, index) => (
                  <li key={`nav-${index}`}>
                    <button 
                      onClick={() => handleNavClick(nav.path)}
                      className="w-full text-left flex items-center px-4 py-3 hover:bg-emerald-50 transition-colors rounded-lg group"
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mr-3 font-bold shadow-sm">
                        <i className={`fas ${nav.icon}`}></i>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 group-hover:text-emerald-700">{nav.title}</p>
                        <p className="text-sm text-gray-500">Go to {nav.title.toLowerCase()}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Users Section (Only visible to authenticated admin/dietitians) */}
          {isLoggedIn && (effectiveRole === 'admin' || effectiveRole === 'dietitian') && results.users.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase px-4 py-2">Clients</h3>
              <ul>
                {results.users.map((u) => (
                  <li key={u._id}>
                    <button className="w-full text-left flex items-center px-4 py-3 hover:bg-blue-50 transition-colors rounded-lg group">
                      {u.profileImage ? (
                        <img src={u.profileImage} alt={u.name} className="w-10 h-10 rounded-full object-cover mr-3 border border-gray-200" />
                      ) : (
                         <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 font-bold">
                           {u.name.charAt(0)}
                         </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-800 group-hover:text-blue-700">{u.name}</p>
                        <p className="text-sm text-gray-500">{u.location || 'No location'}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Organizations Section (Only visible to admin) */}
          {isLoggedIn && effectiveRole === 'admin' && results.organizations.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase px-4 py-2">Organizations / Clinics</h3>
              <ul>
                {results.organizations.map((org) => (
                  <li key={org._id}>
                    <button className="w-full text-left flex items-center px-4 py-3 hover:bg-purple-50 transition-colors rounded-lg group cursor-default">
                      <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-3 font-bold">
                        <i className="fas fa-building"></i>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 group-hover:text-purple-700">{org.organizationName}</p>
                        <p className="text-sm text-gray-500">{org.industry || 'Healthcare'} • {org.domain || 'Domain'}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Meal Plans Section (Only visible to client, dietitian, admin) */}
          {isLoggedIn && ['user', 'dietitian', 'admin'].includes(effectiveRole) && results.mealplans.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase px-4 py-2">Meal Plans</h3>
              <ul>
                {results.mealplans.map((m) => (
                  <li key={m._id}>
                    <button onClick={() => handleMealPlanClick(m._id)} className="w-full text-left flex items-center px-4 py-3 hover:bg-orange-50 transition-colors rounded-lg group">
                      <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mr-3 font-bold">
                        <i className="fas fa-utensils"></i>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 group-hover:text-orange-700">{m.planName}</p>
                        <p className="text-sm text-gray-500">{m.dietType} • {m.calories} kcal</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Dietitians Section (Only visible to user, admin, organization, employee) */}
          {isLoggedIn && ['user', 'admin', 'organization', 'employee'].includes(effectiveRole) && results.dietitians.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase px-4 py-2">Dietitians</h3>
              <ul>
                {results.dietitians.map((d) => (
                  <li key={d._id}>
                    <button 
                      onClick={() => handleDietitianClick(d._id)}
                      className="w-full text-left flex items-center px-4 py-3 hover:bg-green-50 transition-colors rounded-lg group"
                    >
                      {d.profileImage ? (
                        <img src={d.profileImage} alt={d.name} className="w-10 h-10 rounded-full object-cover mr-3 border border-gray-200" />
                      ) : (
                         <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-3 font-bold">
                           {d.name.charAt(0)}
                         </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-800 group-hover:text-green-700">{d.name}</p>
                        <p className="text-sm text-gray-500">{d.specializationDomain} • {d.location}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Blogs Section (Public and accessible to everyone) */}
          {results.blogs.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase px-4 py-2 top-0 bg-white">Articles & Guides</h3>
              <ul>
                {results.blogs.map((b) => (
                  <li key={b._id}>
                     <button 
                      onClick={() => handleBlogClick(b._id)}
                      className="w-full text-left block px-4 py-3 hover:bg-green-50 transition-colors rounded-lg group"
                    >
                      <p className="font-semibold text-gray-800 group-hover:text-green-700">{b.title}</p>
                      <p className="text-sm text-gray-500 line-clamp-1">
                        {(b.description || b.excerpt || 'Read more about this topic').replace(/<[^>]*>/g, '')}
                      </p>
                      <div className="flex text-xs text-green-600 mt-1 space-x-2">
                        <span><i className="fas fa-tag mr-1"></i>{b.category}</span>
                        <span><i className="fas fa-eye mr-1"></i>{b.views}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Unauthenticated Prompt: If user is searching while logged out, show CTA */}
          {!isLoggedIn && !isLoading && query.trim().length >= 2 && results.blogs.length === 0 && (
            <div className="text-center py-4 px-4 bg-emerald-50 rounded-xl m-2 border border-emerald-100">
              <p className="text-sm text-emerald-800 font-medium">Looking for dietitians, consultations, or meal plans?</p>
              <p className="text-xs text-gray-500 mt-1">Sign in with your account to access verified specialist booking and diet management.</p>
              <button 
                onClick={() => { onClose(); navigate('/signin'); }}
                className="mt-3 px-5 py-2 bg-[#28B463] text-white text-sm font-semibold rounded-full hover:bg-[#1E6F5C] transition-colors cursor-pointer"
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
