// Frontend Utilities & Helpers Tests
import { describe, it, expect, beforeEach } from 'vitest';

// Mock utility functions
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePhone = (phone) => /^[0-9]{10}$/.test(phone);
const formatDate = (date) => new Date(date).toLocaleDateString();
const parseJSON = (str) => { try { return JSON.parse(str); } catch { return null; } };
const debounce = (fn, delay) => { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); }; };
const truncateText = (text, length) => text.length > length ? text.substring(0, length) + '...' : text;
const camelToSnake = (str) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const snakeToCamel = (str) => str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());

describe('Email Validation', () => {
  it('should accept valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('should reject email without @', () => {
    expect(validateEmail('userexample.com')).toBe(false);
  });

  it('should reject email without domain', () => {
    expect(validateEmail('user@.com')).toBe(false);
  });

  it('should reject spaces in email', () => {
    expect(validateEmail('user @example.com')).toBe(false);
  });

  it('should accept multiple domain levels', () => {
    expect(validateEmail('user@example.co.uk')).toBe(true);
  });
});

describe('Phone Validation', () => {
  it('should accept 10 digit phone', () => {
    expect(validatePhone('9876543210')).toBe(true);
  });

  it('should reject short phone', () => {
    expect(validatePhone('98765')).toBe(false);
  });

  it('should reject non-numeric phone', () => {
    expect(validatePhone('987654321a')).toBe(false);
  });

  it('should reject letters in phone', () => {
    expect(validatePhone('98765432ab')).toBe(false);
  });
});

describe('Date Formatting', () => {
  it('should format date correctly', () => {
    const result = formatDate('2026-06-15');
    expect(result).toContain('2026');
  });

  it('should format valid date', () => {
    expect(formatDate('2026-01-01')).toBeDefined();
  });
});

describe('JSON Parsing', () => {
  it('should parse valid JSON', () => {
    const result = parseJSON('{"key": "value"}');
    expect(result).toEqual({ key: 'value' });
  });

  it('should return null for invalid JSON', () => {
    expect(parseJSON('not json')).toBeNull();
  });

  it('should parse array', () => {
    expect(parseJSON('[1,2,3]')).toEqual([1,2,3]);
  });
});

describe('Debounce Function', () => {
  it('should be a function', () => {
    expect(typeof debounce(() => {}, 100)).toBe('function');
  });

  it('should debounce multiple calls', async () => {
    let count = 0;
    const fn = debounce(() => { count++; }, 100);
    fn();
    fn();
    fn();
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(count).toBe(1);
  });
});

describe('Text Truncation', () => {
  it('should truncate long text', () => {
    const result = truncateText('Hello World This is Long Text', 5);
    expect(result).toBe('Hello...');
  });

  it('should not truncate short text', () => {
    expect(truncateText('Hi', 5)).toBe('Hi');
  });

  it('should truncate at exact boundary', () => {
    const result = truncateText('12345678', 5);
    expect(result).toBe('12345...');
  });
});

describe('Case Conversion', () => {
  it('should convert camel to snake', () => {
    expect(camelToSnake('firstName')).toBe('first_name');
  });

  it('should convert snake to camel', () => {
    expect(snakeToCamel('first_name')).toBe('firstName');
  });

  it('should handle multiple words camel to snake', () => {
    expect(camelToSnake('firstName LastName')).toBe('first_name _last_name');
  });

  it('should handle multiple underscores', () => {
    expect(snakeToCamel('first_name_last')).toBe('firstNameLast');
  });
});
