import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from 'axios';
import Sidebar from "../../components/Sidebar/Sidebar";
import Status from "../../middleware/StatusBadge";
import { useAuthContext } from "../../hooks/useAuthContext";

const getStatusBadge = (status) => {
  switch (status) {
    case 'Verified': return 'bg-green-100 text-green-800';
    case 'Rejected': return 'bg-red-100 text-red-800';
    default: return 'bg-yellow-100 text-yellow-800';
  }
};

const RecentDietitiansTable = ({ onViewAll }) => {
  const [dietitians, setDietitians] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/verify/dietitians', { withCredentials: true })
      .then(res => setDietitians(res.data.slice(0, 5)))
      .catch(err => console.error('Failed to fetch dietitians:', err))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-green-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Dietitian Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Verification Status</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {isLoading ? (
            <tr><td colSpan="2" className="px-6 py-4 text-center text-sm text-gray-500"><i className="fas fa-spinner fa-spin mr-2"></i>Loading...</td></tr>
          ) : dietitians.length === 0 ? (
            <tr><td colSpan="2" className="px-6 py-4 text-center text-sm text-gray-500">No dietitian verifications found.</td></tr>
          ) : (
            dietitians.map((d) => {
              const status = d.verificationStatus?.finalReport || 'Not Received';
              const displayStatus = status === 'Not Received' ? 'Pending' : status;
              return (
                <tr key={d._id} className="hover:bg-green-50 transition duration-150">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{d.name || 'Unknown'}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${getStatusBadge(status)}`}>
                      <i className={`fas fa-${status === 'Verified' ? 'check-circle' : status === 'Rejected' ? 'times-circle' : 'hourglass-half'} mr-1`}></i>
                      {displayStatus}
                    </span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
        <button
          onClick={onViewAll}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-full hover:bg-green-700 transition"
        >
          <i className="fas fa-arrow-right"></i> View All Verifications
        </button>
      </div>
    </div>
  );
};


const mockOrganization = {
  profileImage: "/images/dummy_user.png",
};

// --- Main Dashboard Component ---
const OrganizationDashboard = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuthContext();
  const [profileImage, setProfileImage] = useState(mockOrganization.profileImage);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user?.profileImage) {
      setProfileImage(user.profileImage);
    } else {
      setProfileImage(mockOrganization.profileImage);
    }
  }, [user?.profileImage]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('profileImage', file);

      let authToken = token;
      if (!authToken) {
        authToken = localStorage.getItem('authToken_organization');
      }

      if (!authToken) {
        alert('Session expired. Please login again.');
        navigate('/signin?role=organization');
        return;
      }

      const response = await axios.post('/api/uploadorganization', formData, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      const data = response.data;

      if (data.success) {
        const reader = new FileReader();
        reader.onload = () => {
          setProfileImage(reader.result);
        };
        reader.readAsDataURL(file);

        alert('Profile photo uploaded successfully!');
        if (user?.id) {
          window.location.reload();
        }
      } else {
        alert(`Upload failed: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Upload error: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveProfilePhoto = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) {
      return;
    }

    setIsUploading(true);
    try {
      let authToken = token;
      if (!authToken) {
        authToken = localStorage.getItem('authToken_organization');
      }

      if (!authToken) {
        alert('Session expired. Please login again.');
        navigate('/signin?role=organization');
        return;
      }

      const response = await axios.delete('/api/deleteorganization', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.data.success) {
        setProfileImage(mockOrganization.profileImage);
        setShowImageModal(false);
        alert('Profile photo removed successfully!');
        window.location.reload();
      } else {
        alert(`Removal failed: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Remove error:', error);
      alert(`Remove error: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 pt-20 md:pt-6 p-6 lg:p-2">
        <h1 className="text-3xl lg:text-4xl font-bold text-green-900 mb-6 border-b border-gray-200 pb-4">
          Welcome, {user?.org_name || user?.name || mockOrganization.org_name}!
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-green-600 flex flex-col items-center">
            <h3 className="text-xl font-bold text-teal-900 mb-5 text-center w-full">
              Organization Profile
            </h3>

            <div className="relative mb-4">
              <img
                src={profileImage}
                alt={`${user?.org_name || user?.name || mockOrganization.org_name} Logo`}
                className="w-32 h-32 rounded-full object-cover border-4 border-green-600 cursor-pointer hover:opacity-80 transition"
                onClick={() => setShowImageModal(true)}
                onError={() => setProfileImage(mockOrganization.profileImage)}
              />
              <label
                htmlFor="profileUpload"
                className="absolute bottom-0 right-0 bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center cursor-pointer shadow hover:bg-green-700 transition"
              >
                <i className="fas fa-camera text-sm"></i>
              </label>
              <input
                type="file"
                id="profileUpload"
                ref={fileInputRef}
                accept="image/jpeg, image/png"
                className="hidden"
                disabled={isUploading}
                onChange={handleImageUpload}
              />
            </div>

            <p className="text-xs text-gray-500 mb-4">Click camera to update photo</p>

            <p className="font-semibold text-lg text-gray-800">{user?.org_name || user?.name || mockOrganization.org_name}</p>
            <p className="text-sm text-gray-600">Email: {user?.email || mockOrganization.email}</p>
            <p className="text-sm text-gray-600">Phone: {user?.phone || mockOrganization.phone}</p>
            <p className="text-sm text-gray-600 mb-4">{user?.address || mockOrganization.address}</p>

            <div className="flex gap-2 flex-wrap justify-center mt-auto">
              <button
                onClick={() => navigate("/organization/edit-profile")}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-green-600 text-green-600 rounded-full text-sm font-medium hover:bg-green-600 hover:text-white transition"
              >
                <i className="fas fa-user-edit"></i> Edit Profile
              </button>
              <button
                onClick={() => navigate("/organization/change-pass")}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-400 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-100 transition"
              >
                <i className="fas fa-lock"></i> Change Password
              </button>
            </div>

            <span className="mt-4 bg-green-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
              Active
            </span>
          </div>

          <Status role="organization" />

          <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-blue-600 h-full">
            <h3 className="text-xl font-bold text-teal-900 mb-5 text-center">
              Quick Actions
            </h3>

            <div className="space-y-3">
              <button
                onClick={() => navigate("/organization/doc-status")}
                className="w-full bg-blue-600 text-white font-semibold py-3 rounded-full hover:bg-blue-700 transition shadow flex items-center justify-center gap-2"
              >
                <i className="fas fa-shield-check"></i> View My Verification Status
              </button>

              <button
                onClick={() => navigate("/organization/verify-dietitian")}
                className="w-full bg-amber-500 text-white font-semibold py-3 rounded-full hover:bg-amber-600 transition shadow flex items-center justify-center gap-2"
              >
                <i className="fas fa-file-signature"></i> Verify Dietitian
              </button>

              <button
                onClick={handleLogout}
                className="w-full bg-red-600 text-white font-semibold py-3 rounded-full hover:bg-red-700 transition shadow flex items-center justify-center gap-2 mt-4"
              >
                <i className="fas fa-sign-out-alt"></i> Log Out
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6 border-t-4 border-amber-500">
          <h3 className="text-xl font-bold text-teal-900 mb-5 text-center">
            Recent Dietitian Verifications
          </h3>
          <RecentDietitiansTable onViewAll={() => { navigate('/organization/verify-dietitian'); window.scrollTo(0, 0); }} />
        </div>

        {showImageModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
            onClick={() => setShowImageModal(false)}
          >
            <div
              className="bg-white rounded-2xl max-w-2xl w-full relative overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowImageModal(false)}
                className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg z-10 transition"
                aria-label="Close modal"
              >
                <i className="fas fa-times text-lg"></i>
              </button>

              <div className="flex items-center justify-center bg-gray-100 p-8 h-96">
                <img
                  src={profileImage}
                  alt="Organization Logo Full Size"
                  className="w-full h-full rounded-lg object-contain"
                  onError={() => setProfileImage(mockOrganization.profileImage)}
                />
              </div>

              <div className="bg-white p-6 border-t border-gray-200">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{user?.org_name || mockOrganization.org_name}</h2>
                <p className="text-gray-600 mb-4">{user?.email || mockOrganization.email}</p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setShowImageModal(false);
                      fileInputRef.current?.click();
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full font-medium hover:bg-green-700 transition"
                  >
                    <i className="fas fa-camera"></i> Change Logo
                  </button>
                  <button                    onClick={handleRemoveProfilePhoto}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-full font-medium hover:bg-red-700 transition"
                  >
                    <i className="fas fa-trash"></i> Remove Photo
                  </button>
                  <button                    onClick={() => setShowImageModal(false)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-400 text-gray-700 rounded-full font-medium hover:bg-gray-100 transition"
                  >
                    <i className="fas fa-times"></i> Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizationDashboard;