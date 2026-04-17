import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const GlobalSearch = ({ onClose, currentRole }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ dietitians: [], blogs: [], users: [], mealplans: [], organizations: [] });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef(null);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    // Close on outside click
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
      try {
        const response = await axios.get(`http://localhost:5000/api/search?q=${query}&limit=3`);
        if (response.data.success) {
          setResults({
            dietitians: response.data.results.dietitians || [],
            blogs: response.data.results.blogs || [],
            users: response.data.results.users || [],
            mealplans: response.data.results.mealplans || [],
            organizations: response.data.results.organizations || []
          });
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchResults, 300); // debounce
    return () => clearTimeout(timer);
  }, [query]);

  // Static navigation shortcuts
  const staticNavigations = [
    // --- General Action ---
    { keywords: ['dashboard', 'home', 'main'], title: 'Dashboard', icon: 'fa-home', path: `/${currentRole || 'user'}/home` },
    
    // --- Role-Specific Actions (Admin) ---
    ...(currentRole === 'admin' ? [
      { keywords: ['analytics', 'stats', 'data', 'metrics'], title: 'Admin Analytics', icon: 'fa-chart-bar', path: '/admin/analytics' },
      { keywords: ['users', 'clients', 'management', 'accounts'], title: 'User Management', icon: 'fa-users-cog', path: '/admin/users' },
      { keywords: ['dietitians', 'experts', 'verification'], title: 'Dietitian Verification', icon: 'fa-user-md', path: '/admin/dietitians' },
      { keywords: ['settings', 'config', 'system'], title: 'System Settings', icon: 'fa-cogs', path: '/admin/settings' },
    ] : []),

    // --- Role-Specific Actions (Organization) ---
    ...(currentRole === 'organization' ? [
      { keywords: ['analytics', 'stats', 'performance'], title: 'Org Analytics', icon: 'fa-chart-pie', path: '/organization/analytics' },
      { keywords: ['employees', 'staff', 'management'], title: 'Employee Management', icon: 'fa-user-tie', path: '/organization/employees' },
      { keywords: ['monitoring', 'tracking', 'activity'], title: 'Employee Monitoring', icon: 'fa-desktop', path: '/organization/employee-monitoring' },
      { keywords: ['blogs', 'content', 'management'], title: 'Organization Blogs', icon: 'fa-blog', path: '/organization/blogs' },
    ] : []),

    // --- Role-Specific Actions (Employee) ---
    ...(currentRole === 'employee' ? [
      { keywords: ['tasks', 'work', 'board'], title: 'Team Board', icon: 'fa-clipboard-list', path: '/employee/team-board' },
      { keywords: ['chat', 'messages', 'communication'], title: 'Employee Chat', icon: 'fa-comments', path: '/employee/chat' },
      { keywords: ['monitoring', 'status'], title: 'Monitoring Access', icon: 'fa-eye', path: '/employee/monitoring' },
    ] : []),

    // --- Role-Specific Actions (Dietitian) ---
    ...(currentRole === 'dietitian' ? [
      { keywords: ['schedule', 'appointments', 'book', 'calendar'], title: 'Patient Appointments', icon: 'fa-calendar-check', path: '/dietitian/schedule' },
      { keywords: ['patients', 'clients', 'list'], title: 'My Patients', icon: 'fa-user-friends', path: '/dietitian/clients-profiles' },
      { keywords: ['meal plan', 'meals', 'diet'], title: 'Meal Plan Creator', icon: 'fa-utensils', path: '/dietitian/add-plans' },
    ] : []),

    // --- General Actions (Client/User) ---
    ...(currentRole === 'user' || !currentRole ? [
      { keywords: ['schedule', 'appointments', 'book'], title: 'Book Appointment', icon: 'fa-calendar-plus', path: '/user/schedule' },
      { keywords: ['meal plan', 'meals', 'diet'], title: 'Get Meal Plans', icon: 'fa-utensils', path: '/user/get-plans' },
      { keywords: ['progress', 'goals', 'tracking'], title: 'My Health Progress', icon: 'fa-heartbeat', path: '/user/progress' },
      { keywords: ['reports', 'lab', 'health'], title: 'My Lab Reports', icon: 'fa-file-invoice', path: '/user/progress' },
    ] : []),

    // --- Universal Settings ---
    { keywords: ['profile', 'update', 'edit'], title: 'Edit Profile', icon: 'fa-user-edit', path: `/${currentRole || 'user'}/edit-profile` },
    { keywords: ['password', 'security', 'key'], title: 'Security Settings', icon: 'fa-shield-alt', path: `/${currentRole || 'user'}/change-pass` },
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
    // Navigate to dietitian profile depending on current role context
    const basePath = currentRole ? `/${currentRole}` : '/user';
    navigate(`${basePath}/dietitian-profiles/${id}`);
  };

  const handleMealPlanClick = () => {
    onClose();
    const basePath = currentRole ? `/${currentRole}` : '/user';
    navigate(`${basePath}/get-plans`); // Navigate to plans page
  };

  const handleBlogClick = (id) => {
    onClose();
    const basePath = currentRole ? `/${currentRole}` : '/user';
    navigate(`${basePath}/blog/${id}`);
  };

  const hasNoResults = !isLoading && query.trim().length >= 2 && 
    results.dietitians.length === 0 && results.blogs.length === 0 && 
    results.users.length === 0 && results.mealplans.length === 0 && results.organizations.length === 0 && matchedNavs.length === 0;

  return (
    <div className="fixed inset-0 z-100 flex items-start justify-center pt-24 pb-4 px-4 bg-transparent transition-all duration-300">
      <div 
        ref={searchRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-down border border-gray-200"
      >
        {/* Search Input */}
        <div className="flex items-center p-4 border-b border-gray-100 relative">
          <i className="fas fa-search text-gray-400 text-xl ml-2 absolute left-6"></i>
          <input
            autoFocus
            type="text"
            className="w-full pl-12 pr-10 py-3 text-lg focus:outline-none bg-gray-50 rounded-xl"
            placeholder="Search for Dietitians, Blogs, topics..."
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

          {/* Users Section (Only visible to admin/employees/orgs/dietitians) */}
          {(currentRole === 'admin' || currentRole === 'employee' || currentRole === 'organization' || currentRole === 'dietitian') && results.users.length > 0 && (
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

          {/* Organizations Section */}
          {results.organizations.length > 0 && (
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

          {/* Meal Plans Section */}
          {results.mealplans.length > 0 && (
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

          {/* Dietitians Section - Only visible if not a dietitian themselves */}
          {currentRole !== 'dietitian' && results.dietitians.length > 0 && (
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

          {/* Blogs Section */}
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
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
