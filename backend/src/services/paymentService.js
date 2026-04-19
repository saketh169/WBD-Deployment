const Payment = require('../models/paymentModel');
const crypto = require('crypto');
const { sendPaymentCancellationEmail } = require('./emailService');
const razorpayService = require('./razorpayService');

class PaymentService {
  /**
   * Generate unique transaction ID
   */
  generateTransactionId() {
    return `TXN${Date.now()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  /**
   * Generate unique order ID
   */
  generateOrderId() {
    return `ORD${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  }

  /**
   * Create a new payment record
   */
  async createPayment(paymentData) {
    try {
      if (!razorpayService.isConfigured()) {
        return {
          success: false,
          error: 'Payment gateway is not configured. Please contact support.'
        };
      }

      const amountInPaise = Math.round(Number(paymentData.amount) * 100);
      if (!Number.isFinite(amountInPaise) || amountInPaise <= 0) {
        return { success: false, error: 'Invalid payment amount' };
      }

      const razorpayOrder = await razorpayService.createOrder({
        amount: amountInPaise,
        currency: 'INR',
        receipt: this.generateOrderId(),
        notes: {
          userId: String(paymentData.userId),
          planType: paymentData.planType,
          billingCycle: paymentData.billingCycle
        }
      });

      const payment = new Payment({
        ...paymentData,
        transactionId: this.generateTransactionId(),
        orderId: razorpayOrder.id,
        paymentStatus: 'pending',
        paymentGatewayResponse: {
          provider: 'razorpay',
          orderCreatedAt: new Date(),
          order: razorpayOrder
        }
      });

      await payment.save();
      return {
        success: true,
        payment,
        razorpayOrder,
        amountInPaise
      };
    } catch (error) {
      console.error('Error creating payment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process payment (simulate payment gateway)
   */
  async processPayment(paymentId, paymentDetails = {}) {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        return { success: false, error: 'Payment not found' };
      }

      const {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        paymentMethod
      } = paymentDetails;

      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return { success: false, error: 'Missing Razorpay verification fields' };
      }

      if (payment.orderId !== razorpayOrderId) {
        return { success: false, error: 'Razorpay order mismatch for this payment' };
      }

      const isSignatureValid = razorpayService.verifySignature({
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        signature: razorpaySignature
      });

      if (!isSignatureValid) {
        payment.paymentStatus = 'failed';
        payment.failureReason = 'Invalid Razorpay signature';
        await payment.save();

        return { success: false, error: 'Payment signature verification failed' };
      }

      // Update payment status to processing
      payment.paymentStatus = 'processing';
      payment.transactionId = razorpayPaymentId;

      if (paymentMethod) {
        payment.paymentMethod = paymentMethod;
      }

      payment.paymentGatewayResponse = {
        ...(payment.paymentGatewayResponse || {}),
        provider: 'razorpay',
        razorpayOrderId,
        razorpayPaymentId,
        signatureVerified: true,
        verifiedAt: new Date()
      };

      await payment.save();

      // Payment successful - activate subscription
      await payment.activateSubscription();

      return {
        success: true,
        payment,
        message: 'Payment processed successfully'
      };
    } catch (error) {
      console.error('Error processing payment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(transactionId) {
    try {
      const payment = await Payment.findOne({ transactionId });
      if (!payment) {
        return { success: false, error: 'Payment not found' };
      }

      return {
        success: true,
        payment,
        isActive: payment.isSubscriptionActive
      };
    } catch (error) {
      console.error('Error verifying payment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get active subscription for user
   */
  async getActiveSubscription(userId) {
    try {
      const subscription = await Payment.findActiveSubscription(userId);
      
      if (!subscription) {
        return {
          success: true,
          hasActiveSubscription: false,
          subscription: null
        };
      }

      return {
        success: true,
        hasActiveSubscription: true,
        subscription
      };
    } catch (error) {
      console.error('Error getting active subscription:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user payment history
   */
  async getPaymentHistory(userId, limit = 10) {
    try {
      const payments = await Payment.getUserPaymentHistory(userId, limit);
      
      return {
        success: true,
        payments,
        count: payments.length
      };
    } catch (error) {
      console.error('Error getting payment history:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId) {
    try {
      const subscription = await Payment.findActiveSubscription(userId);
      
      if (!subscription) {
        return {
          success: false,
          error: 'No active subscription found'
        };
      }

      // Get subscription details before deactivating
      const userEmail = subscription.userEmail;
      const userName = subscription.userName;
      const planType = subscription.planType;
      const cancellationDate = new Date();

      await subscription.deactivateSubscription();

      // Send cancellation email to user
      try {
        await sendPaymentCancellationEmail(userEmail, userName, planType, cancellationDate);
      } catch (emailError) {
        console.error('Error sending cancellation email:', emailError);
        // Don't fail the subscription cancellation if email fails
      }
      
      return {
        success: true,
        message: 'Subscription cancelled successfully',
        subscription
      };
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process refund
   */
  async processRefund(transactionId, refundReason) {
    try {
      const payment = await Payment.findOne({ transactionId });
      
      if (!payment) {
        return { success: false, error: 'Payment not found' };
      }

      if (payment.paymentStatus !== 'success') {
        return { success: false, error: 'Cannot refund a non-successful payment' };
      }

      // Process refund
      payment.paymentStatus = 'refunded';
      payment.isActive = false;
      payment.refundDetails = {
        refundId: `REF${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        refundAmount: payment.amount,
        refundDate: new Date(),
        refundReason: refundReason || 'User requested refund'
      };

      await payment.save();

      return {
        success: true,
        message: 'Refund processed successfully',
        payment
      };
    } catch (error) {
      console.error('Error processing refund:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get payment analytics
   */
  async getPaymentAnalytics(userId) {
    try {
      const payments = await Payment.find({ userId });
      
      const analytics = {
        totalPayments: payments.length,
        successfulPayments: payments.filter(p => p.paymentStatus === 'success').length,
        failedPayments: payments.filter(p => p.paymentStatus === 'failed').length,
        totalAmountSpent: payments
          .filter(p => p.paymentStatus === 'success')
          .reduce((sum, p) => sum + p.amount, 0),
        activeSubscription: await Payment.findActiveSubscription(userId)
      };

      return {
        success: true,
        analytics
      };
    } catch (error) {
      console.error('Error getting payment analytics:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new PaymentService();
