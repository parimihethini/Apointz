import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { showToast } from "./ToastHost";

const PaymentModal = ({ isOpen, onClose, onPaymentSuccess, bookingDetails, amount = 500 }) => {
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [cardDetails, setCardDetails] = useState({
    cardNumber: "",
    cardHolder: "",
    expiryDate: "",
    cvv: "",
  });
  const [upiId, setUpiId] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleCardChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === "cardNumber") {
      // Format as XXXX XXXX XXXX XXXX
      formattedValue = value.replace(/\s/g, "").replace(/(\d{4})/g, "$1 ").trim();
    } else if (name === "expiryDate") {
      // Format as MM/YY
      formattedValue = value.replace(/\D/g, "").slice(0, 4);
      if (formattedValue.length >= 2) {
        formattedValue = formattedValue.slice(0, 2) + "/" + formattedValue.slice(2);
      }
    } else if (name === "cvv") {
      // Only numbers, max 4
      formattedValue = value.replace(/\D/g, "").slice(0, 4);
    }

    setCardDetails({ ...cardDetails, [name]: formattedValue });
  };

  const validateCardDetails = () => {
    if (!cardDetails.cardNumber || cardDetails.cardNumber.replace(/\s/g, "").length !== 16) {
      showToast("Please enter a valid 16-digit card number.", "error");
      return false;
    }
    if (!cardDetails.cardHolder.trim()) {
      showToast("Please enter cardholder name.", "error");
      return false;
    }
    if (!cardDetails.expiryDate || cardDetails.expiryDate.length !== 5) {
      showToast("Please enter expiry date as MM/YY.", "error");
      return false;
    }
    if (!cardDetails.cvv || cardDetails.cvv.length < 3) {
      showToast("Please enter a valid CVV.", "error");
      return false;
    }
    return true;
  };

  const validateUPI = () => {
    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$/;
    if (!upiRegex.test(upiId)) {
      showToast("Please enter a valid UPI ID (e.g., yourname@bankname).", "error");
      return false;
    }
    return true;
  };

  const handleProcessPayment = async () => {
    // Validate input
    if (paymentMethod === "card" && !validateCardDetails()) return;
    if (paymentMethod === "upi" && !validateUPI()) return;

    setProcessing(true);

    try {
      // Simulate payment processing
      // In real implementation, integrate with Razorpay, Stripe, or other payment gateway
      await new Promise((resolve) => setTimeout(resolve, 1500));

      showToast("Payment successful! Booking your appointment...", "success");

      // Call parent callback with payment method
      if (onPaymentSuccess) {
        onPaymentSuccess({
          method: paymentMethod,
          amount: amount,
          status: "paid",
          details: paymentMethod === "card" ? cardDetails.cardNumber.slice(-4) : upiId,
        });
      }

      // Reset form
      setCardDetails({ cardNumber: "", cardHolder: "", expiryDate: "", cvv: "" });
      setUpiId("");
    } catch (error) {
      showToast("Payment failed. Please try again.", "error");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="modal-backdrop-modern payment-backdrop"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            className="modal-modern glass-card payment-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="payment-modal-header">
              <h2>💳 Secure Payment</h2>
              <button
                className="btn-close-modal"
                onClick={onClose}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#fff",
                }}
              >
                ✕
              </button>
            </div>

            {/* Booking Summary */}
            {bookingDetails && (
              <div className="payment-booking-summary glass-card" style={{ marginBottom: "20px" }}>
                <h4 style={{ margin: "0 0 12px 0" }}>Booking Details</h4>
                <div style={{ fontSize: "14px" }}>
                  <p style={{ margin: "6px 0" }}>
                    <strong>Business:</strong> {bookingDetails.businessName}
                  </p>
                  <p style={{ margin: "6px 0" }}>
                    <strong>Date:</strong> {bookingDetails.date}
                  </p>
                  <p style={{ margin: "6px 0" }}>
                    <strong>Time:</strong> {bookingDetails.time}
                  </p>
                  <hr style={{ margin: "12px 0", opacity: 0.3 }} />
                  <p style={{ margin: "6px 0", fontSize: "16px", fontWeight: "bold" }}>
                    <strong>Amount to Pay:</strong> ₹{amount}
                  </p>
                </div>
              </div>
            )}

            {/* Payment Method Tabs */}
            <div className="payment-method-tabs">
              <button
                className={`payment-tab ${paymentMethod === "card" ? "active" : ""}`}
                onClick={() => setPaymentMethod("card")}
              >
                💳 Credit/Debit Card
              </button>
              <button
                className={`payment-tab ${paymentMethod === "upi" ? "active" : ""}`}
                onClick={() => setPaymentMethod("upi")}
              >
                📱 UPI
              </button>
              <button
                className={`payment-tab ${paymentMethod === "wallet" ? "active" : ""}`}
                onClick={() => setPaymentMethod("wallet")}
              >
                🏦 Digital Wallet
              </button>
            </div>

            {/* Payment Form */}
            <div className="payment-form">
              {paymentMethod === "card" && (
                <div className="payment-form-card">
                  <div className="form-group-modern">
                    <label>Cardholder Name</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      className="form-input-modern"
                      value={cardDetails.cardHolder}
                      onChange={handleCardChange}
                      name="cardHolder"
                    />
                  </div>

                  <div className="form-group-modern">
                    <label>Card Number</label>
                    <input
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      className="form-input-modern"
                      value={cardDetails.cardNumber}
                      onChange={handleCardChange}
                      name="cardNumber"
                      maxLength="19"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group-modern">
                      <label>Expiry Date</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        className="form-input-modern"
                        value={cardDetails.expiryDate}
                        onChange={handleCardChange}
                        name="expiryDate"
                        maxLength="5"
                      />
                    </div>
                    <div className="form-group-modern">
                      <label>CVV</label>
                      <input
                        type="text"
                        placeholder="123"
                        className="form-input-modern"
                        value={cardDetails.cvv}
                        onChange={handleCardChange}
                        name="cvv"
                        maxLength="4"
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === "upi" && (
                <div className="payment-form-upi">
                  <div className="form-group-modern">
                    <label>UPI ID</label>
                    <input
                      type="text"
                      placeholder="yourname@bankname"
                      className="form-input-modern"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                    />
                  </div>
                  <p className="info-text" style={{ fontSize: "12px", margin: "8px 0", opacity: 0.7 }}>
                    ℹ️ You'll be redirected to your UPI app to complete the payment.
                  </p>
                </div>
              )}

              {paymentMethod === "wallet" && (
                <div className="payment-form-wallet">
                  <div
                    style={{
                      background: "rgba(100, 200, 255, 0.1)",
                      padding: "16px",
                      borderRadius: "8px",
                      textAlign: "center",
                    }}
                  >
                    <p style={{ margin: "8px 0" }}>
                      🏦 <strong>Available Wallets</strong>
                    </p>
                    <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", marginTop: "12px" }}>
                      <button
                        className="wallet-option"
                        onClick={() => {
                          showToast("Google Pay selected", "info");
                        }}
                      >
                        Google Pay
                      </button>
                      <button
                        className="wallet-option"
                        onClick={() => {
                          showToast("Apple Pay selected", "info");
                        }}
                      >
                        Apple Pay
                      </button>
                      <button
                        className="wallet-option"
                        onClick={() => {
                          showToast("Paytm selected", "info");
                        }}
                      >
                        Paytm
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Security Info */}
            <div
              style={{
                fontSize: "12px",
                opacity: 0.6,
                marginTop: "16px",
                paddingTop: "12px",
                borderTop: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              🔒 Your payment is secure and encrypted. We never store full card details.
            </div>

            {/* Action Buttons */}
            <div className="modal-actions-modern" style={{ marginTop: "24px" }}>
              <button className="btn-outline-modern" onClick={onClose} disabled={processing}>
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-primary"
                onClick={handleProcessPayment}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <span className="spinner-mini"></span> Processing...
                  </>
                ) : (
                  `Pay ₹${amount}`
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PaymentModal;
