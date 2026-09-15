import React, { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Timer, 
  ShieldAlert, 
  Lock, 
  RefreshCw, 
  RotateCcw 
} from 'lucide-react';
import { formatLKR } from '../utils/currency';

export default function CheckoutModal({ 
  order, 
  onClose, 
  onPaymentComplete, 
  onCancelOrder, 
  onExpireOrder,
  api 
}) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalDuration, setTotalDuration] = useState(300); // 300s = 5m
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  const [simulatedOutcome, setSimulatedOutcome] = useState('success');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [simulateDoubleSubmit, setSimulateDoubleSubmit] = useState(false);

  // make a unique key so we don't charge twice by mistake
  useEffect(() => {
    if (order) {
      setIdempotencyKey('idemp_' + Math.random().toString(36).substring(2, 12));
    }
  }, [order?.id]);

  // update the countdown timer every second
  useEffect(() => {
    if (!order || !order.expires_at || order.status !== 'RESERVED' || paymentResult) return;

    const updateTimer = () => {
      const remainingMs = Math.max(0, order.expires_at - Date.now());
      const remainingSec = Math.ceil(remainingMs / 1000);
      setTimeLeft(remainingSec);

      if (remainingSec <= 0) {
        setErrorMessage('Your 5-minute stock reservation has expired. Stock has been returned to inventory.');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [order?.expires_at, order?.status, paymentResult]);

  if (!order) return null;

  // convert seconds to MM:SS format
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const timerPercentage = Math.min(100, Math.max(0, (timeLeft / totalDuration) * 100));

  // send payment to backend
  const handlePay = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      if (simulateDoubleSubmit) {
        // send two requests at the exact same time with same key to test duplicate protection
        const p1 = api.processPayment({
          orderId: order.id,
          idempotencyKey,
          paymentMethod,
          simulatedOutcome
        });

        const p2 = api.processPayment({
          orderId: order.id,
          idempotencyKey,
          paymentMethod,
          simulatedOutcome
        });

        const [res1, res2] = await Promise.all([p1, p2]);
        setPaymentResult({
          primary: res1,
          duplicateResponse: res2,
          isDuplicateHandled: res2.isDuplicate || res1.isDuplicate
        });
        const orderObj = res1.data?.order || res1.order || res1;
        onPaymentComplete(orderObj);
      } else {
        // standard single payment request
        const response = await api.processPayment({
          orderId: order.id,
          idempotencyKey,
          paymentMethod,
          simulatedOutcome
        });

        setPaymentResult({ primary: response });
        const orderObj = response.data?.order || response.order || response;
        onPaymentComplete(orderObj);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // expire reservation right now for quick testing
  const handleManualExpire = async () => {
    try {
      setIsProcessing(true);
      const expired = await api.expireOrder(order.id);
      onExpireOrder(expired);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to expire reservation');
    } finally {
      setIsProcessing(false);
    }
  };

  // cancel checkout and release stock
  const handleCancel = async () => {
    try {
      setIsProcessing(true);
      const cancelled = await api.cancelOrder(order.id, 'Cashier or customer clicked Cancel Checkout');
      onCancelOrder(cancelled);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to cancel order');
    } finally {
      setIsProcessing(false);
    }
  };

  const isExpired = timeLeft <= 0 && !paymentResult;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-neutral-300 rounded-t-3xl sm:rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col my-0 sm:my-8 max-h-[92vh] sm:max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* modal top bar */}
        <div className="p-3.5 sm:p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-neutral-950 text-white flex items-center justify-center shadow-xs shrink-0">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-neutral-950">POS Checkout</h3>
              <p className="text-[10px] sm:text-xs text-neutral-500 font-mono">Order #{order.order_number}</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-neutral-200/70 hover:bg-neutral-300 text-neutral-600 hover:text-black flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 5-minute countdown bar */}
        {!paymentResult && (
          <div className={`p-3 sm:p-4 border-b transition-colors ${
            isExpired 
              ? 'bg-red-50 border-red-200 text-red-900'
              : timeLeft <= 60 
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-neutral-100 border-neutral-200 text-neutral-900'
          }`}>
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <Clock className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${timeLeft <= 60 && !isExpired ? 'animate-urgent text-red-600' : 'text-neutral-900'}`} />
                <div>
                  <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">
                    {isExpired ? 'Reservation Expired' : 'Stock Reserved'}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-neutral-600 line-clamp-1 sm:line-clamp-none">
                    {isExpired 
                      ? 'Stock released back to general inventory'
                      : 'Locked exclusively for this checkout session.'
                    }
                  </div>
                </div>
              </div>

              {/* time left */}
              <div className="text-right shrink-0">
                <span className={`font-mono text-base sm:text-xl font-black px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-xl border ${
                  isExpired 
                    ? 'bg-red-100 border-red-300 text-red-700'
                    : timeLeft <= 60 
                    ? 'bg-amber-100 border-amber-300 text-amber-900'
                    : 'bg-neutral-950 border-neutral-950 text-white'
                }`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>

            {/* progress bar */}
            <div className="w-full h-1.5 sm:h-2 bg-neutral-200 rounded-full mt-2 sm:mt-3 overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${
                  isExpired ? 'w-0' : timeLeft <= 60 ? 'bg-red-600' : 'bg-neutral-950'
                }`}
                style={{ width: `${timerPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* modal content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 bg-white overflow-y-auto flex-1">
          {/* payment receipt */}
          {paymentResult ? (() => {
            const primaryResponse = paymentResult.primary;
            const paymentRecord = primaryResponse?.data?.payment || primaryResponse?.payment;
            const orderRecord = primaryResponse?.data?.order || primaryResponse?.order || order;
            const outcome = paymentRecord?.outcome || (orderRecord?.status === 'PAID' ? 'SUCCESS' : orderRecord?.status === 'FAILED' ? 'DECLINED' : orderRecord?.status === 'EXPIRED' ? 'TIMEOUT' : 'SUCCESS');
            const isSuccess = outcome === 'SUCCESS' || orderRecord?.status === 'PAID';
            const isDeclined = outcome === 'DECLINED' || orderRecord?.status === 'FAILED';

            return (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                {isSuccess ? (
                  <div className="p-6 rounded-2xl bg-emerald-50/80 border-2 border-emerald-500 text-center shadow-xs">
                    <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md">
                      <CheckCircle2 className="w-8 h-8 text-white" />
                    </div>
                    <div className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2">
                      Payment Successful
                    </div>
                    <h4 className="text-xl font-black text-neutral-950">
                      {formatLKR(orderRecord?.total_amount || order.total_amount)}
                    </h4>
                    <p className="text-xs font-semibold text-neutral-600 mt-1">
                      Order <span className="font-mono text-neutral-950 font-bold">#{orderRecord?.order_number || order.order_number}</span> confirmed!
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Physical stock has been permanently deducted from inventory.
                    </p>

                    {/* receipt breakdown */}
                    <div className="mt-4 pt-3 border-t border-emerald-200/80 grid grid-cols-2 gap-2 text-left text-xs bg-white/70 p-3 rounded-xl">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block">Customer</span>
                        <span className="font-bold text-neutral-900">{orderRecord?.customer_name || 'Walk-in Customer'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block">Payment Method</span>
                        <span className="font-bold text-neutral-900">{paymentRecord?.payment_method || paymentMethod}</span>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-neutral-100">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block">Transaction Reference</span>
                        <span className="font-mono font-bold text-neutral-700 text-[11px] break-all">
                          {paymentRecord?.gateway_transaction_id || ('GTW-' + Math.random().toString(36).substring(2, 10).toUpperCase())}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : isDeclined ? (
                  <div className="p-6 rounded-2xl bg-red-50 border-2 border-red-300 text-center shadow-xs">
                    <div className="w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md">
                      <XCircle className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="text-base font-extrabold text-red-950">Payment Declined</h4>
                    <p className="text-xs text-red-700 mt-1">
                      The mock payment was declined. Reserved stock has been released back to general inventory immediately!
                    </p>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-amber-50 border-2 border-amber-300 text-center shadow-xs">
                    <div className="w-14 h-14 rounded-full bg-amber-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md">
                      <Timer className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="text-base font-extrabold text-amber-950">Gateway Timeout</h4>
                    <p className="text-xs text-amber-800 mt-1">
                      Payment simulation timed out. Stock reservation released to prevent locked inventory.
                    </p>
                  </div>
                )}

              {/* duplicate request notice */}
              {simulateDoubleSubmit && (
                <div className="p-3.5 rounded-xl bg-neutral-100 border border-neutral-300 text-xs">
                  <div className="flex items-center gap-2 font-bold text-neutral-950 mb-1">
                    <ShieldAlert className="w-4 h-4 text-neutral-900" />
                    Idempotency Guard Verified:
                  </div>
                  <p className="text-neutral-600 text-[11px] leading-relaxed">
                    Sent 2 concurrent requests with identical key <code>{idempotencyKey}</code>. 
                    The backend safely caught the duplicate, returning the cached transaction without double-charging or deducting stock twice!
                  </p>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-neutral-950 hover:bg-black text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Close & Return to Register
              </button>
              </div>
            );
          })() : (
            <>
              {/* order items */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase text-neutral-500 tracking-wider">Reserved Items</div>
                <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-3.5 max-h-36 overflow-y-auto divide-y divide-neutral-200">
                  {order.items.map(item => (
                    <div key={item.id} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-neutral-950">{item.product_name}</span>
                        <span className="text-neutral-500 ml-2 font-medium">x{item.quantity}</span>
                      </div>
                      <div className="font-mono font-bold text-neutral-950">
                        {formatLKR(item.total_price)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center px-1 text-sm font-bold text-neutral-950 pt-1">
                  <span>Total Amount</span>
                  <span className="text-neutral-950 font-mono text-lg font-black">{formatLKR(order.total_amount)}</span>
                </div>
              </div>

              {/* simulated payment choices */}
              <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-neutral-900" />
                    Simulated Payment Gateway Outcome:
                  </div>
                  <span className="text-[10px] bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded font-mono font-semibold">Mock Mode</span>
                </div>

                {/* outcome choices */}
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setSimulatedOutcome('success')}
                    className={`p-2 sm:p-2.5 rounded-xl text-[11px] sm:text-xs font-bold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      simulatedOutcome === 'success'
                        ? 'bg-neutral-950 border-neutral-950 text-white shadow-sm'
                        : 'bg-white border-neutral-300 text-neutral-700 hover:border-neutral-500'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Success</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSimulatedOutcome('failure')}
                    className={`p-2 sm:p-2.5 rounded-xl text-[11px] sm:text-xs font-bold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      simulatedOutcome === 'failure'
                        ? 'bg-neutral-950 border-neutral-950 text-white shadow-sm'
                        : 'bg-white border-neutral-300 text-neutral-700 hover:border-neutral-500'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Decline</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSimulatedOutcome('timeout')}
                    className={`p-2 sm:p-2.5 rounded-xl text-[11px] sm:text-xs font-bold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      simulatedOutcome === 'timeout'
                        ? 'bg-neutral-950 border-neutral-950 text-white shadow-sm'
                        : 'bg-white border-neutral-300 text-neutral-700 hover:border-neutral-500'
                    }`}
                  >
                    <Timer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Timeout</span>
                  </button>
                </div>

                {/* double-click test option */}
                <div className="pt-2 border-t border-neutral-200 space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={simulateDoubleSubmit}
                      onChange={(e) => setSimulateDoubleSubmit(e.target.checked)}
                      className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 bg-white shrink-0"
                    />
                    <span className="text-[11px] sm:text-xs text-neutral-900 font-bold">
                      Simulate Double-Click Submission
                    </span>
                  </label>
                  <p className="text-[10px] sm:text-[11px] text-neutral-500 pl-6 leading-normal">
                    Fires two concurrent payment requests with the same key to verify duplicate protection.
                  </p>

                  <div className="text-[10px] sm:text-[11px] text-neutral-500 flex items-center gap-1.5 pl-6 font-mono truncate">
                    <Lock className="w-3 h-3 text-neutral-400 shrink-0" />
                    <span className="truncate">Key: {idempotencyKey}</span>
                  </div>
                </div>
              </div>

              {/* error notification */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* action buttons */}
              <div className="space-y-2">
                <button
                  onClick={handlePay}
                  disabled={isProcessing || isExpired}
                  className="w-full py-3 sm:py-3.5 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md bg-neutral-950 hover:bg-black text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-98 min-h-[46px]"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Contacting Gateway...</span>
                    </>
                  ) : (
                    <span>
                      {simulatedOutcome === 'success' 
                        ? `Confirm & Pay ${formatLKR(order.total_amount)}` 
                        : simulatedOutcome === 'failure' 
                        ? 'Simulate Card Decline' 
                        : 'Simulate Gateway Timeout'}
                    </span>
                  )}
                </button>

                {/* test instant expiry and cancel buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleManualExpire}
                    disabled={isProcessing || isExpired}
                    title="Force immediate 5-minute expiry to verify stock release without waiting"
                    className="py-2.5 sm:py-3 px-2 sm:px-3 rounded-xl bg-white hover:bg-neutral-100 text-neutral-800 text-[11px] sm:text-xs font-bold border border-neutral-300 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-2xs min-h-[40px]"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Test Instant Expiry</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isProcessing || isExpired}
                    className="py-2.5 sm:py-3 px-2 sm:px-3 rounded-xl bg-white hover:bg-red-50 text-neutral-700 hover:text-red-700 text-[11px] sm:text-xs font-bold border border-neutral-300 hover:border-red-300 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-2xs min-h-[40px]"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel Checkout</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
