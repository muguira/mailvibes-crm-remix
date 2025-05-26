export interface ParsedCsvResult {
  headers: string[];
  rows: Record<string, string>[];
  delimiter: ',' | ';';
}

/**
 * Detects the delimiter used in a CSV string
 * @param csvString - The CSV content as a string
 * @returns The detected delimiter (',' or ';')
 */
export function detectDelimiter(csvString: string): ',' | ';' {
  const firstLine = csvString.split('\n')[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  
  return semicolonCount > commaCount ? ';' : ',';
}

/**
 * Parses a CSV string into headers and rows
 * @param csvString - The CSV content as a string
 * @param delimiter - Optional delimiter to use (auto-detected if not provided)
 * @returns Parsed CSV data with headers and rows
 */
export function parseCsv(csvString: string, delimiter?: ',' | ';'): ParsedCsvResult {
  const detectedDelimiter = delimiter || detectDelimiter(csvString);
  const lines = csvString.trim().split('\n');
  
  if (lines.length === 0) {
    return { headers: [], rows: [], delimiter: detectedDelimiter };
  }
  
  // Parse headers from the first line
  const headers = parseCSVLine(lines[0], detectedDelimiter);
  
  // Parse rows
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], detectedDelimiter);
    if (values.length === headers.length) {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }
  }
  
  return { headers, rows, delimiter: detectedDelimiter };
}

/**
 * Parses a single CSV line handling quoted values
 * @param line - A single line from the CSV
 * @param delimiter - The delimiter to use
 * @returns Array of values from the line
 */
function parseCSVLine(line: string, delimiter: ',' | ';'): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip the next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Don't forget the last field
  result.push(current.trim());
  
  return result;
}

/**
 * Validates if a file is a CSV based on its extension
 * @param filename - The name of the file
 * @returns True if the file has a .csv extension
 */
export function isValidCsvFile(filename: string): boolean {
  return filename.toLowerCase().endsWith('.csv');
} 