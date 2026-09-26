import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import { useAuth } from "../../hooks/useAuth";
import {
  checkActiveSubscription, initializePayment, processPayment,
  selectActiveSubscription, selectCurrentPayment, selectPaymentStatus,
  selectIsProcessingPayment, selectError, resetPaymentStatus, clearError, setPaymentStatus
} from "../../redux/slices/paymentSlice";
import { loadRazorpayCheckout } from "../../utils/razorpayCheckout";

const PAYMENT_METHODS = [
  { key: "card", title: "Credit/Debit Card" },
  { key: "netbanking", title: "Net Banking" },
  { key: "upi", title: "UPI" },
  { key: "emi", title: "EMI" },
];

const Payment = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const plan = searchParams.get("plan");
  const billing = searchParams.get("billing");
  const amount = searchParams.get("amount");
  const { token, isAuthenticated } = useAuth('user');

  const activeSubscription = useSelector(selectActiveSubscription);
  const currentPayment = useSelector(selectCurrentPayment);
  const reduxPaymentStatus = useSelector(selectPaymentStatus);
  const isProcessingPayment = useSelector(selectIsProcessingPayment);
  const reduxError = useSelector(selectError);

  const [selectedMethod, setSelectedMethod] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [localPaymentStatus, setLocalPaymentStatus] = useState(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    if (!isAuthenticated) { alert('Please login to continue with payment'); navigate('/role'); }
    else dispatch(checkActiveSubscription());
  }, [isAuthenticated, token, navigate, dispatch]);

  useEffect(() => {
    if (reduxPaymentStatus === 'success' && currentPayment?.transactionId) {
      setLocalPaymentStatus('success');
      setTimeout(() => { setShowModal(false); dispatch(resetPaymentStatus()); navigate(`/user/payment-success?transactionId=${currentPayment.transactionId}`); }, 2000);
    } else if (reduxPaymentStatus === 'failed') {
      setLocalPaymentStatus('failed');
      if (reduxError) { alert(reduxError); dispatch(clearError()); }
    } else if (reduxPaymentStatus === 'processing') {
      setLocalPaymentStatus('processing');
    }
  }, [reduxPaymentStatus, currentPayment, navigate, dispatch, reduxError]);

  const handleProceed = () => {
    if (activeSubscription?.hasActiveSubscription) { setShowSubscriptionModal(true); return; }
    if (!selectedMethod) { alert('Please select a payment method to continue.'); return; }
    setShowModal(true);
  };

  const handleConfirmPayment = async () => {
    try {
      if (!token) { alert('Authentication token not found. Please login again.'); navigate('/role'); return; }
      const subResult = await dispatch(checkActiveSubscription()).unwrap();
      if (subResult.hasActiveSubscription) { setShowSubscriptionModal(true); dispatch(setPaymentStatus(null)); return; }

      const initResult = await dispatch(initializePayment({
        planType: plan, billingCycle: billing, amount: parseFloat(amount),
        paymentMethod: selectedMethod, paymentDetails: { gatewaySelection: selectedMethod }
      })).unwrap();

      if (!initResult?.id || !initResult?.razorpay?.orderId) throw new Error('Failed to initialize Razorpay order');

      const razorpayLoaded = await loadRazorpayCheckout();
      if (!razorpayLoaded || !window.Razorpay) throw new Error('Unable to load Razorpay checkout. Please check your connection.');

      const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID || initResult?.razorpay?.keyId;
      if (!keyId) throw new Error('Razorpay key is not configured.');

      setLocalPaymentStatus('processing');

      const razorpay = new window.Razorpay({
        key: keyId, amount: initResult.razorpay.amount, currency: initResult.razorpay.currency || 'INR',
        name: 'NutriConnect', description: `${plan?.toUpperCase()} Plan (${billing})`,
        order_id: initResult.razorpay.orderId,
        method: { card: selectedMethod === 'card', netbanking: selectedMethod === 'netbanking', upi: selectedMethod === 'upi', emi: selectedMethod === 'emi', wallet: false, paylater: false },
        notes: { planType: plan, billingCycle: billing },
        theme: { color: '#27AE60' },
        handler: async (response) => {
          try {
            await dispatch(processPayment({
              paymentId: initResult.id, paymentMethod: selectedMethod,
              razorpayOrderId: response.razorpay_order_id, razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            })).unwrap();
          } catch (err) {
            setLocalPaymentStatus('failed'); dispatch(setPaymentStatus('failed'));
            alert(err || 'Payment verification failed. Please contact support if amount was debited.');
          }
        },
        modal: { ondismiss: () => { setLocalPaymentStatus(null); dispatch(setPaymentStatus(null)); } }
      });

      razorpay.on('payment.failed', (response) => {
        setLocalPaymentStatus('failed'); dispatch(setPaymentStatus('failed'));
        alert(response?.error?.description || 'Payment failed. Please try again.');
      });

      razorpay.open();
    } catch (error) {
      if (error === 'Not authenticated' || error?.includes?.('token')) { alert('Authentication failed. Please login again.'); navigate('/role'); }
      else { setLocalPaymentStatus('failed'); dispatch(setPaymentStatus('failed')); alert(error || 'Payment failed. Please try again.'); }
    }
  };

  const selectedMethodTitle = PAYMENT_METHODS.find(m => m.key === selectedMethod)?.title;

  return (
    <div className="min-h-screen bg-gray-50 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="relative mb-8">
        <button onClick={() => navigate(-1)} className="absolute left-0 top-0 px-6 py-3 rounded-xl font-semibold text-white transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
          style={{ backgroundColor: '#27AE60' }} onMouseEnter={e => e.target.style.backgroundColor = '#1A4A40'} onMouseLeave={e => e.target.style.backgroundColor = '#27AE60'}>
          <i className="fas fa-chevron-left" /> Back
        </button>
      </div>

      <div className="w-[70%] mx-auto bg-white rounded-lg shadow-lg p-8" style={{ borderTop: '4px solid #27AE60', borderBottom: '4px solid #27AE60' }}>
        <h3 className="text-2xl font-bold mb-6" style={{ color: '#1A4A40' }}>Payment Method</h3>
        <div className="bg-gray-50 rounded-md p-4 mb-6 text-lg font-semibold" style={{ color: '#2F4F4F' }}>Amount to be Paid: ₹{amount || "---"}</div>
        <div className="space-y-4">
          {PAYMENT_METHODS.map(({ key, title }) => (
            <div key={key} className="border rounded-lg overflow-hidden">
              <div className={`flex items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedMethod === key ? "bg-gray-50" : ""}`}
                onClick={() => setSelectedMethod(selectedMethod === key ? null : key)}>
                <input type="radio" name="payment" checked={selectedMethod === key} onChange={() => setSelectedMethod(key)} className="h-4 w-4 focus:ring-2" style={{ accentColor: '#27AE60' }} />
                <label className="ml-3" style={{ color: '#2F4F4F' }}>{title}</label>
              </div>
              {selectedMethod === key && (
                <div className="p-4 bg-emerald-50 border-t border-emerald-200 text-sm" style={{ color: '#1A4A40' }}>
                  Details will be entered securely on Razorpay checkout.
                </div>
              )}
            </div>
          ))}
        </div>
        <button onClick={handleProceed} disabled={!selectedMethod}
          className={`w-full mt-8 py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${selectedMethod ? "text-white" : "bg-gray-300 cursor-not-allowed text-gray-500"}`}
          style={selectedMethod ? { backgroundColor: '#27AE60' } : {}}
          onMouseEnter={e => selectedMethod && (e.target.style.backgroundColor = '#1A4A40')}
          onMouseLeave={e => selectedMethod && (e.target.style.backgroundColor = '#27AE60')}>
          Proceed to Payment
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto">
          <Header />
          <div className="min-h-screen pt-4 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="relative mb-8">
              <button onClick={() => setShowModal(false)} className="absolute left-4 top-8 px-6 py-3 rounded-xl font-semibold text-white transition-all shadow-lg flex items-center gap-2"
                style={{ backgroundColor: '#27AE60' }} onMouseEnter={e => e.target.style.backgroundColor = '#1A4A40'} onMouseLeave={e => e.target.style.backgroundColor = '#27AE60'}>
                <i className="fas fa-chevron-left" /> Back
              </button>
            </div>
            <div className="w-[70%] mx-auto">
              <div className="bg-white rounded-lg shadow-lg p-8 text-center" style={{ borderTop: '4px solid #27AE60', borderBottom: '4px solid #27AE60' }}>
                {(localPaymentStatus === "processing" || isProcessingPayment) ? (
                  <div>
                    <div className="mb-4"><div className="animate-spin rounded-full h-16 w-16 border-b-4 mx-auto" style={{ borderColor: '#27AE60' }} /></div>
                    <h2 className="text-2xl font-bold mb-2" style={{ color: '#1A4A40' }}>Processing Payment...</h2>
                    <p style={{ color: '#2F4F4F' }}>Please wait while we process your payment</p>
                    <p className="text-sm text-gray-500 mt-2">Do not close this window</p>
                  </div>
                ) : localPaymentStatus === "success" ? (
                  <div>
                    <div className="mb-4">
                      <svg className="mx-auto h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#27AE60' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h2 className="text-3xl font-bold mb-3" style={{ color: '#27AE60' }}>Payment Successful!</h2>
                    <p className="text-lg mb-2" style={{ color: '#2F4F4F' }}>Your payment of ₹{amount} has been processed successfully.</p>
                    <p className="text-sm text-gray-600">Transaction ID: {currentPayment?.transactionId || `TXN${Date.now()}`}</p>
                    <p className="text-sm text-gray-500 mt-2">Redirecting to confirmation page...</p>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold mb-6" style={{ color: '#1A4A40' }}>Confirm Your Payment</h2>
                    <div className="bg-gray-50 rounded-lg p-6 mb-6">
                      <div className="mb-4"><p className="text-sm text-gray-600 mb-1">Payment Method</p><p className="text-lg font-semibold" style={{ color: '#1A4A40' }}>{selectedMethodTitle}</p></div>
                      <div className="border-t pt-4"><p className="text-sm text-gray-600 mb-1">Plan Details</p><p className="text-base font-medium" style={{ color: '#2F4F4F' }}>{plan?.toUpperCase()} Plan ({billing})</p></div>
                      <div className="border-t pt-4 mt-4"><p className="text-sm text-gray-600 mb-2">Amount to Pay</p><p className="text-5xl font-bold" style={{ color: '#27AE60' }}>₹{amount}</p></div>
                      <div className="mt-4 pt-4 border-t text-left"><p className="text-xs text-gray-600">You will enter payment details only once in Razorpay checkout.</p></div>
                    </div>
                    <div className="flex justify-center gap-4">
                      <button onClick={handleConfirmPayment} disabled={isProcessingPayment}
                        className={`text-white py-3 px-10 rounded-lg transition-all font-semibold text-lg ${isProcessingPayment ? 'opacity-50 cursor-not-allowed' : ''}`}
                        style={{ backgroundColor: '#27AE60' }}
                        onMouseEnter={e => !isProcessingPayment && (e.target.style.backgroundColor = '#1A4A40')}
                        onMouseLeave={e => !isProcessingPayment && (e.target.style.backgroundColor = '#27AE60')}>
                        {isProcessingPayment ? 'Processing...' : 'Confirm & Pay'}
                      </button>
                      <button onClick={() => setShowModal(false)} disabled={isProcessingPayment}
                        className={`bg-gray-200 hover:bg-gray-300 py-3 px-10 rounded-lg font-semibold text-lg ${isProcessingPayment ? 'opacity-50 cursor-not-allowed' : ''}`}
                        style={{ color: '#2F4F4F' }}>
                        Cancel
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-6 flex items-center gap-2"><i className="fas fa-lock text-gray-400" /> Your payment information is secure and encrypted</p>
                  </>
                )}
              </div>
            </div>
          </div>
          <Footer />
        </div>
      )}

      {showSubscriptionModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-linear-to-br from-black/60 via-gray-900/50 to-black/60 backdrop-blur-md">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="bg-yellow-50 px-6 py-4 rounded-t-lg border-b border-yellow-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-yellow-800">Active Subscription Detected</h3>
              <button onClick={() => setShowSubscriptionModal(false)} className="text-yellow-600 hover:text-yellow-800 text-xl font-bold">×</button>
            </div>
            <div className="px-6 py-6 text-center">
              <div className="mb-4">
                <svg className="mx-auto h-16 w-16 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-gray-700 mb-2">You currently have an active subscription:</p>
              <p className="text-lg font-semibold text-gray-900 mb-2">{activeSubscription?.planType} Plan</p>
              <p className="text-gray-600 mb-6">Valid until: <span className="font-medium">{activeSubscription ? new Date(activeSubscription.subscriptionEndDate).toLocaleDateString() : ''}</span></p>
              <p className="text-sm text-gray-500 mb-6">To purchase a new subscription, please wait until your current subscription expires.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setShowSubscriptionModal(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">Close</button>
                <button onClick={() => { setShowSubscriptionModal(false); navigate('/user/subscription'); }} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">View Dashboard</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payment;
