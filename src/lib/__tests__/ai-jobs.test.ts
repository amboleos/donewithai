import { getPeriod, calculatePoints } from '../ai-jobs';

describe('AI Jobs', () => {
  describe('getPeriod', () => {
    test('Q1 dates', () => {
      expect(getPeriod(new Date('2025-01-15'))).toBe('2025-Q1');
      expect(getPeriod(new Date('2025-02-28'))).toBe('2025-Q1');
      expect(getPeriod(new Date('2025-03-31'))).toBe('2025-Q1');
    });
    test('Q2 dates', () => {
      expect(getPeriod(new Date('2025-04-01'))).toBe('2025-Q2');
      expect(getPeriod(new Date('2025-05-15'))).toBe('2025-Q2');
      expect(getPeriod(new Date('2025-06-30'))).toBe('2025-Q2');
    });
    test('Q3 dates', () => {
      expect(getPeriod(new Date('2025-07-01'))).toBe('2025-Q3');
      expect(getPeriod(new Date('2025-08-15'))).toBe('2025-Q3');
      expect(getPeriod(new Date('2025-09-30'))).toBe('2025-Q3');
    });
    test('Q4 dates', () => {
      expect(getPeriod(new Date('2025-10-01'))).toBe('2025-Q4');
      expect(getPeriod(new Date('2025-11-15'))).toBe('2025-Q4');
      expect(getPeriod(new Date('2025-12-31'))).toBe('2025-Q4');
    });
  });

  describe('calculatePoints', () => {
    test('rounds down correctly', () => {
      expect(calculatePoints(615, 0)).toBe(3);  // 615 / 200 = 3.075 -> 3
      expect(calculatePoints(199, 0)).toBe(0);  // Below threshold
      expect(calculatePoints(200, 0)).toBe(1);  // Exactly threshold
      expect(calculatePoints(100, 100)).toBe(1); // Combined
    });
  });
});
