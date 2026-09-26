import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createConsultationOrder } from "../../services/payment/paymentService";
import { useAuthContext } from "../../hooks/useAuthContext";
import SubscriptionAlert from '../../middleware/SubscriptionAlert';
import { loadRazorpayCheckout } from "../../utils/razorpayCheckout";
import { getActiveToken } from "../../utils/axiosInstance";
import {
  createBooking,
  selectSubscriptionAlertData,
  selectShowSubscriptionAlert,
  clearSubscriptionAlert
} from "../../redux/slices/bookingSlice";

const PAYMENT_METHODS = [
  { key: 'card', title: 'Credit/Debit Card' },
  { key: 'netbanking', title: 'Net Banking' },
  { key: 'upi', title: 'UPI' },
];

const PaymentNotificationModal = ({ isOpen, onClose, onSubmit, paymentDetails }) => {
  const dispatch = useDispatch();
  const { user } = useAuthContext();
  const reduxSubscriptionAlertData = useSelector(selectSubscriptionAlertData);
  const reduxShowSubscriptionAlert = useSelector(selectShowSubscriptionAlert);

  const [isProcessing, setIsProcessing] = useState(false);
  const [email, setEmail] = useState("");
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (user?.email && isOpen) setEmail(user.email);
  }, [user, isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setEmail(""); setSelectedMethod(null); setValidationErrors({});
  };

  const handleFormSubmit = async () => {
    const errors = {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Please enter a valid email address";
    if (!selectedMethod) errors.paymentMethod = "Please select a payment method";
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) { alert(`Please fix:\n\n${Object.values(errors).join('\n')}`); return; }

    let checkoutOpened = false;
    setIsProcessing(true);
    try {
      const userId = user?.id || user?._id || paymentDetails?.userId;
      const authToken = getActiveToken();
      if (!userId || !authToken) { alert('User session not found or expired. Please log in again.'); setIsProcessing(false); return; }

      const consultationType = paymentDetails?.consultationType || paymentDetails?.type || 'Online';
      const bookingBaseData = {
        userId, username: user?.name || paymentDetails?.userName || email.split('@')[0], email,
        userPhone: user?.phone || paymentDetails?.userPhone || '',
        userAddress: user?.address || paymentDetails?.userAddress || '',
        dietitianId: paymentDetails?.dietitianId, dietitianName: paymentDetails?.dietitianName,
        dietitianEmail: paymentDetails?.dietitianEmail, dietitianPhone: paymentDetails?.dietitianPhone || '',
        dietitianSpecialization: paymentDetails?.dietitianSpecialization || '',
        date: paymentDetails?.date, time: paymentDetails?.time,
        consultationType, amount: Number(paymentDetails?.amount), paymentMethod: selectedMethod,
      };

      const REQUIRED = ['userId','username','email','dietitianId','dietitianName','dietitianEmail','date','time','consultationType','amount','paymentMethod'];
      const missing = REQUIRED.filter(f => !bookingBaseData[f]);
      if (missing.length > 0) {
        alert(`Missing required information: ${missing.join(', ')}. Please close and try booking again.`);
        setIsProcessing(false); return;
      }

      const razorpayLoaded = await loadRazorpayCheckout();
      if (!razorpayLoaded || !window.Razorpay) {
        alert('Unable to load Razorpay checkout. Please check your internet connection and try again.');
        setIsProcessing(false); return;
      }

      const orderData = await createConsultationOrder({
        amount: Number(paymentDetails?.amount), date: paymentDetails?.date,
        time: paymentDetails?.time, consultationType, dietitianId: paymentDetails?.dietitianId
      });
      const order = orderData?.data?.order || orderData?.order;
      if (orderData?.isError || !orderData?.success || !order?.id) {
        throw new Error(orderData?.message || 'Failed to create booking payment order');
      }

      const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID || orderData?.data?.keyId || orderData?.keyId;
      if (!keyId) throw new Error('Razorpay key is not configured in frontend environment');

      const razorpay = new window.Razorpay({
        key: keyId, amount: order.amount, currency: order.currency || 'INR',
        name: 'NutriConnect', description: `Consultation Booking with ${bookingBaseData.dietitianName}`, order_id: order.id,
        prefill: { name: bookingBaseData.username, email: bookingBaseData.email, contact: bookingBaseData.userPhone || '' },
        method: { card: selectedMethod === 'card', netbanking: selectedMethod === 'netbanking', upi: selectedMethod === 'upi', emi: false, wallet: false, paylater: false },
        notes: {
          dietitianId: String(bookingBaseData.dietitianId), date: String(bookingBaseData.date),
          time: String(bookingBaseData.time), consultationType: String(bookingBaseData.consultationType)
        },
        theme: { color: '#27AE60' },
        handler: async (response) => {
          try {
            const bookingPayload = {
              ...bookingBaseData,
              paymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            };
            const result = await dispatch(createBooking(bookingPayload)).unwrap();
            if (result) {
              onSubmit?.({ email, paymentMethod: selectedMethod, amount: paymentDetails?.amount, transactionId: response.razorpay_payment_id, bookingId: result._id });
              onClose(); resetForm();
            }
          } catch (bookingError) {
            if (!reduxShowSubscriptionAlert) {
              alert(typeof bookingError === 'string' ? bookingError : (bookingError?.message || 'Payment succeeded but booking failed. Please contact support.'));
            }
          } finally { setIsProcessing(false); }
        },
        modal: { ondismiss: () => setIsProcessing(false) }
      });

      razorpay.on('payment.failed', (response) => {
        alert(response?.error?.description || 'Payment failed. Please try again.');
        setIsProcessing(false);
      });

      checkoutOpened = true;
      razorpay.open();
    } catch (error) {
      if (!reduxShowSubscriptionAlert) {
        alert(typeof error === 'string' ? error : (error?.message || "Booking failed. Please try again."));
      }
    } finally { if (!checkoutOpened) setIsProcessing(false); }
  };

  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-all duration-300" onClick={onClose} />
        <div className="relative bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 border border-white/20">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
            <h2 className="text-2xl font-bold" style={{ color: '#1A4A40' }}>Complete Payment</h2>
            <button onClick={onClose} className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 text-2xl font-light rounded-full w-8 h-8 flex items-center justify-center transition-colors" aria-label="Close modal">✕</button>
          </div>

          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wide" style={{ color: '#1A4A40' }}>Booking Summary</h3>
            <div className="space-y-2">
              {[
                ['Amount', <span className="font-bold text-lg" style={{ color: '#27AE60' }}>₹{paymentDetails?.amount}</span>],
                ['Dietitian', paymentDetails?.dietitianName],
                ['Date', paymentDetails?.date],
                ['Time', paymentDetails?.time],
                ['Type', paymentDetails?.type],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">{label}:</span>
                  <span className="font-medium text-gray-800 text-sm">{val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block mb-2 font-semibold text-gray-700 text-sm">Email Address *</label>
            <p className="text-xs text-gray-500 mb-2">Booking confirmation will be sent to this email</p>
            <input
              type="email" placeholder="your.email@example.com" value={email}
              onChange={e => { setEmail(e.target.value); if (validationErrors.email) setValidationErrors(p => ({ ...p, email: null })); }}
              readOnly={!!user?.email}
              className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 text-gray-700 font-medium placeholder-gray-400 ${user?.email ? 'bg-gray-100 cursor-not-allowed' : ''} ${validationErrors.email ? 'border-red-500' : 'border-gray-300'}`}
            />
            {user?.email && <p className="text-xs text-emerald-600 mt-1">✓ Email auto-filled from your account</p>}
            {validationErrors.email && <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>}
          </div>

          <h3 className="text-xl font-bold mb-4" style={{ color: '#1A4A40' }}>Payment Method</h3>
          <div className="bg-gray-50 rounded-md p-4 mb-6 text-lg font-semibold" style={{ color: '#2F4F4F' }}>
            Amount to be Paid: ₹{paymentDetails?.amount || '---'}
          </div>

          <div className="space-y-4 mb-6">
            {PAYMENT_METHODS.map(({ key, title }) => (
              <div key={key} className="border rounded-lg overflow-hidden">
                <div className={`flex items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedMethod === key ? 'bg-gray-50' : ''}`} onClick={() => setSelectedMethod(selectedMethod === key ? null : key)}>
                  <input type="radio" name="payment" checked={selectedMethod === key} onChange={() => setSelectedMethod(key)} className="h-4 w-4 focus:ring-2" style={{ accentColor: '#27AE60' }} />
                  <label className="ml-3 font-medium" style={{ color: '#2F4F4F' }}>{title}</label>
                </div>
                {selectedMethod === key && (
                  <div className="p-4 bg-emerald-50 border-t border-emerald-200 text-sm" style={{ color: '#1A4A40' }}>
                    Details will be entered securely on Razorpay checkout.
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-xs text-emerald-700 flex items-center gap-2"><i className="fas fa-lock text-emerald-600" />Your payment information is secure and encrypted</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={isProcessing} className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed">Cancel</button>
            <button type="button" onClick={handleFormSubmit} disabled={isProcessing || !selectedMethod}
              className={`flex-1 px-4 py-3 rounded-lg transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${!selectedMethod ? 'bg-gray-300 cursor-not-allowed text-gray-500' : 'text-white'}`}
              style={selectedMethod ? { backgroundColor: '#27AE60' } : {}}>
              {isProcessing ? <><i className="fas fa-spinner animate-spin mr-2" />Processing...</> : 'Confirm Payment'}
            </button>
          </div>
        </div>
      </div>

      {reduxShowSubscriptionAlert && reduxSubscriptionAlertData && (
        <SubscriptionAlert
          message={reduxSubscriptionAlertData.message} planType={reduxSubscriptionAlertData.planType}
          limitType={reduxSubscriptionAlertData.limitType} currentCount={reduxSubscriptionAlertData.currentCount}
          limit={reduxSubscriptionAlertData.limit}
          onClose={() => { dispatch(clearSubscriptionAlert()); onClose(); }}
        />
      )}
    </>
  );
};

export default PaymentNotificationModal;
