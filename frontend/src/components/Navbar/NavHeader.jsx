import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const NavHeader = ({ renderActionButtons, handleScrollToTop }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const currentPath = location.pathname;

  // --- Base (Public/Logged Out) Links ---
  const baseNavLinks = [
    { name: 'Home', href: '/' },
    { name: 'About Us', href: '/about-us' },
    { name: 'Guide', href: '/guide' },
    { name: 'Blog', href: '/blog' },
    { name: 'Terms of Use', href: '/terms-of-use' },
    { name: 'Privacy Policy', href: '/privacy-policy' },
  ];

  // --- Role-Specific Links ---

  const userNavLinks = [
    { name: 'Home', href: '/user/home' },
    { name: 'Dietitians', href: '/user/dietitian-profiles' },
    { name: 'Appointments', href: '/user/my-dietitians' },
    { name: 'Schedule', href: '/user/schedule' },
    { name: 'Pricing', href: '/user/pricing' },

    { name: 'Blog', href: '/user/blog' },
    { name: 'NutriAgent', href: '/user/nutriagent', isAgent: true },

  ];

  const dietitianNavLinks = [
    { name: 'Home', href: '/dietitian/home' },
    { name: 'My Clients', href: '/dietitian/clients-profiles' },
    { name: 'Schedule', href: '/dietitian/schedule' },
    { name: 'MealPlans', href: '/dietitian/add-plans' },
    { name: 'Blog', href: '/dietitian/blog' },

  ];



  const organizationNavLinks = [
    { name: 'Home', href: '/organization/home' },
    { name: 'Blogs', href: '/organization/blogs' },
    { name: 'Manage Employees', href: '/organization/employee-management' },
    { name: 'Staff Overview', href: '/organization/employee-monitoring' },
  ];

  const employeeNavLinks = [
    { name: 'Home', href: '/employee/home' },
    { name: 'Verify Dietitians', href: '/employee/verify-dietitian' },
    { name: 'Blog Moderation', href: '/employee/blog-moderation' },
    { name: 'Blogs', href: '/employee/blogs' },
  ];

  const adminNavLinks = [
    { name: 'Home', href: '/admin/home' },
    { name: 'Analytics', href: '/admin/analytics' },
    { name: 'Users', href: '/admin/users' },
    { name: 'Queries', href: '/admin/queries' },
    { name: 'Settings', href: '/admin/settings' },

  ];


  // --- Function to Select Links based on Path ---
  const getNavLinks = () => {
    // If on dashboard routes, return empty array (no nav links needed)
    if (currentPath.startsWith('/admin/profile') ||
      currentPath.startsWith('/organization/profile') ||
      currentPath.startsWith('/dietitian/profile') ||
      currentPath.startsWith('/user/profile')) {
      return [];  // No nav links on dashboards
    }

    if (currentPath.startsWith('/employee')) return employeeNavLinks;
    if (currentPath.startsWith('/admin')) return adminNavLinks;
    if (currentPath.startsWith('/organization')) return organizationNavLinks;
    if (currentPath.startsWith('/dietitian')) return dietitianNavLinks;
    if (currentPath.startsWith('/user')) return userNavLinks;
    return baseNavLinks;
  };

  const navLinks = getNavLinks();

  return (
    <>
      {/* Desktop: Nav Links */}
      <div className="hidden md:flex items-center flex-1 justify-end">
        <ul className="flex items-center space-x-6 lg:space-x-8">
          {navLinks.map((link) => (
            <li key={link.name}>
              {link.isAgent ? (
                <NavLink
                  to={link.href}
                  end
                  onClick={handleScrollToTop}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-2 rounded-xl text-sm lg:text-base font-bold transition-all duration-300 shadow-xs ${
                      isActive
                        ? 'bg-emerald-700 text-white ring-2 ring-emerald-400 ring-offset-2 shadow-md scale-105'
                        : 'bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white hover:scale-105 hover:shadow-md'
                    }`
                  }
                >
                  <i className="fas fa-robot text-base text-white" />
                  <span>{link.name}</span>
                </NavLink>
              ) : (
                <NavLink
                  to={link.href}
                  end
                  onClick={handleScrollToTop}
                  className={({ isActive }) =>
                    `font-poppins text-base lg:text-lg font-medium text-[#2C3E50] transition-colors duration-300 hover:text-[#28B463] hover:underline hover:underline-offset-4 ${
                      isActive ? 'text-[#1E6F5C] underline underline-offset-4' : ''
                    }`
                  }
                >
                  {link.name}
                </NavLink>
              )}
            </li>
          ))}
        </ul>

        {/* Action Buttons (Desktop) */}
        {/* Adjusted the ml value to fix the overlap issue previously caused by mr-[-100px] */}
        {/* We now only render action buttons if the current links aren't already providing Profile/Logout */}
        {!navLinks.some(link => link.name === 'Logout') && (
          <div className="flex items-center space-x-3 ml-12">
            {renderActionButtons()}
          </div>
        )}
      </div>

      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="md:hidden text-[#2C3E50] focus:outline-none p-2"
        aria-label="Toggle menu"
      >
        <i className="fas fa-bars text-2xl"></i>
      </button>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white shadow-lg py-6 border-t border-gray-200 z-10">
          <ul className="flex flex-col items-center space-y-5 mb-6">
            {navLinks.map((link) => (
              <li key={link.name}>
                {link.isAgent ? (
                  <NavLink
                    to={link.href}
                    end
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleScrollToTop();
                    }}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-white shadow-md ${
                        isActive
                          ? 'bg-emerald-700 ring-2 ring-emerald-400 ring-offset-2'
                          : 'bg-linear-to-r from-emerald-600 to-teal-600'
                      }`
                    }
                  >
                    <i className="fas fa-robot text-base text-white" />
                    <span>{link.name}</span>
                  </NavLink>
                ) : (
                  <NavLink
                    to={link.href}
                    end
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleScrollToTop();
                    }}
                    className={({ isActive }) =>
                      `font-poppins text-lg font-medium text-[#2C3E50] transition-colors duration-300 hover:text-[#28B463] ${isActive ? 'text-[#1E6F5C]' : ''
                      }`
                    }
                  >
                    {link.name}
                  </NavLink>
                )}
              </li>
            ))}
          </ul>

          <div className="flex flex-row items-center justify-center space-x-3 px-8">
            {/* Render action buttons for mobile if not already included in role nav (i.e., not Admin/Org/Corp) */}
            {!navLinks.some(link => link.name === 'Logout') && (
              renderActionButtons(true)
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default NavHeader;
