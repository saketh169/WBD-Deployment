import React, { useState, useEffect, useMemo, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import AuthContext from '../../contexts/AuthContext';
import { getOrCreateConversation } from '../../services/chat/chatService';
import {
  fetchUserBookings,
  selectUserBookings,
  selectDietitianProfiles,
  selectIsLoading as selectBookingLoading
} from '../../redux/slices/bookingSlice';

const getStatusColor = (status) => {
  switch (status) {
    case 'Active': return 'bg-green-100 text-green-800';
    case 'Pending': return 'bg-yellow-100 text-yellow-800';
    case 'Completed': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const renderStars = (rating) => {
  const stars = [];
  const full = Math.floor(rating);
  for (let i = 0; i < full; i++) stars.push(<i key={`f-${i}`} className="fas fa-star text-yellow-400" />);
  if (rating % 1 !== 0) stars.push(<i key="half" className="fas fa-star-half-alt text-yellow-400" />);
  const empty = 5 - Math.ceil(rating);
  for (let i = 0; i < empty; i++) stars.push(<i key={`e-${i}`} className="far fa-star text-gray-300" />);
  return stars;
};

const DietitianCard = ({ dietitian: d, onBook, onMessage, onViewProfile }) => (
  <div className="bg-white rounded-2xl shadow-lg border border-emerald-100/50 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
      <div className="shrink-0 relative">
        <div className="absolute inset-0 bg-linear-to-r from-emerald-400 to-teal-500 rounded-full blur-sm opacity-75" />
        <img src={d.profileImage} alt={d.name} className="relative w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover" />
      </div>

      <div className="flex-1 space-y-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-2xl font-bold bg-linear-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{d.name}</h3>
              <span className={`px-4 py-1.5 text-sm font-semibold rounded-full shadow-sm ${getStatusColor(d.status)}`}>{d.status}</span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border shadow-xs ${
                d.consultationType?.toLowerCase().includes('person')
                  ? 'bg-purple-100 text-purple-800 border-purple-300'
                  : 'bg-blue-100 text-blue-800 border-blue-300'
              }`}>
                <i className={`fas ${
                  d.consultationType?.toLowerCase().includes('person')
                    ? 'fa-building'
                    : 'fa-video'
                }`} />
                {d.consultationType?.toLowerCase().includes('person') ? 'In-Person' : 'Online'}
              </span>
            </div>
            <p className="text-emerald-600 font-semibold text-lg flex items-center gap-2">
              <i className="fas fa-stethoscope text-sm" />{d.specialization}
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
              <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg"><i className="fas fa-map-marker-alt text-emerald-500" />{d.location}</span>
              <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg"><i className="fas fa-clock text-emerald-500" />{d.experience} exp.</span>
              <span className="flex items-center gap-1.5 bg-yellow-50 px-3 py-1.5 rounded-lg">
                <span className="flex gap-0.5">{renderStars(d.rating)}</span>
                <span className="font-bold text-gray-900">{d.rating}</span>
                <span className="text-gray-500">({d.totalReviews})</span>
              </span>
            </div>
          </div>
          <div className="bg-linear-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border-2 border-emerald-200 shadow-sm text-center md:min-w-40">
            <div className="text-3xl font-bold bg-linear-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">₹{d.fees}</div>
            <div className="text-sm text-teal-700 font-medium mt-1">per consultation</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-linear-to-br from-emerald-50 to-teal-50 rounded-xl p-3 border border-emerald-200/50 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center text-white"><i className="fas fa-history" /></div>
            <div>
              <div className="text-xs text-teal-700 font-medium">Total Sessions</div>
              <div className="font-bold text-emerald-700 text-xl">{d.totalSessions}</div>
            </div>
          </div>
          <div className="bg-linear-to-br from-emerald-50 to-teal-50 rounded-xl p-3 border border-emerald-200/50 flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center text-white"><i className="fas fa-arrow-up" /></div>
            <div>
              <div className="text-xs text-teal-700 font-medium">Upcoming</div>
              <div className="font-bold text-teal-700 text-xl">{d.upcomingSessions} sessions</div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full border border-blue-300/50">
            <i className="fas fa-award mr-1" />{d.qualifications}
          </span>
          {d.languages.map((lang, index) => (
            <span key={index} className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full border border-green-300/50">
              <i className="fas fa-language mr-1" />{lang}
            </span>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button onClick={() => onBook(d)} className="flex-1 px-5 py-2.5 bg-linear-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold shadow hover:shadow-lg transition-all flex items-center justify-center gap-2">
            <i className="fas fa-calendar-check" /><span>Book Next Session</span>
          </button>
          <button onClick={() => onMessage(d)} className="px-5 py-2.5 bg-white border-2 border-emerald-300 text-emerald-700 rounded-xl font-semibold hover:bg-emerald-50 transition-all flex items-center justify-center gap-2">
            <i className="fas fa-comments" /><span>Message</span>
          </button>
          <button onClick={() => onViewProfile(d)} className="px-5 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
            <i className="fas fa-user-md" /><span>View Profile</span>
          </button>
        </div>
      </div>
    </div>
  </div>
);

const DietitianProfileModal = ({ dietitian: d, onClose, onBook }) => {
  if (!d) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-linear-to-r from-emerald-500 to-teal-600 px-6 py-4 flex justify-between items-center text-white">
          <h2 className="text-xl font-bold flex items-center gap-2"><i className="fas fa-user-md" />Dietitian Profile</h2>
          <button onClick={onClose} className="text-white text-2xl hover:opacity-75">×</button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)] space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b">
            <img src={d.profileImage} alt={d.name} className="w-20 h-20 rounded-full border-2 border-emerald-500 object-cover" />
            <div>
              <h3 className="text-2xl font-bold text-gray-800">{d.name}</h3>
              <p className="text-emerald-600 font-semibold">{d.specialization}</p>
              <div className="mt-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border shadow-xs ${
                  d.consultationType?.toLowerCase().includes('person')
                    ? 'bg-purple-100 text-purple-800 border-purple-300'
                    : 'bg-blue-100 text-blue-800 border-blue-300'
                }`}>
                  <i className={`fas ${
                    d.consultationType?.toLowerCase().includes('person')
                      ? 'fa-building'
                      : 'fa-video'
                  }`} />
                  {d.consultationType?.toLowerCase().includes('person') ? 'In-Person Consultation' : 'Online Consultation'}
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-gray-50 rounded-xl"><span className="text-gray-500">Email:</span> <p className="font-semibold truncate">{d.email}</p></div>
            <div className="p-3 bg-gray-50 rounded-xl"><span className="text-gray-500">Phone:</span> <p className="font-semibold">{d.phone || 'N/A'}</p></div>
            <div className="p-3 bg-emerald-50 rounded-xl"><span className="text-emerald-700">Mode:</span> <p className="font-bold text-emerald-800">{d.consultationType?.toLowerCase().includes('person') ? 'In-Person' : 'Online'}</p></div>
            <div className="p-3 bg-emerald-50 rounded-xl"><span className="text-emerald-700">Fee:</span> <p className="font-bold text-emerald-800">₹{d.fees}</p></div>
          </div>
          <div className="p-4 bg-emerald-50 rounded-xl">
            <span className="text-xs font-semibold text-teal-700">Qualifications:</span>
            <p className="font-semibold text-teal-900">{d.qualifications}</p>
          </div>
          <div className="flex gap-3 pt-3">
            <button onClick={() => { onClose(); onBook(d); }} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition">
              <i className="fas fa-calendar-check mr-2" />Book Session
            </button>
            <button onClick={onClose} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DietitiansList = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, token } = useContext(AuthContext);

  const bookings = useSelector(selectUserBookings);
  const dietitianProfiles = useSelector(selectDietitianProfiles);
  const loading = useSelector(selectBookingLoading);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedDietitian, setSelectedDietitian] = useState(null);

  const handleBookNextSession = (d) => {
    navigate(`/user/dietitian-profiles/${d.id}`, {
      state: {
        dietitian: {
          _id: d.id, name: d.name, email: d.email, phone: d.phone,
          specialties: [d.specialization], specialization: d.specialization,
          fees: d.fees, consultationFee: d.consultationFee
        },
        openBooking: true
      }
    });
  };

  const handleMessageDietitian = async (d) => {
    try {
      const authToken = token || localStorage.getItem('authToken_user');
      if (!user?.id || !authToken) {
        alert('Session expired. Please login again.');
        navigate('/signin?role=user');
        return;
      }
      const res = await getOrCreateConversation({ clientId: user.id, dietitianId: d.id });
      if (!res.isError && (res.success || res.data)) {
        const conversation = res.data || res;
        navigate(`/user/chat/${conversation._id}`, {
          state: {
            otherParticipant: { id: d.id, name: d.name, email: d.email },
            bookingInfo: { date: d.nextAppointmentDate || d.lastConsultation, time: d.nextAppointmentTime || '10:00' }
          }
        });
      }
    } catch (error) {
      alert(`Failed to start chat: ${error.response?.data?.message || error.message}`);
    }
  };

  useEffect(() => {
    if (user?.id) dispatch(fetchUserBookings({ userId: user.id }));
  }, [dispatch, user?.id]);

  const dietitiansFromBookings = useMemo(() => {
    const dietitianMap = new Map();
    const now = new Date();

    bookings.forEach(booking => {
      const dietitianId = booking.dietitianId;
      const dateStr = new Date(booking.date).toISOString().split('T')[0];
      const bookingDateTime = new Date(`${dateStr}T${booking.time}`);
      const hoursSinceAppointment = (now - bookingDateTime) / (1000 * 60 * 60);
      if (hoursSinceAppointment > 12 && bookingDateTime < now) return;

      const profile = dietitianProfiles[dietitianId] || {};
      const bookingType = booking.consultationType || (profile.modes?.includes('In-person') ? 'In-person' : 'Online');
      if (dietitianMap.has(dietitianId)) {
        const existing = dietitianMap.get(dietitianId);
        existing.totalSessions += 1;
        if (bookingDateTime > now && (!existing.nextAppointmentDateTime || bookingDateTime < existing.nextAppointmentDateTime)) {
          existing.nextAppointment = `${dateStr} ${booking.time}`;
          existing.nextAppointmentDate = booking.date;
          existing.nextAppointmentTime = booking.time;
          existing.nextAppointmentDateTime = bookingDateTime;
          existing.consultationType = bookingType;
          existing.upcomingSessions += 1;
        }
      } else {
        const isUpcoming = bookingDateTime > now;
        dietitianMap.set(dietitianId, {
          id: dietitianId,
          name: profile.name || booking.dietitianName,
          specialization: profile.specialization?.[0] || booking.dietitianSpecialization || 'General Nutrition',
          email: profile.email || booking.dietitianEmail,
          phone: profile.phone || booking.dietitianPhone,
          consultationFee: profile.fees || booking.amount || 500,
          fees: profile.fees || booking.amount || 500,
          consultationType: bookingType,
          nextAppointment: isUpcoming ? `${dateStr} ${booking.time}` : null,
          nextAppointmentDate: isUpcoming ? booking.date : null,
          nextAppointmentTime: isUpcoming ? booking.time : null,
          nextAppointmentDateTime: isUpcoming ? bookingDateTime : null,
          status: (bookingDateTime < now || booking.status === 'cancelled') ? 'Completed' : 'Active',
          profileImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || booking.dietitianName || 'Dietitian')}&background=28B463&color=fff&size=128`,
          totalSessions: 1,
          upcomingSessions: isUpcoming ? 1 : 0,
          rating: profile.rating || 4.5,
          totalReviews: profile.totalReviews || 0,
          experience: profile.experience || 'N/A',
          location: profile.location || 'N/A',
          languages: profile.languages || ['English'],
          qualifications: profile.education?.[0] || 'Professional Dietitian',
          lastConsultation: booking.date
        });
      }
    });

    return Array.from(dietitianMap.values());
  }, [bookings, dietitianProfiles]);

  const filteredDietitians = useMemo(() => {
    return dietitiansFromBookings.filter(d => {
      const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.consultationType && d.consultationType.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (d.location && d.location.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [dietitiansFromBookings, searchTerm, statusFilter]);

  return (
    <div className="min-h-screen bg-linear-to-br from-emerald-50 to-teal-50">
      <div className="bg-linear-to-r from-emerald-500 to-teal-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-white text-3xl"><i className="fas fa-user-md" /></div>
            <div>
              <h1 className="text-3xl font-bold text-white">My Dietitians</h1>
              <p className="text-emerald-50 mt-1">Manage your consultations and appointments</p>
            </div>
          </div>
          <button onClick={() => navigate('/user/dietitian-profiles')} className="px-6 py-3 bg-white text-emerald-600 rounded-xl font-semibold shadow hover:bg-emerald-50 transition flex items-center gap-2">
            <i className="fas fa-plus" /><span>New Consultation</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-2xl shadow-lg border border-emerald-100/50 p-6 mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <i className="fas fa-search text-emerald-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search dietitians by name, specialization, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 transition"
            />
          </div>
          <div className="md:w-56">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 bg-white font-medium cursor-pointer"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
            <p className="mt-4 text-gray-600">Loading dietitians...</p>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredDietitians.map((d) => (
              <DietitianCard
                key={d.id}
                dietitian={d}
                onBook={handleBookNextSession}
                onMessage={handleMessageDietitian}
                onViewProfile={setSelectedDietitian}
              />
            ))}
          </div>
        )}

        {!loading && filteredDietitians.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-emerald-200 shadow-lg">
            <div className="max-w-md mx-auto">
              <i className="fas fa-user-md text-5xl text-emerald-600 mb-4" />
              <h3 className="text-2xl font-bold text-gray-800 mb-2">No dietitians found</h3>
              <p className="text-gray-600 mb-6">{searchTerm || statusFilter !== 'All' ? 'Try adjusting your search terms or filters.' : "You haven't booked any consultations yet."}</p>
              {!searchTerm && statusFilter === 'All' && (
                <button onClick={() => navigate('/user/dietitian-profiles')} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold shadow hover:bg-emerald-700 transition">
                  <i className="fas fa-plus mr-2" />Book Your First Consultation
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <DietitianProfileModal
        dietitian={selectedDietitian}
        onClose={() => setSelectedDietitian(null)}
        onBook={handleBookNextSession}
      />
    </div>
  );
};

export default DietitiansList;