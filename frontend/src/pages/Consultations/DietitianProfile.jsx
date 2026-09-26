import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { FaPlus } from "react-icons/fa";
import { getDietitianProfileDetails, addTestimonial } from "../../services/dietitian/dietitianService";
import BookingSidebar from "./BookingSidebar";
import PaymentModal from "./PaymentModal";
import { Notification } from "../AllDietitiansPage";

const renderStarRating = (rating) => {
  const stars = [];
  for (let i = 0; i < 5; i++) {
    if (rating >= i + 1) {
      stars.push(<i key={i} className="fas fa-star text-lg text-emerald-600" />);
    } else if (rating > i) {
      stars.push(<i key={i} className="fas fa-star-half text-lg text-emerald-600" />);
    } else {
      stars.push(<i key={i} className="far fa-star text-lg text-gray-300" />);
    }
  }
  return stars;
};

const TestimonialModal = ({ isOpen, onClose, onSubmit }) => {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onSubmit({ text: text.trim(), rating });
      setText('');
      setRating(5);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 rounded-lg overflow-hidden bg-white shadow-xl">
        <div className="px-6 py-4 bg-emerald-600">
          <h3 className="text-lg font-bold text-white">Add Your Review</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2 text-teal-900">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="text-2xl focus:outline-none cursor-pointer"
                  style={{ color: star <= rating ? '#10B981' : '#E0E0E0' }}
                >
                  <i className={star <= rating ? 'fas fa-star' : 'far fa-star'} />
                </button>
              ))}
            </div>
          </div>
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2 text-teal-900">Your Review</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share your experience with this dietitian..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-25 text-gray-700"
              required
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 rounded-lg font-semibold border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 rounded-lg font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              Submit Review
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function DietitianProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [dietitian, setDietitian] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [testimonials, setTestimonials] = useState([]);
  const [consultationCount, setConsultationCount] = useState(0);
  const [isBookingSidebarOpen, setIsBookingSidebarOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });
  const [loading, setLoading] = useState(true);
  const [canReview, setCanReview] = useState({ allowed: false, reason: "" });

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "" });
    }, 5000);
  };

  const hideNotification = () => setNotification({ show: false, message: "", type: "" });

  useEffect(() => {
    const loadDietitian = async () => {
      try {
        setLoading(true);
        const dietitianFromState = location.state?.dietitian;
        const dietitianId = id || dietitianFromState?._id;
        if (!dietitianId) throw new Error("No dietitian ID provided");

        const response = await getDietitianProfileDetails(dietitianId);
        if (response && !response.isError && response.data?.profile) {
          const { profile, stats, canReview: isReviewAllowed } = response.data;
          setDietitian(profile);
          setTestimonials(profile.testimonials || []);
          setConsultationCount(stats?.completedConsultations || 0);
          setCanReview({
            allowed: !!isReviewAllowed,
            reason: isReviewAllowed ? "" : "Reviews are available after completing a consultation"
          });
          if (location.state?.openBooking) setIsBookingSidebarOpen(true);
        } else {
          throw new Error(response?.message || "Failed to load dietitian");
        }
      } catch (error) {
        console.error("Error loading dietitian:", error);
        showNotification("Failed to load dietitian profile. Please check if the backend is running.", "error");
        setDietitian(null);
        setTestimonials([]);
      } finally {
        setLoading(false);
      }
    };
    loadDietitian();
  }, [id, location.state]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleBackClick = () => {
    const storedScrollPosition = sessionStorage.getItem("dietitianListScrollPosition");
    if (storedScrollPosition) {
      sessionStorage.removeItem("dietitianListScrollPosition");
      navigate(-1);
      setTimeout(() => window.scrollTo(0, parseInt(storedScrollPosition, 10)), 100);
    } else {
      navigate(-1);
    }
  };

  const handleSubmitTestimonial = async ({ text, rating }) => {
    try {
      const token = localStorage.getItem("authToken_user");
      if (!token) {
        showNotification("Please log in to add a review", "error");
        return;
      }
      const response = await addTestimonial(dietitian._id, { text, rating });
      if (response && !response.isError && response.success) {
        const newTestimonial = { ...response.testimonial, id: response.testimonial?._id || `t_${Date.now()}` };
        setTestimonials((prev) => [newTestimonial, ...prev]);
        if (response.newRating) setDietitian((prev) => ({ ...prev, rating: response.newRating }));
        showNotification("Review submitted successfully!", "success");
      } else {
        showNotification(response?.message || "Failed to submit review", "error");
      }
    } catch (error) {
      console.error("Error submitting testimonial:", error);
      showNotification(error.response?.data?.message || "Failed to submit review", "error");
    }
  };

  const handleProceedToPayment = (details) => {
    setBookingData(details);
    setNotification({ show: false, message: "", type: "" });
    setIsPaymentModalOpen(true);
    setIsBookingSidebarOpen(false);
  };

  const handlePaymentSubmit = async (paymentData) => {
    try {
      if (!paymentData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paymentData.email)) {
        showNotification("Please enter a valid email address", "error");
        return;
      }
      setIsPaymentModalOpen(false);
      showNotification("Consultation booked successfully!\nConfirmation email sent to " + paymentData.email, "success");
      setTimeout(() => setBookingData(null), 1500);
    } catch (error) {
      console.error("Booking error:", error);
      showNotification("Booking error: " + error.message, "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl text-secondary-text">Loading profile...</p>
      </div>
    );
  }

  if (!dietitian) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl text-secondary-text">Error loading profile</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white border-gray-200">
        <div className="w-9/10 mx-auto px-6 py-4">
          <div className="mb-6">
            <button
              onClick={handleBackClick}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              <i className="fas fa-chevron-left mr-2" />
              Back
            </button>
          </div>

          {/* Profile Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="shrink-0">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(dietitian.name || 'Dietitian')}&background=28B463&color=fff&size=128`}
                alt={dietitian.name}
                className="w-32 h-32 rounded-full object-cover border-4 border-emerald-600"
              />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2 text-teal-900">{dietitian.name}</h1>
              <div className="flex flex-wrap items-center gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">{renderStarRating(dietitian.rating || 4.5)}</div>
                  <span className="font-semibold text-emerald-600">{dietitian.rating || 4.5}</span>
                  <span className="text-gray-600">({testimonials.length} reviews)</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="fas fa-map-marker-alt text-emerald-600" />
                  <span className="text-gray-600">{dietitian.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="fas fa-briefcase text-emerald-600" />
                  <span className="text-gray-600">{dietitian.experience || 10}+ years experience</span>
                </div>
              </div>
              <div className="mb-3">
                <span className="text-sm font-semibold mr-2 text-teal-900">Languages:</span>
                <span className="text-gray-600">{dietitian.languages?.join(', ') || 'English'}</span>
              </div>
              <div className="flex gap-2">
                {dietitian.online && <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-600 text-white">Online Consultation</span>}
                {dietitian.offline && <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-600 text-white">Offline Consultation</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-emerald-600 py-1">
        <div className="w-9/10 mx-auto px-6">
          <h1 className="text-lg font-bold text-white text-center">Find Perfect Dietitian</h1>
        </div>
      </div>

      <div className="w-9/10 mx-auto px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <div className="rounded-lg p-6 bg-white shadow-sm">
              <h2 className="text-xl font-bold mb-4 text-teal-900">About</h2>
              <p className="leading-relaxed text-gray-600">{dietitian.description}</p>
            </div>

            {/* Specialties */}
            <div className="rounded-lg p-6 bg-white shadow-sm">
              <h2 className="text-xl font-bold mb-4 text-teal-900">Specialties</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {dietitian.specialties?.map((specialty, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border-l-4 border-emerald-600">
                    <span className="font-bold text-emerald-600">✓</span>
                    <span className="text-gray-700">{specialty}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Expertise */}
            <div className="rounded-lg p-6 bg-white shadow-sm">
              <h2 className="text-xl font-bold mb-4 text-teal-900">Areas of Expertise</h2>
              <ul className="space-y-3">
                {dietitian.expertise?.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="font-bold text-lg mt-0 text-emerald-600">✓</span>
                    <span className="text-gray-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Education */}
            <div className="rounded-lg p-6 bg-white shadow-sm">
              <h2 className="text-xl font-bold mb-4 text-teal-900">Education</h2>
              <div className="space-y-3">
                {dietitian.education?.map((edu, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-emerald-50 border-l-4 border-emerald-600">
                    <p className="text-gray-700">{edu}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Certifications */}
            <div className="rounded-lg p-6 bg-white shadow-sm">
              <h2 className="text-xl font-bold mb-4 text-teal-900">Certifications</h2>
              <div className="space-y-3">
                {dietitian.certifications?.map((cert, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-emerald-50 border-l-4 border-emerald-600">
                    <h4 className="font-bold mb-1 text-teal-900">{cert.name}</h4>
                    <p className="text-sm text-gray-600">Issued by {cert.issuer} • {cert.year}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Testimonials */}
            <div className="rounded-lg overflow-hidden bg-white shadow-sm">
              <div className="px-6 py-4 bg-emerald-600 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Client Testimonials ({testimonials.length})</h3>
                {canReview.allowed ? (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors cursor-pointer"
                  >
                    <FaPlus size={14} /> Add Review
                  </button>
                ) : (
                  <div className="relative group">
                    <button disabled className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-gray-400 text-gray-200 cursor-not-allowed">
                      <FaPlus size={14} /> Add Review
                    </button>
                    <div className="absolute right-0 top-full mt-2 w-64 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                      {canReview.reason || 'You need to consult this dietitian before adding a review'}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 space-y-4">
                {testimonials.length > 0 ? (
                  testimonials.map((t, idx) => (
                    <div key={t._id || t.id || idx} className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-semibold mb-2 text-teal-900">{t.author}</p>
                          <div className="flex gap-0.5">{renderStarRating(t.rating)}</div>
                          <p className="text-xs mt-1 text-gray-600">{Number(t.rating).toFixed(1)}/5 stars</p>
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed text-gray-600">{t.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-8 text-gray-600">No testimonials yet. Be the first to share your experience!</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6 sticky top-6">
            <div className="rounded-lg overflow-hidden bg-white shadow-sm">
              <div className="px-6 py-4 bg-emerald-600">
                <h3 className="font-bold text-white">Contact Information</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <i className="fas fa-map-marker-alt text-emerald-600" />
                  <div>
                    <p className="font-semibold text-sm text-teal-900">Location</p>
                    <p className="text-gray-600">{dietitian.location}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <i className="fas fa-language text-emerald-600" />
                  <div>
                    <p className="font-semibold text-sm text-teal-900">Languages</p>
                    <p className="text-gray-600">{dietitian.languages?.join(', ') || 'English'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <i className="fas fa-video text-emerald-600" />
                  <div>
                    <p className="font-semibold text-sm text-teal-900">Consultation Types</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {dietitian.online && <span className="px-2 py-1 rounded text-xs bg-emerald-50 text-emerald-700">Online</span>}
                      {dietitian.offline && <span className="px-2 py-1 rounded text-xs bg-emerald-50 text-emerald-700">Offline</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsBookingSidebarOpen(true)}
              className="w-full py-4 rounded-full font-bold text-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-md cursor-pointer"
            >
              Book Consultation
            </button>

            <div className="rounded-lg p-6 bg-white shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest mb-2 text-gray-600">Consultation Fee</p>
              <p className="text-4xl font-bold text-emerald-600">₹{dietitian.fees}</p>
              <p className="text-xs mt-2 text-gray-600">per session</p>
            </div>

            <div className="rounded-lg p-6 bg-gray-50 border border-gray-200 space-y-4">
              <div className="text-center pb-4 border-b border-gray-200">
                <p className="text-xs font-semibold mb-1 text-gray-600">EXPERIENCE</p>
                <p className="text-2xl font-bold text-teal-900">{dietitian.experience || 10}+ Years</p>
              </div>
              <div className="text-center pb-4 border-b border-gray-200">
                <p className="text-xs font-semibold mb-1 text-gray-600">RATING</p>
                <div className="flex justify-center mb-1">{renderStarRating(dietitian.rating || 0)}</div>
                <p className="text-xs text-gray-600">
                  {Number(dietitian.rating || 0).toFixed(1)} out of 5 ({testimonials.length} reviews)
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold mb-1 text-gray-600">CONSULTATIONS</p>
                <p className="text-2xl font-bold text-emerald-600">{consultationCount}+</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TestimonialModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitTestimonial}
      />

      <BookingSidebar
        isOpen={isBookingSidebarOpen}
        onClose={() => setIsBookingSidebarOpen(false)}
        onProceedToPayment={handleProceedToPayment}
        dietitianId={dietitian._id}
        dietitian={dietitian}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSubmit={handlePaymentSubmit}
        paymentDetails={{
          amount: bookingData?.amount || dietitian?.fees || 500,
          dietitianId: bookingData?.dietitianId || dietitian?._id,
          dietitianName: bookingData?.dietitianName || dietitian?.name,
          dietitianEmail: bookingData?.dietitianEmail || dietitian?.email,
          dietitianPhone: bookingData?.dietitianPhone || dietitian?.phone,
          dietitianSpecialization: bookingData?.dietitianSpecialization || dietitian?.specialties?.[0] || "",
          date: bookingData?.date,
          time: bookingData?.time,
          type: bookingData?.type || bookingData?.consultationType,
          consultationType: bookingData?.consultationType || bookingData?.type,
          userId: bookingData?.userId,
          userName: bookingData?.userName,
          userPhone: bookingData?.userPhone,
          userAddress: bookingData?.userAddress
        }}
      />

      <Notification
        show={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={hideNotification}
      />
    </div>
  );
}
