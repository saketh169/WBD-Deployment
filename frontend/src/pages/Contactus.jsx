import React, { useState, useEffect } from 'react';
import { submitContactForm } from '../services/misc/miscService';
import { useLocation } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { useAuthContext } from '../hooks/useAuthContext';

const ContactPage = () => {
  const [submittedData, setSubmittedData] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, role, isAuthenticated } = useAuthContext();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    query: '',
  });
  const [errors, setErrors] = useState({});

  // Autofill form fields if user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      setFormData((prev) => {
        const isEmployeePath = window.location.pathname.startsWith('/employee');
        const roleMap = {
          user: 'User',
          dietitian: 'Dietitian',
          employee: 'Employee',
          organization: isEmployeePath ? 'Employee' : 'Certifying Organization',
        };

        return {
          ...prev,
          name: user.name || prev.name,
          email: user.email || prev.email,
          role: role ? (roleMap[role] || prev.role) : prev.role,
        };
      });
    }
  }, [isAuthenticated, user, role]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full Name is required.';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Name must be at least 3 characters.';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email Address is required.';
    } else if (
      !/^[a-zA-Z][a-zA-Z0-9._]{2,}@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email.trim())
    ) {
      newErrors.email = 'Invalid email address.';
    }

    if (!formData.role) {
      newErrors.role = 'Please select your role.';
    }

    if (!formData.query.trim()) {
      newErrors.query = 'A message is required.';
    } else if (formData.query.trim().length < 10) {
      newErrors.query = 'Message must be at least 10 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitError(null);
    setIsSubmitting(true);

    const res = await submitContactForm(formData);

    if (!res.isError && res.success) {
      setSubmittedData({ ...formData });
      setFormData({
        name: '',
        email: '',
        role: '',
        query: '',
      });
      setErrors({});
      setTimeout(() => {
        const submittedSection = document.getElementById('submitted-message');
        if (submittedSection) {
          submittedSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    } else {
      setSubmitError(res.message || 'Failed to submit query');
    }

    setIsSubmitting(false);
  };

  const getInputClasses = (fieldName) =>
    `w-full p-3 rounded-lg border transition-all ${
      errors[fieldName]
        ? 'border-red-500 focus:ring-red-500'
        : 'border-gray-300 focus:ring-2 focus:ring-[#28B463] focus:border-transparent'
    }`;

  const errorClasses = 'text-red-500 text-sm mt-1';

  return (
    <main className="flex-1 py-5 px-4 md:px-8 bg-gray-50">
      <div className="max-w-6xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-[#1E6F5C] mb-4">Get In Touch</h1>
        <p className="text-lg text-gray-700 max-w-2xl mx-auto mb-12">
          We'd love to hear from you. Send us a message, and we'll get back to
          you as soon as possible.
        </p>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-12 items-start">
        {/* Contact Form */}
        <div className="bg-white p-8 rounded-2xl shadow-lg border-t-4 border-[#28B463]">
          <h2 className="text-2xl font-bold text-[#2C3E50] mb-6 text-center">
            Send Us a Message
          </h2>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Full Name"
                className={getInputClasses('name')}
              />
              {errors.name && <p className={errorClasses}>{errors.name}</p>}
            </div>

            <div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email Address"
                className={getInputClasses('email')}
              />
              {errors.email && <p className={errorClasses}>{errors.email}</p>}
            </div>

            <div>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className={`${getInputClasses('role')} ${
                  errors.role || !formData.role ? 'text-gray-500' : 'text-gray-900'
                }`}
              >
                <option value="" disabled>
                  Select Your Role
                </option>
                <option value="User">User</option>
                <option value="Dietitian">Dietitian</option>
                <option value="Employee">Employee</option>
                <option value="Certifying Organization">
                  Certifying Organization
                </option>
              </select>
              {errors.role && <p className={errorClasses}>{errors.role}</p>}
            </div>

            <div>
              <textarea
                name="query"
                value={formData.query}
                onChange={handleChange}
                placeholder="Your Message"
                rows="5"
                className={getInputClasses('query')}
              ></textarea>
              {errors.query && <p className={errorClasses}>{errors.query}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#28B463] text-white py-3 rounded-full font-semibold hover:bg-[#1E6F5C] transition-all duration-300 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>

          {/* Error Message */}
          {submitError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <i className="fas fa-exclamation-triangle text-red-500 mr-2"></i>
                <p className="text-red-700 font-medium">Error</p>
              </div>
              <p className="text-red-600 mt-1">{submitError}</p>
            </div>
          )}
        </div>

        {/* Contact Details Box */}
        <div className="bg-white p-8 rounded-2xl shadow-lg border-t-4 border-[#28B463] flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#2C3E50] mb-6 text-center">
              Contact Information
            </h2>
            <p className="text-gray-700 text-center mb-8">
              Feel free to reach out to us directly via our contact details
              below.
            </p>
            <div className="space-y-4 text-left text-gray-700">
              <div className="flex items-center">
                <i className="fas fa-envelope mr-3 text-[#28B463] text-2xl"></i>
                <span className="text-lg">nutriconnect6@gmail.com</span>
              </div>
              <div className="flex items-center">
                <i className="fas fa-phone mr-3 text-[#28B463] text-2xl"></i>
                <span className="text-lg">+91 70757 83143</span>
              </div>
              <div className="flex items-center">
                <i className="fas fa-map-marker-alt mr-3 text-[#28B463] text-2xl"></i>
                <span className="text-lg">
                  IIIT SriCity, Chittor, 517346
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <h3 className="text-lg font-semibold text-[#1E6F5C] mb-4">
              Follow Us
            </h3>
            <div className="flex justify-center gap-4">
              <a
                target="_blank"
                rel="noreferrer"
                href="https://www.facebook.com/profile.php?id=61572485733709"
                className="w-12 h-12 flex items-center justify-center text-[#28B463] bg-white rounded-full hover:bg-[#28B463] hover:text-white border border-[#28B463] hover:border-transparent transition-all duration-300"
              >
                <i className="fab fa-facebook-f text-xl"></i>
              </a>
              <a
                target="_blank"
                rel="noreferrer"
                href="https://www.instagram.com/nutriconnect2025"
                className="w-12 h-12 flex items-center justify-center text-[#28B463] bg-white rounded-full hover:bg-[#28B463] hover:text-white border border-[#28B463] hover:border-transparent transition-all duration-300"
              >
                <i className="fab fa-instagram text-xl"></i>
              </a>
              <a
                target="_blank"
                rel="noreferrer"
                href="https://x.com/NutriC21?t=ngy3BuReV6VcrXl3WXrCvg&s=09"
                className="w-12 h-12 flex items-center justify-center text-[#28B463] bg-white rounded-full hover:bg-[#28B463] hover:text-white border border-[#28B463] hover:border-transparent transition-all duration-300"
              >
                <i className="fab fa-twitter text-xl"></i>
              </a>
              <a
                target="_blank"
                rel="noreferrer"
                href="https://www.linkedin.com/in/nutri-connect-a0b77434"
                className="w-12 h-12 flex items-center justify-center text-[#28B463] bg-white rounded-full hover:bg-[#28B463] hover:text-white border border-[#28B463] hover:border-transparent transition-all duration-300"
              >
                <i className="fab fa-linkedin-in text-xl"></i>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Submitted Message Box - Full Width */}
      {submittedData && (
        <div id="submitted-message" className="max-w-6xl mx-auto mt-12 bg-white p-8 rounded-2xl shadow-lg border-t-4 border-[#28B463]">
          <h2 className="text-2xl font-bold text-[#2C3E50] mb-6 text-center">
            Your Message Has Been Sent!
          </h2>
          <div className="space-y-4 text-left text-gray-700">
            <p className="border-b border-gray-200 pb-2">
              <span className="font-semibold text-[#1E6F5C]">Name:</span>{' '}
              {submittedData.name}
            </p>
            <p className="border-b border-gray-200 pb-2">
              <span className="font-semibold text-[#1E6F5C]">Email:</span>{' '}
              {submittedData.email}
            </p>
            <p className="border-b border-gray-200 pb-2">
              <span className="font-semibold text-[#1E6F5C]">Role:</span>{' '}
              {submittedData.role}
            </p>
            <p>
              <span className="font-semibold text-[#1E6F5C]">Message:</span>{' '}
              {submittedData.query}
            </p>
          </div>
          <p className="mt-6 text-center text-gray-600">We appreciate you reaching out and will respond soon!</p>
        </div>
      )}

      {/* Map Section */}
      <div className="max-w-6xl mx-auto mt-16 rounded-2xl overflow-hidden shadow-lg border-4 border-[#28B463] text-center">
        <h2 className="text-4xl font-bold text-[#1E6F5C] pt-8 mb-4">
          Our Location
        </h2>
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3878.674466059435!2d80.0240734745556!3d13.55555050180794!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a4d773f1e0f8721%3A0xadb0842ffc2719e4!2sIndian%20Institute%20of%20Information%20Technology%2C%20Sri%20City%2C%20Chittoor!5e0!3m2!1sen!2sin!4v1760941438387!5m2!1sen!2sin"
          width="100%"
          height="450"
          allowFullScreen=""
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="rounded-b-2xl"
          title="Office Location"
        ></iframe>
      </div>
    </main>
  );
};

// Wrap the component with AuthProvider
const ContactPageWithAuth = () => {
  const location = useLocation();

  const getCurrentRole = () => {
    const path = location.pathname;
    if (path.startsWith('/admin')) return 'admin';
    if (path.startsWith('/organization')) return 'organization';
    if (path.startsWith('/dietitian')) return 'dietitian';
    if (path.startsWith('/employee')) return 'employee';
    if (path.startsWith('/user')) return 'user';
    return null;
  };

  const currentRole = getCurrentRole();

  return (
    <AuthProvider currentRole={currentRole}>
      <ContactPage />
    </AuthProvider>
  );
};

export default ContactPageWithAuth;