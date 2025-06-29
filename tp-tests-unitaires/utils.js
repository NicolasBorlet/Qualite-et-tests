function sum(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new Error('Les arguments doivent être des nombres');
  }
  return a + b;
}

function isPalindrome(str) {
  if (typeof str !== 'string') {
    return false;
  }
  // ignore la casse et les espaces
  const clean = str.toLowerCase().replace(/\s/g, '');
  return clean === clean.split('').reverse().join('');
}

function getMax(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return Math.max(...arr);
}

function capitalize(str) {
  if (typeof str !== 'string') {
    return '';
  }
  if (!str) return '';
  return str[0].toUpperCase() + str.slice(1).toLowerCase();
}

function divide(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new Error('Les arguments doivent être des nombres');
  }
  if (b === 0) throw new Error("Division by zero");
  return a / b;
}

function isPrime(num) {
  if (typeof num !== 'number') {
    return false;
  }
  if (num <= 1) return false;

  if (num === 2) return true;

  if (num % 2 === 0) return false;

  for (let i = 3; i <= Math.sqrt(num); i += 2) {
    if (num % i === 0) return false;
  }

  return true;
}

module.exports = {
  sum,
  isPalindrome,
  getMax,
  capitalize,
  divide,
  isPrime
};
