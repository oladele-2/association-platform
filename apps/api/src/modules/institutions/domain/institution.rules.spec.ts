import { describe, expect, it } from 'vitest';
import { DomainError } from '@association/shared-kernel';
import {
  assertInstitutionName,
  assertInstitutionType,
  normalizeInstitutionCode,
} from './institution.rules';

describe('institution.rules', () => {
  it('normalizes institution codes', () => {
    expect(normalizeInstitutionCode('shf-01')).toBe('SHF-01');
  });

  it('rejects short names', () => {
    expect(() => assertInstitutionName(' ')).toThrow(DomainError);
  });

  it('normalizes institution types to slugs', () => {
    expect(assertInstitutionType('Hospital')).toBe('hospital');
  });

  it('rejects invalid types', () => {
    expect(() => assertInstitutionType('General Hospital')).toThrow(DomainError);
  });
});
