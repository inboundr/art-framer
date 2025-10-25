import { cn } from '../utils';

describe('Utils - cn function', () => {
  describe('Basic functionality', () => {
    it('should combine class names', () => {
      const result = cn('class1', 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should handle single class name', () => {
      const result = cn('single-class');
      expect(result).toBe('single-class');
    });

    it('should handle empty strings', () => {
      const result = cn('', 'class1', '');
      expect(result).toBe('class1');
    });

    it('should handle undefined values', () => {
      const result = cn('class1', undefined, 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should handle null values', () => {
      const result = cn('class1', null, 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should handle mixed types', () => {
      const result = cn('class1', undefined, 'class2', null, 'class3');
      expect(result).toBe('class1 class2 class3');
    });
  });

  describe('Conditional classes', () => {
    it('should handle conditional classes with boolean', () => {
      const result = cn('base', true && 'conditional');
      expect(result).toBe('base conditional');
    });

    it('should handle conditional classes with false', () => {
      const result = cn('base', false && 'conditional');
      expect(result).toBe('base');
    });

    it('should handle conditional classes with ternary', () => {
      const result = cn('base', true ? 'true-class' : 'false-class');
      expect(result).toBe('base true-class');
    });

    it('should handle conditional classes with ternary false', () => {
      const result = cn('base', false ? 'true-class' : 'false-class');
      expect(result).toBe('base false-class');
    });
  });

  describe('Object-based classes', () => {
    it('should handle object with boolean values', () => {
      const result = cn({
        'class1': true,
        'class2': false,
        'class3': true
      });
      expect(result).toBe('class1 class3');
    });

    it('should handle object with mixed values', () => {
      const result = cn({
        'class1': true,
        'class2': false,
        'class3': undefined,
        'class4': null
      });
      expect(result).toBe('class1');
    });
  });

  describe('Array-based classes', () => {
    it('should handle array of strings', () => {
      const result = cn(['class1', 'class2', 'class3']);
      expect(result).toBe('class1 class2 class3');
    });

    it('should handle array with undefined values', () => {
      const result = cn(['class1', undefined, 'class2']);
      expect(result).toBe('class1 class2');
    });

    it('should handle nested arrays', () => {
      const result = cn(['class1', ['class2', 'class3']]);
      expect(result).toBe('class1 class2 class3');
    });
  });

  describe('Complex combinations', () => {
    it('should handle complex combinations', () => {
      const result = cn(
        'base-class',
        'another-class',
        {
          'conditional': true,
          'hidden': false
        },
        ['array-class1', 'array-class2'],
        undefined,
        null
      );
      expect(result).toBe('base-class another-class conditional array-class1 array-class2');
    });

    it('should handle deeply nested structures', () => {
      const result = cn([
        'class1',
        {
          'class2': true,
          'class3': false
        },
        ['class4', 'class5']
      ]);
      expect(result).toBe('class1 class2 class4 class5');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty input', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should handle all falsy values', () => {
      const result = cn('', undefined, null, false);
      expect(result).toBe('');
    });

    it('should handle whitespace', () => {
      const result = cn('  class1  ', '  class2  ');
      expect(result).toBe('class1 class2');
    });

    it('should handle duplicate classes', () => {
      const result = cn('class1', 'class2', 'class1');
      expect(result).toBe('class1 class2 class1');
    });
  });

  describe('Performance', () => {
    it('should handle large number of classes', () => {
      const classes = Array.from({ length: 1000 }, (_, i) => `class-${i}`);
      const startTime = performance.now();
      const result = cn(...classes);
      const endTime = performance.now();
      
      expect(result).toContain('class-0');
      expect(result).toContain('class-999');
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });

    it('should handle rapid calls', () => {
      const startTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        cn(`class-${i}`, `another-${i}`);
      }
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should be fast
    });
  });
});

