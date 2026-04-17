import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import NavHeader from '../Navbar/NavHeader';
import { useAuth } from '../../hooks/useAuth';
import axios from '../../axios';
import RoleModal from '../../pages/RoleModal';
import GlobalSearch from '../Search/GlobalSearch';

// Utility function to get the base role path (e.g., '/user', '/dietitian', or '/')
const getBasePath = (currentPath) => {
  if (currentPath.startsWith('/admin')) return '/admin';
  if (currentPath.startsWith('/organization')) return '/organization';
  if (currentPath.startsWith('/employee')) return '/employee';
  if (currentPath.startsWith('/dietitian')) return '/dietitian';
  if (currentPath.startsWith('/user')) return '/user';
  return ''; // Base path for non-logged-in users
};

// Font Awesome is imported globally in main.jsx via @fortawesome/fontawesome-free

// Floating Contact Button component (positioned top-right just below header)
// **MODIFIED to accept contactPath**
const FloatingContactButton = ({ handleScrollToTop, contactPath }) => (
  <Link
    // **USING dynamic contactPath**
    to={contactPath}
    onClick={handleScrollToTop}
    // positioned 180px below top of viewport; brighter green background, slightly darker on hover
    className="fixed hidden md:flex items-center right-4 top-21 bg-[#059669] text-white p-3 rounded-full shadow-lg hover:bg-[#047857] transition-all duration-300 transform hover:scale-105 z-50 group cursor-pointer"
    aria-label="Contact Us"
    title="Contact Us"
  >
    <i className="fas fa-headset text-2xl"></i>
    <span className="ml-3 text-lg font-semibold whitespace-nowrap hidden lg:inline-block">Contact Us</span>
  </Link>
);

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const handleScrollToTop = () => window.scrollTo(0, 0);

  // Get current role from path
  const getCurrentRoleFromPath = () => {
    if (currentPath.startsWith('/admin')) return 'admin';
    if (currentPath.startsWith('/organization')) return 'organization';
    if (currentPath.startsWith('/employee')) return 'employee';
    if (currentPath.startsWith('/dietitian')) return 'dietitian';
    if (currentPath.startsWith('/user')) return 'user';
    return null;
  };

  const currentRole = getCurrentRoleFromPath();
  const { token, isAuthenticated } = useAuth(currentRole);
  const [profileImage, setProfileImage] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Fetch profile data when authenticated
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!isAuthenticated || !token || !currentRole) {
        setProfileImage(null);
        return;
      }

      try {
        // Role-specific API endpoints for profile data
        const apiEndpoints = {
          user: '/api/getuserdetails',
          dietitian: '/api/getdietitiandetails',
          organization: '/api/getorganizationdetails',
          employee: '/api/getorganizationdetails',
          admin: '/api/getadmindetails'
        };

        const endpoint = apiEndpoints[currentRole];
        if (!endpoint) {
          return;
        }

        const response = await axios.get(endpoint, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.data.success && response.data.profileImage) {
          setProfileImage(response.data.profileImage);
        }
      } catch (error) {
        // Handle rate limiting
        if (error.response?.status === 429) {
          window.location.href = '/rate-limit';
          return;
        }
        console.error('Error fetching profile data:', error);
        // Fallback to localStorage if API fails
        const storedImage = localStorage.getItem(`profileImage_${currentRole}`);
        if (storedImage) {
          setProfileImage(storedImage);
        }
      }
    };

    fetchProfileData();
  }, [isAuthenticated, token, currentRole]);

  // Check if we're in a logged-in area first
  const isLoggedInArea =
    currentPath.startsWith('/user') ||
    currentPath.startsWith('/dietitian') ||
    currentPath.startsWith('/admin') ||
    currentPath.startsWith('/organization') ||
    currentPath.startsWith('/employee');

  // Check if user is on a profile page
  const isProfilePage =
    currentPath.endsWith('/profile') ||
    currentPath.includes('/profile/');

  // **NEW LOGIC: Determine the correct Contact Us path**
  const getContactPath = () => {
    const basePath = getBasePath(currentPath);
    // If a role-specific base path exists, append '/contact-us' to it.
    // Otherwise, use the general '/contact-us' path.
    return basePath ? `${basePath}/contact-us` : '/contact-us';
  };
  // **END getContactPath**

  // --- Multi-Role Profile Path Logic ---
  const getProfilePath = () => {
    if (currentPath.startsWith('/admin')) {
      return '/admin/profile';
    }
    if (currentPath.startsWith('/organization')) {
      return '/organization/profile';
    }
    if (currentPath.startsWith('/dietitian')) {
      return '/dietitian/profile';
    }
    if (currentPath.startsWith('/user')) {
      return '/user/profile';
    }
    return '/role';
  };
  // --- END getProfilePath ---

  // --- Logout Handler ---
  const handleLogout = () => {
    // ONLY clear the CURRENT role's session - do NOT clear all roles
    // This prevents logging out other users who are logged in with different roles
    if (currentRole) {
      localStorage.removeItem(`authToken_${currentRole}`);
      localStorage.removeItem(`authUser_${currentRole}`);
      localStorage.removeItem(`profileImage_${currentRole}`);
    }

    setProfileImage(null);
    navigate('/');
  };
  // --- END Logout Handler ---

  // --- Action Buttons Renderer ---
  const renderActionButtons = (isMobile = false) => {
    const contactPath = getContactPath(); // Get the correct contact path

    const contactUsClass = `bg-[#28B463] text-white ${isMobile ? 'w-28' : 'px-5'} py-2 rounded-full font-semibold hover:bg-[#1E6F5C] transition-all duration-300 cursor-pointer text-center`;
    const outlineButtonClass = `bg-transparent border border-[#28B463] text-[#28B463] ${isMobile ? 'w-28' : 'px-5'} py-2 rounded-full font-semibold hover:bg-[#28B463] hover:text-white transition-all duration-300 cursor-pointer text-center`;

    if (isLoggedInArea) {
      const iconButtonBaseClass = "relative flex items-center justify-center w-13 h-13 p-0 rounded-full transition-all duration-300 group";
      const tooltipTextClass = "absolute top-full mt-2 px-3 py-1 bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-10";

      // If in any role area, show Profile, Payment (for users), and Logout buttons
      return (

        <div className="flex space-x-3 items-center -mr-20">

          {/* Search Button for Logged-In Users */}
          <button 
            onClick={() => setShowSearch(true)}
            className="text-[#28B463] hover:text-[#1E6F5C] p-2 transition-colors duration-300 transform hover:scale-110"
            aria-label="Search"
          >
            <i className="fas fa-search text-2xl"></i>
          </button>

          <button
            onClick={() => navigate(getProfilePath())}
            className={`${iconButtonBaseClass} border border-[#28B463] text-[#28B463] hover:bg-[#28B463] hover:text-white overflow-visible`}
            aria-label="Profile"
          >
            {profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
                className="w-9 h-9 rounded-full object-cover"
                onError={() => {
                  setProfileImage(null);
                }}
              />
            ) : (
              <i className="fas fa-user-circle text-4xl"></i>
            )}
            <span className={tooltipTextClass}>Profile</span>
          </button>

          <button
            onClick={handleLogout}
            className={`${iconButtonBaseClass} bg-[#28B463] text-white hover:bg-[#1E6F5C]`}
            aria-label="Log Out"
          >
            <i className="fas fa-sign-out-alt text-3xl"></i>
            <span className={tooltipTextClass}>Log Out</span>
          </button>
        </div>

      );
    }

    // If not logged in (base path), show Log In and Contact Us buttons
    return (
      <div className="flex space-x-3 items-center -mr-20">
        <button 
          onClick={() => setShowSearch(true)}
          className="text-[#28B463] hover:text-[#1E6F5C] p-2 mr-2 transition-colors duration-300 transform hover:scale-110"
          aria-label="Search"
        >
          <i className="fas fa-search text-2xl"></i>
        </button>
        <button
          onClick={() => currentPath === '/' ? setShowRoleModal(true) : navigate('/role')}
          className={outlineButtonClass}
        >
          Log In
        </button>
        <Link
          // **UPDATED link to use dynamic contactPath**
          to={contactPath}
          onClick={handleScrollToTop}
          className={contactUsClass}
        >
          Contact Us
        </Link>
      </div>
    );
  };

  // Minimal header for employee routes — logo + profile + logout
  if (currentPath.startsWith('/employee')) {
    const iconButtonBaseClass = "relative flex items-center justify-center p-2 rounded-full transition-all duration-300 group";
    const tooltipTextClass = "absolute top-full mt-2 px-3 py-1 bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-10";
    return (
      <>
        <header className="bg-white shadow-sm py-2 sticky top-0 z-50 border-b-2 border-[#28B463]">
          <div className="flex items-center justify-between">
            {/* Logo with left padding */}
            <div className="pl-4 md:pl-8 lg:pl-16">
              <NavLink
                to="/employee/home"
                onClick={handleScrollToTop}
                className="flex items-center font-bold text-2xl md:text-3xl text-[#1E6F5C] select-none group cursor-pointer"
              >
                <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-[#28B463] rounded-full mr-2 md:mr-3 group-hover:bg-[#1E6F5C] group-hover:scale-110 transition-all duration-300">
                  <i className="fas fa-leaf text-xl text-white animate-pulse"></i>
                </div>
                <span className="font-poppins group-hover:text-[#28B463] transition-colors duration-300">
                  <span className="text-[#28B463] group-hover:text-[#1E6F5C]">N</span>utri
                  <span className="text-[#28B463] group-hover:text-[#1E6F5C]">C</span>onnect
                </span>
              </NavLink>
            </div>
            {/* Logout button with right padding */}
            <div className="pr-4 md:pr-8 lg:pr-16">
              <button
                onClick={handleLogout}
                className={`${iconButtonBaseClass} bg-[#28B463] text-white hover:bg-[#1E6F5C]`}
                aria-label="Log Out"
              >
                <i className="fas fa-sign-out-alt text-3xl"></i>
                <span className={tooltipTextClass}>Log Out</span>
              </button>
            </div>
          </div>
        </header>
        {/* Floating Contact Us button */}
        <FloatingContactButton handleScrollToTop={handleScrollToTop} contactPath="/employee/contact-us" />
      </>
    );
  }

  return (
    <>
      <header className={`${isProfilePage ? 'bg-[#E8F5E9]' : 'bg-white'} shadow-sm ${isLoggedInArea ? 'py-2' : 'py-3'} px-4 md:px-8 lg:px-16 sticky top-0 z-50 border-b-2 border-[#28B463]`}>

        <div className="max-w-7xl mx-auto  flex items-center justify-between">
          {/* Logo */}
          <NavLink
            to="/"
            onClick={handleScrollToTop}
            className="flex items-center font-bold text-2xl md:text-3xl text-[#1E6F5C] select-none group cursor-pointer"
          >
            <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-[#28B463] rounded-full mr-2 md:mr-3 group-hover:bg-[#1E6F5C] group-hover:scale-110 transition-all duration-300">
              <i className="fas fa-leaf text-xl text-white animate-pulse"></i>
            </div>
            <span className="font-poppins group-hover:text-[#28B463] transition-colors duration-300">
              <span className="text-[#28B463] group-hover:text-[#1E6F5C]">N</span>utri
              <span className="text-[#28B463] group-hover:text-[#1E6F5C]">C</span>onnect
            </span>
          </NavLink>

          {/* NavHeader handles navigation and mobile menu */}
          <NavHeader
            renderActionButtons={renderActionButtons}
            handleScrollToTop={handleScrollToTop}
          />
        </div>
      </header>

      {/* Show floating Contact Us button only for user and dietitian pages */}
      {(currentPath.startsWith('/user') || currentPath.startsWith('/dietitian') || currentPath.startsWith('/organization')) && (
        <FloatingContactButton
          handleScrollToTop={handleScrollToTop}
          // **PASSING the dynamic contact path to the FloatingContactButton**
          contactPath={getContactPath()}
        />
      )}

      {/* Role Selection Modal */}
      {showRoleModal && (
        <RoleModal isModal={true} onClose={() => setShowRoleModal(false)} />
      )}

      {/* Global Search Modal */}
      {showSearch && (
        <GlobalSearch onClose={() => setShowSearch(false)} currentRole={currentRole} />
      )}
    </>
  );
};

export default Header;