// formats a number into Sri Lankan Rupees (Rs. / LKR)
export function formatLKR(amount) {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  return 'Rs. ' + num.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
