const { sum, isPalindrome, getMax, capitalize, divide, isPrime } = require('./utils');

describe('sum', () => {
  test('additionne deux nombres positifs', () => {
    expect(sum(2, 3)).toBe(5);
  });

  test('additionne un nombre positif et un nombre négatif', () => {
    expect(sum(5, -3)).toBe(2);
  });

  test('additionne deux nombres négatifs', () => {
    expect(sum(-2, -3)).toBe(-5);
  });

  test('gère les arguments non numériques', () => {
    expect(() => sum('a', 2)).toThrow('Les arguments doivent être des nombres');
    expect(() => sum(2, 'b')).toThrow('Les arguments doivent être des nombres');
    expect(() => sum('a', 'b')).toThrow('Les arguments doivent être des nombres');
    expect(() => sum([1, 2], 3)).toThrow('Les arguments doivent être des nombres');
    expect(() => sum({}, 3)).toThrow('Les arguments doivent être des nombres');
    expect(() => sum(null, 3)).toThrow('Les arguments doivent être des nombres');
    expect(() => sum(undefined, 3)).toThrow('Les arguments doivent être des nombres');
  });
});

describe('isPalindrome', () => {
  test('reconnaît un palindrome simple', () => {
    expect(isPalindrome('radar')).toBe(true);
  });

  test('reconnaît un palindrome avec espaces', () => {
    expect(isPalindrome('kayak kayak')).toBe(true);
  });

  test('reconnaît un palindrome avec majuscules', () => {
    expect(isPalindrome('Radar')).toBe(true);
  });

  test('reconnaît un non-palindrome', () => {
    expect(isPalindrome('hello')).toBe(false);
  });

  test('gère une chaîne vide', () => {
    expect(isPalindrome('')).toBe(true);
  });

  test('gère les arguments non-chaînes', () => {
    expect(isPalindrome(123)).toBe(false);
    expect(isPalindrome(null)).toBe(false);
    expect(isPalindrome(undefined)).toBe(false);
  });
});

describe('getMax', () => {
  test('trouve le maximum dans un tableau de nombres', () => {
    expect(getMax([1, 5, 3, 9, 2])).toBe(9);
  });

  test('gère un tableau avec des nombres négatifs', () => {
    expect(getMax([-1, -5, -3, -9, -2])).toBe(-1);
  });

  test('retourne null pour un tableau vide', () => {
    expect(getMax([])).toBe(null);
  });

  test('retourne null pour un argument non-tableau', () => {
    expect(getMax('not an array')).toBe(null);
  });

  test('gère les arguments non-tableau', () => {
    expect(getMax('not an array')).toBe(null);
    expect(getMax(123)).toBe(null);
    expect(getMax(null)).toBe(null);
    expect(getMax(undefined)).toBe(null);
  });
});

describe('capitalize', () => {
  test('met en majuscule la première lettre', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  test('met en minuscule le reste de la chaîne', () => {
    expect(capitalize('HELLO')).toBe('Hello');
  });

  test('gère une chaîne vide', () => {
    expect(capitalize('')).toBe('');
  });

  test('gère une chaîne null ou undefined', () => {
    expect(capitalize(null)).toBe('');
    expect(capitalize(undefined)).toBe('');
  });

  test('gère les arguments non-chaînes', () => {
    expect(capitalize(123)).toBe('');
    expect(capitalize(null)).toBe('');
    expect(capitalize(undefined)).toBe('');
  });
});

describe('divide', () => {
  test('divise deux nombres positifs', () => {
    expect(divide(10, 2)).toBe(5);
  });

  test('divise un nombre positif par un nombre négatif', () => {
    expect(divide(10, -2)).toBe(-5);
  });

  test('divise un nombre négatif par un nombre négatif', () => {
    expect(divide(-10, -2)).toBe(5);
  });

  test('gère la division par zéro', () => {
    expect(() => divide(4, 0)).toThrow("Division by zero");
  });

  test('gère les arguments non-numériques', () => {
    expect(() => divide('a', 2)).toThrow('Les arguments doivent être des nombres');
    expect(() => divide(2, 'b')).toThrow('Les arguments doivent être des nombres');
    expect(() => divide('a', 'b')).toThrow('Les arguments doivent être des nombres');
  });
});

describe('isPrime', () => {
  test('identifie les nombres premiers', () => {
    expect(isPrime(2)).toBe(true);
    expect(isPrime(3)).toBe(true);
    expect(isPrime(5)).toBe(true);
    expect(isPrime(7)).toBe(true);
    expect(isPrime(11)).toBe(true);
    expect(isPrime(13)).toBe(true);
    expect(isPrime(17)).toBe(true);
  });

  test('identifie les nombres non premiers', () => {
    expect(isPrime(4)).toBe(false);
    expect(isPrime(6)).toBe(false);
    expect(isPrime(8)).toBe(false);
    expect(isPrime(9)).toBe(false);
    expect(isPrime(10)).toBe(false);
    expect(isPrime(12)).toBe(false);
    expect(isPrime(15)).toBe(false);
  });

  test('gère les cas limites', () => {
    expect(isPrime(0)).toBe(false);
    expect(isPrime(1)).toBe(false);
    expect(isPrime(-1)).toBe(false);
    expect(isPrime(-2)).toBe(false);
  });

  test('gère les grands nombres premiers', () => {
    expect(isPrime(97)).toBe(true);
    expect(isPrime(101)).toBe(true);
    expect(isPrime(997)).toBe(true);
  });
});
