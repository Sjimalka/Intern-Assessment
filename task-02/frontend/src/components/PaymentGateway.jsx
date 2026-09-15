// Mock payment gateway terminal with success, decline, and timeout simulation

import React, { useState } from 'react';
import {
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Lock,
  RefreshCcw,
  Zap,
  Info
} from 'lucide-react';

export default function PaymentGateway({
  totalAmount,
  onPay,
  isProcessing,
  paymentError,
  idempotencyKey,
  simulationMode,
  setSimulationMode,
}) {
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardHolder, setCardHolder] = useState('Kamal Perera');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('888');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isProcessing) return; // Prevent accidental double click

    onPay({
      cardNumber: cardNumber.replace(/\s+/g, ''),
      cardHolder,
      expiry,
      cvv,
      method: 'Visa Credit/Debit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Simulation Controls Switcher */}
      <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs uppercase tracking-wider">
            <Zap className="w-4 h-4 text-emerald-600" />
            <span>Gateway Simulation Modes</span>
          </div>
          <span className="text-[11px] text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
            Test Edge Cases
          </span>
        </div>

        <p className="text-xs text-gray-600 leading-relaxed">
          Select how you want the mock payment gateway to respond:
        </p>

        {/* Radio options for simulation */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* 1. Success */}
          <button
            type="button"
            onClick={() => setSimulationMode('SUCCESS')}
            className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
              simulationMode === 'SUCCESS'
                ? 'bg-white border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs'
                : 'bg-white/60 border-emerald-100 hover:bg-white text-gray-600'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Success
              </span>
              {simulationMode === 'SUCCESS' && (
                <div className="w-2 h-2 rounded-full bg-emerald-600" />
              )}
            </div>
            <span className="text-[11px] text-gray-500 mt-1">
              Approve charge & confirm order
            </span>
          </button>

          {/* 2. Failure (Card Declined) */}
          <button
            type="button"
            onClick={() => setSimulationMode('FAILURE')}
            className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
              simulationMode === 'FAILURE'
                ? 'bg-white border-rose-500 ring-2 ring-rose-500/20 shadow-xs'
                : 'bg-white/60 border-emerald-100 hover:bg-white text-gray-600'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Card Declined
              </span>
              {simulationMode === 'FAILURE' && (
                <div className="w-2 h-2 rounded-full bg-rose-600" />
              )}
            </div>
            <span className="text-[11px] text-gray-500 mt-1">
              Simulate insufficient funds / bank decline
            </span>
          </button>

          {/* 3. Timeout */}
          <button
            type="button"
            onClick={() => setSimulationMode('TIMEOUT')}
            className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
              simulationMode === 'TIMEOUT'
                ? 'bg-white border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                : 'bg-white/60 border-emerald-100 hover:bg-white text-gray-600'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Timeout
              </span>
              {simulationMode === 'TIMEOUT' && (
                <div className="w-2 h-2 rounded-full bg-amber-600" />
              )}
            </div>
            <span className="text-[11px] text-gray-500 mt-1">
              Simulate stalled network delay & timeout
            </span>
          </button>
        </div>
      </div>

      {/* Payment Error / Timeout Banner */}
      {paymentError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1.5 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-bold text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Payment Could Not Be Processed</span>
          </div>
          <p className="text-rose-700 leading-relaxed">
            {paymentError}
          </p>
          <div className="text-[11px] text-emerald-800 bg-white/70 p-2 rounded-lg border border-emerald-100 font-medium">
            💡 <strong>Your Stock Is Still Held:</strong> Your reservation hold has not been lost! You can adjust details or switch simulation mode and try again.
          </div>
        </div>
      )}

      {/* Payment Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Card Number */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Card Number (Mock)
          </label>
          <div className="relative">
            <input
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
              required
            />
            <CreditCard className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Cardholder Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Name on Card
          </label>
          <input
            type="text"
            value={cardHolder}
            onChange={(e) => setCardHolder(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
            required
          />
        </div>

        {/* Expiry & CVV */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Expiry Date
            </label>
            <input
              type="text"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              placeholder="MM/YY"
              className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Security CVV
            </label>
            <input
              type="password"
              maxLength={4}
              value={cvv}
              onChange={(e) => setCvv(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
              required
            />
          </div>
        </div>

        {/* Idempotency Protection Indicator */}
        <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-[11px] text-gray-600 space-y-1">
          <div className="flex items-center justify-between font-semibold text-emerald-900">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Duplicate Charge Protection (Idempotency)
            </span>
            <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-emerald-200 text-emerald-700 font-mono">
              Active
            </span>
          </div>
          <div className="flex items-center justify-between text-gray-500 font-mono text-[10px] break-all">
            <span>Key: {idempotencyKey || 'generated-on-load'}</span>
          </div>
          <p className="text-[10.5px] text-gray-500 pt-0.5">
            Guarantees you cannot be charged twice even if the button is pressed repeatedly or connection drops.
          </p>
        </div>

        {/* Pay Button */}
        <button
          type="submit"
          disabled={isProcessing}
          className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>
                {simulationMode === 'TIMEOUT'
                  ? 'Simulating Gateway Delay...'
                  : 'Authorizing with Gateway...'}
              </span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>Authorize & Pay Rs. {Number(totalAmount).toLocaleString()}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
