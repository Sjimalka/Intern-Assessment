// Modal for shipping details, stock hold timer, and payment terminal

import React, { useState } from 'react';
import { X, Clock, ShieldCheck, MapPin, CreditCard, ChevronRight, AlertCircle } from 'lucide-react';
import PaymentGateway from './PaymentGateway';

const SRI_LANKAN_DISTRICTS = [
  'Colombo',
  'Gampaha',
  'Kalutara',
  'Kandy',
  'Matale',
  'Nuwara Eliya',
  'Galle',
  'Matara',
  'Hambantota',
  'Jaffna',
  'Kurunegala',
  'Puttalam',
  'Anuradhapura',
  'Polonnaruwa',
  'Badulla',
  'Ratnapura',
  'Kegalle',
];

export default function CheckoutModal({
  isOpen,
  onClose,
  cartItems,
  reservation,
  reservationSecondsLeft,
  onPay,
  isProcessingPayment,
  paymentError,
  idempotencyKey,
  simulationMode,
  setSimulationMode,
}) {
  const [customer, setCustomer] = useState({
    fullName: 'Dilshan Silva',
    email: 'dilshan@example.lk',
    phone: '+94 77 345 6789',
    address: 'No. 84 Flower Road, Cinnamon Gardens',
    city: 'Colombo 07',
    district: 'Colombo',
    notes: 'Please leave at the reception desk.',
  });

  if (!isOpen) return null;

  // Subtotal & Shipping calculation in LKR
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const shipping = subtotal >= 5000 || subtotal === 0 ? 0 : 350;
  const total = subtotal + shipping;

  // Format timer into MM:SS
  const formatTimer = (seconds) => {
    if (seconds <= 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isExpired = reservationSecondsLeft <= 0;

  const handlePaymentSubmit = (cardDetails) => {
    onPay({
      customer,
      paymentDetails: cardDetails,
    });
  };

  // Close modal when Escape key is pressed
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-emerald-100 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-emerald-100 flex items-center justify-between bg-emerald-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                Secure Checkout & Stock Reservation
              </h2>
              <span className="text-xs text-emerald-800">
                End-to-End Encrypted | Serendib Green Store
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-emerald-100/50 transition-colors"
            aria-label="Close checkout"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Reservation Banner */}
        <div
          className={`px-5 py-3 border-b flex items-center justify-between text-xs transition-colors ${
            isExpired
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock className={`w-4 h-4 ${isExpired ? 'text-rose-600' : 'text-amber-600 animate-pulse'}`} />
            <span>
              {isExpired ? (
                <strong>Hold Expired:</strong>
              ) : (
                <strong>Inventory Hold Active:</strong>
              )}
              {' '}
              {isExpired
                ? 'Your 10-minute hold has expired. Stock may be released.'
                : 'Items in your cart are locked for you. Complete payment before the timer expires.'}
            </span>
          </div>
          <div className="shrink-0 font-mono font-bold text-sm bg-white px-2.5 py-1 rounded-lg border shadow-2xs">
            {formatTimer(reservationSecondsLeft)}
          </div>
        </div>

        {/* Scrollable Content: 2-column layout */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Shipping details & Order summary */}
          <div className="lg:col-span-6 space-y-6">
            {/* Delivery Details Form */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>Delivery Address (Sri Lanka)</span>
              </div>

              <div className="grid grid-cols-1 gap-3 text-xs">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Recipient Full Name</label>
                  <input
                    type="text"
                    value={customer.fullName}
                    onChange={(e) => setCustomer({ ...customer, fullName: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Email</label>
                    <input
                      type="email"
                      value={customer.email}
                      onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={customer.phone}
                      onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Street Address</label>
                  <input
                    type="text"
                    value={customer.address}
                    onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">City / Postal Code</label>
                    <input
                      type="text"
                      value={customer.city}
                      onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">District</label>
                    <select
                      value={customer.district}
                      onChange={(e) => setCustomer({ ...customer, district: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                    >
                      {SRI_LANKAN_DISTRICTS.map(dist => (
                        <option key={dist} value={dist}>{dist}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Reserved Items Summary */}
            <div className="bg-emerald-50/40 rounded-2xl p-4 border border-emerald-100 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                <span>Reserved Items ({cartItems.length})</span>
                <span className="text-emerald-700">Hold ID: {reservation?.id || 'res_demo'}</span>
              </div>

              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {cartItems.map(({ product, quantity }) => (
                  <div key={product.id} className="flex items-center justify-between text-xs gap-3">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-9 h-9 object-cover rounded-lg bg-emerald-100 shrink-0"
                      />
                      <span className="text-gray-800 font-medium truncate">
                        {quantity}x {product.name}
                      </span>
                    </div>
                    <span className="font-semibold text-emerald-950 shrink-0">
                      Rs. {(product.price * quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              {/* Price summary */}
              <div className="pt-3 border-t border-emerald-100 text-xs space-y-1">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>Rs. {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Islandwide Delivery</span>
                  <span>{shipping === 0 ? 'FREE' : `Rs. ${shipping.toLocaleString()}`}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-emerald-950 pt-1">
                  <span>Total Amount Due</span>
                  <span className="text-emerald-700">Rs. {total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Payment Gateway Simulation */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-emerald-100 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs uppercase tracking-wider mb-4">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Mock Payment Gateway Terminal</span>
              </div>

              <PaymentGateway
                totalAmount={total}
                onPay={handlePaymentSubmit}
                isProcessing={isProcessingPayment}
                paymentError={paymentError}
                idempotencyKey={idempotencyKey}
                simulationMode={simulationMode}
                setSimulationMode={setSimulationMode}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
