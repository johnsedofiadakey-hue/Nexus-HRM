import { describe, it, expect } from 'vitest';
import {
  calculateGhanaPAYE,
  calculateGhanaSSNIT,
  calculateGuineaTax,
  calculateStandardTax,
  calculateGenericTax,
  computeTaxes,
} from '../services/payroll.service';

// ─── Ghana PAYE ───────────────────────────────────────────────────────────────

describe('calculateGhanaPAYE', () => {
  it('returns 0 for income at or below the first exemption band (490)', () => {
    expect(calculateGhanaPAYE(490)).toBe(0);
    expect(calculateGhanaPAYE(0)).toBe(0);
  });

  it('taxes only the portion above 490 at 5%', () => {
    // 490 free + 100 at 5% = 5.00
    expect(calculateGhanaPAYE(590)).toBe(5);
  });

  it('taxes correctly into the 10% band', () => {
    // 490 free + 110 at 5% (= 5.50) + 100 at 10% (= 10.00) = 15.50
    expect(calculateGhanaPAYE(700)).toBe(15.5);
  });

  it('handles higher income spanning multiple bands', () => {
    // 490@0 + 110@5% + 130@10% + 3166.67@17.5%
    const expected = 0 + 110 * 0.05 + 130 * 0.10 + 3166.67 * 0.175;
    expect(calculateGhanaPAYE(3896.67)).toBeCloseTo(expected, 1);
  });

  it('returns a non-negative value for any positive input', () => {
    [100, 1000, 10000, 100000].forEach(income => {
      expect(calculateGhanaPAYE(income)).toBeGreaterThanOrEqual(0);
    });
  });
});

// ─── Ghana SSNIT ─────────────────────────────────────────────────────────────

describe('calculateGhanaSSNIT', () => {
  it('calculates 5.5% employee and 13% employer contributions', () => {
    const { employeeSSNIT, employerSSNIT } = calculateGhanaSSNIT(2000);
    expect(employeeSSNIT).toBe(110);    // 2000 * 0.055
    expect(employerSSNIT).toBe(260);    // 2000 * 0.13
  });

  it('rounds to 2 decimal places', () => {
    const { employeeSSNIT } = calculateGhanaSSNIT(1001);
    expect(employeeSSNIT).toBe(55.06);  // 1001 * 0.055 = 55.055 → 55.06
  });

  it('returns 0 for 0 salary', () => {
    const { employeeSSNIT, employerSSNIT } = calculateGhanaSSNIT(0);
    expect(employeeSSNIT).toBe(0);
    expect(employerSSNIT).toBe(0);
  });
});

// ─── Guinea Tax (IRPP) ────────────────────────────────────────────────────────

describe('calculateGuineaTax', () => {
  it('returns 0 for income at or below 1,000,000 GNF', () => {
    expect(calculateGuineaTax(1000000)).toBe(0);
    expect(calculateGuineaTax(500000)).toBe(0);
  });

  it('taxes only the portion above 1M at 5%', () => {
    // 1M @0% + 500k @5% = 25,000
    expect(calculateGuineaTax(1500000)).toBe(25000);
  });

  it('correctly taxes across the 10% bracket', () => {
    // 1M @0% + 4M @5% (=200k) + 1M @10% (=100k) = 300,000
    expect(calculateGuineaTax(6000000)).toBe(300000);
  });

  it('correctly taxes across the 15% bracket', () => {
    // 1M @0% + 4M @5% (=200k) + 5M @10% (=500k) + 1M @15% (=150k) = 850,000
    expect(calculateGuineaTax(11000000)).toBe(850000);
  });

  it('correctly taxes above 20M (20% top bracket)', () => {
    // 1M@0 + 4M@5%(200k) + 5M@10%(500k) + 10M@15%(1.5M) + 5M@20%(1M) = 3.2M
    expect(calculateGuineaTax(25000000)).toBe(3200000);
  });
});

// ─── Standard Tax (West Africa annual brackets) ───────────────────────────────

describe('calculateStandardTax', () => {
  it('returns 0 for income within the first exempt band', () => {
    // annual = 300*12=3600 < 4380 → all exempt
    expect(calculateStandardTax(300)).toBe(0);
  });

  it('returns a positive tax for income above exempt band', () => {
    expect(calculateStandardTax(1000)).toBeGreaterThan(0);
  });

  it('is always non-negative', () => {
    [0, 100, 5000, 50000].forEach(v => {
      expect(calculateStandardTax(v)).toBeGreaterThanOrEqual(0);
    });
  });
});

// ─── Generic Tax (20% flat) ───────────────────────────────────────────────────

describe('calculateGenericTax', () => {
  it('returns exactly 20% of gross', () => {
    expect(calculateGenericTax(1000)).toBe(200);
    expect(calculateGenericTax(5000)).toBe(1000);
  });

  it('rounds to 2 decimal places', () => {
    expect(calculateGenericTax(333)).toBe(66.6);
  });
});

// ─── computeTaxes (dispatch) ──────────────────────────────────────────────────

describe('computeTaxes', () => {
  it('routes GHS to Ghana PAYE + SSNIT', () => {
    const result = computeTaxes(2000, 'GHS', 2200);
    // SSNIT on base: 2000 * 0.055 = 110; taxable = 2200 - 110 = 2090
    const { employeeSSNIT } = calculateGhanaSSNIT(2000);
    expect(result.socialSecurity).toBe(employeeSSNIT);
    expect(result.tax).toBe(calculateGhanaPAYE(2200 - employeeSSNIT));
  });

  it('routes GNF to Guinea tax + CNSS (5%)', () => {
    const gross = 5000000;
    const result = computeTaxes(gross, 'GNF', gross);
    expect(result.tax).toBe(calculateGuineaTax(gross));
    expect(result.socialSecurity).toBe(Math.round(gross * 0.05 * 100) / 100);
  });

  it('routes USD to 20% flat tax with no social security', () => {
    const result = computeTaxes(3000, 'USD', 3000);
    expect(result.tax).toBe(calculateGenericTax(3000));
    expect(result.socialSecurity).toBe(0);
  });

  it('routes EUR to 20% flat tax with no social security', () => {
    const result = computeTaxes(3000, 'EUR', 3000);
    expect(result.tax).toBe(600);
    expect(result.socialSecurity).toBe(0);
  });

  it('routes unknown currency to standard West Africa tax', () => {
    const result = computeTaxes(1000, 'XOF', 1000);
    expect(result.tax).toBe(calculateStandardTax(1000));
    expect(result.socialSecurity).toBe(Math.round(1000 * 0.055 * 100) / 100);
  });

  it('net pay is always non-negative (tax never exceeds gross)', () => {
    ['GHS', 'GNF', 'USD', 'GBP', 'XOF'].forEach(currency => {
      const gross = 1000;
      const { tax, socialSecurity } = computeTaxes(gross, currency, gross);
      expect(tax + socialSecurity).toBeLessThanOrEqual(gross);
    });
  });
});
