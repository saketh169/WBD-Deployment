const Razorpay = require('razorpay');
const crypto = require('crypto');

class RazorpayService {
  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID;
    this.keySecret = process.env.RAZORPAY_KEY_SECRET;
    this.client = null;

    if (this.keyId && this.keySecret) {
      this.client = new Razorpay({
        key_id: this.keyId,
        key_secret: this.keySecret
      });
    }
  }

  isConfigured() {
    return Boolean(this.client && this.keyId && this.keySecret);
  }

  getPublicKey() {
    return this.keyId;
  }

  assertConfigured() {
    if (!this.isConfigured()) {
      throw new Error('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
    }
  }

  async createOrder({ amount, currency = 'INR', receipt, notes = {} }) {
    this.assertConfigured();

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Invalid amount for Razorpay order');
    }

    return this.client.orders.create({
      amount,
      currency,
      receipt,
      notes
    });
  }

  verifySignature({ orderId, paymentId, signature }) {
    if (!this.keySecret || !orderId || !paymentId || !signature) {
      return false;
    }

    const payload = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(payload)
      .digest('hex');

    return expectedSignature === signature;
  }
}

module.exports = new RazorpayService();