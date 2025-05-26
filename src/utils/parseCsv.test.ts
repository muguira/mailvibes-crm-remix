import { describe, it, expect } from 'vitest';
import { parseCsv, detectDelimiter, isValidCsvFile } from './parseCsv';

describe('detectDelimiter', () => {
  it('should detect comma delimiter', () => {
    const csv = 'name,email,phone\nJohn Doe,john@example.com,123-456-7890';
    expect(detectDelimiter(csv)).toBe(',');
  });

  it('should detect semicolon delimiter', () => {
    const csv = 'name;email;phone\nJohn Doe;john@example.com;123-456-7890';
    expect(detectDelimiter(csv)).toBe(';');
  });

  it('should default to comma when counts are equal', () => {
    const csv = 'name;email,phone\nJohn';
    expect(detectDelimiter(csv)).toBe(',');
  });

  it('should handle empty string', () => {
    expect(detectDelimiter('')).toBe(',');
  });
});

describe('parseCsv', () => {
  it('should parse CSV with comma delimiter', () => {
    const csv = `name,email,phone
John Doe,john@example.com,123-456-7890
Jane Smith,jane@example.com,098-765-4321`;
    
    const result = parseCsv(csv);
    
    expect(result.delimiter).toBe(',');
    expect(result.headers).toEqual(['name', 'email', 'phone']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123-456-7890'
    });
  });

  it('should parse CSV with semicolon delimiter', () => {
    const csv = `name;email;phone
John Doe;john@example.com;123-456-7890`;
    
    const result = parseCsv(csv);
    
    expect(result.delimiter).toBe(';');
    expect(result.headers).toEqual(['name', 'email', 'phone']);
    expect(result.rows).toHaveLength(1);
  });

  it('should handle quoted values with commas', () => {
    const csv = `name,address,city
"Doe, John","123 Main St, Apt 4","New York"`;
    
    const result = parseCsv(csv);
    
    expect(result.rows[0]).toEqual({
      name: 'Doe, John',
      address: '123 Main St, Apt 4',
      city: 'New York'
    });
  });

  it('should handle escaped quotes', () => {
    const csv = `name,description
"John ""Johnny"" Doe","He said ""Hello"""`;
    
    const result = parseCsv(csv);
    
    expect(result.rows[0]).toEqual({
      name: 'John "Johnny" Doe',
      description: 'He said "Hello"'
    });
  });

  it('should handle empty CSV', () => {
    const result = parseCsv('');
    
    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  it('should handle CSV with only headers', () => {
    const csv = 'name,email,phone';
    const result = parseCsv(csv);
    
    expect(result.headers).toEqual(['name', 'email', 'phone']);
    expect(result.rows).toEqual([]);
  });

  it('should skip rows with mismatched column count', () => {
    const csv = `name,email,phone
John Doe,john@example.com,123-456-7890
Jane Smith,jane@example.com
Bob Johnson,bob@example.com,098-765-4321`;
    
    const result = parseCsv(csv);
    
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].name).toBe('John Doe');
    expect(result.rows[1].name).toBe('Bob Johnson');
  });

  it('should use provided delimiter over auto-detection', () => {
    const csv = 'name;email;phone\nJohn,Doe,test';
    const result = parseCsv(csv, ',');
    
    expect(result.delimiter).toBe(',');
    expect(result.headers).toEqual(['name;email;phone']);
  });
});

describe('isValidCsvFile', () => {
  it('should return true for .csv files', () => {
    expect(isValidCsvFile('data.csv')).toBe(true);
    expect(isValidCsvFile('DATA.CSV')).toBe(true);
    expect(isValidCsvFile('my-file.csv')).toBe(true);
  });

  it('should return false for non-.csv files', () => {
    expect(isValidCsvFile('data.txt')).toBe(false);
    expect(isValidCsvFile('data.xlsx')).toBe(false);
    expect(isValidCsvFile('datacsv')).toBe(false);
    expect(isValidCsvFile('data.csv.txt')).toBe(false);
  });
}); 