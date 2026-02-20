
/**
 * TOON (Token-Oriented Object Notation) Encoder
 * 
 * A simplified implementation of TOON for optimizing LLM context usage.
 * Focuses on tabular representation of uniform object arrays.
 */

function isUniformArray(arr: any[]): boolean {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  if (typeof arr[0] !== 'object' || arr[0] === null) return false;
  
  const keys = Object.keys(arr[0]).sort().join(',');
  for (let i = 1; i < arr.length; i++) {
    if (typeof arr[i] !== 'object' || arr[i] === null) return false;
    if (Object.keys(arr[i]).sort().join(',') !== keys) return false;
  }
  return true;
}

function escapeToonValue(val: any): string {
  if (val === null || val === undefined) return '';
  
  if (Array.isArray(val) || (typeof val === 'object' && val !== null)) {
    return JSON.stringify(val);
  }
  
  const str = String(val);
  // If the value contains commas, newlines, or is empty, quote it
  if (str.includes(',') || str.includes('\n') || str.trim() === '') {
    return JSON.stringify(val);
  }
  return str;
}

export function encodeTOON(data: any, indent = 0): string {
  const spaces = '  '.repeat(indent);
  
  if (data === null) return 'null';
  if (data === undefined) return '';
  
  // Handle root array
  if (Array.isArray(data) && indent === 0) {
      return JSON.stringify(data, null, 2);
  }
  
  if (typeof data === 'object' && data !== null) {
    const lines: string[] = [];
    
    for (const key in data) {
      if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
      
      const value = data[key];
      
      // Case 1: Uniform Array of Objects -> Tabular Format
      if (Array.isArray(value) && isUniformArray(value) && value.length > 0) {
        // Use sorted keys for consistency
        const keys = Object.keys(value[0]).sort();
        // Format: key[length]{col1,col2...}:
        const header = `${key}[${value.length}]{${keys.join(',')}}:`;
        lines.push(`${spaces}${header}`);
        
        for (const item of value) {
          const row = keys.map(k => escapeToonValue(item[k])).join(',');
          lines.push(`${spaces}  ${row}`);
        }
      } 
      // Case 2: Other Arrays
      else if (Array.isArray(value)) {
        if (value.length === 0) {
           lines.push(`${spaces}${key}: []`);
        } else {
           // Check if it's an array of primitives
           if (value.every(v => typeof v !== 'object' || v === null)) {
             lines.push(`${spaces}${key}: ${JSON.stringify(value)}`);
           } else {
             lines.push(`${spaces}${key}:`);
             // Simple fallback for non-uniform object arrays
             for (const item of value) {
                if (typeof item === 'object' && item !== null) {
                    lines.push(`${spaces}  -`);
                    lines.push(encodeTOON(item, indent + 2));
                } else {
                    lines.push(`${spaces}  - ${JSON.stringify(item)}`);
                }
             }
           }
        }
      } 
      // Case 3: Nested Object
      else if (typeof value === 'object' && value !== null) {
        if (Object.keys(value).length === 0) {
           lines.push(`${spaces}${key}: {}`);
        } else {
           lines.push(`${spaces}${key}:`);
           lines.push(encodeTOON(value, indent + 1));
        }
      } 
      // Case 4: Primitive Value
      else {
        lines.push(`${spaces}${key}: ${JSON.stringify(value)}`);
      }
    }
    return lines.join('\n');
  }
  
  return JSON.stringify(data);
}
