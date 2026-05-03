export interface PHIFinding {
  type: string;
  match: string;
  start: number;
  end: number;
}

const patterns: Array<{ type: string; regex: RegExp }> = [
  { type: "SSN", regex: /\b\d{3}-\d{2}-\d{4}\b/g },
  {
    type: "Phone number",
    regex: /\b(?:\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})\b/g,
  },
  {
    type: "Email address",
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  },
  {
    type: "Date of birth",
    regex: /\b(?:DOB|date of birth|d\.o\.b\.?)\s*:?\s*\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}\b/gi,
  },
  {
    type: "Medical Record Number",
    regex: /\b(?:MRN|medical record|record\s*#|record\s*number)\s*:?\s*\d{4,}\b/gi,
  },
  {
    type: "Long numeric identifier",
    regex: /\b\d{8,}\b/g,
  },
  {
    type: "Patient name",
    regex: /\b(?:Mr\.|Ms\.|Mrs\.|Patient)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g,
  },
  {
    type: "Date (MM/DD/YYYY)",
    regex: /\b(?:0[1-9]|1[0-2])[/\-](?:0[1-9]|[12]\d|3[01])[/\-](?:19|20)\d{2}\b/g,
  },
  {
    type: "Street address",
    regex: /\b\d{1,5}\s+(?:[A-Z][a-z]+\s){1,3}(?:St|Street|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Rd|Road|Ln|Lane|Way|Ct|Court)\.?\b/gi,
  },
];

export function detectPHI(text: string): PHIFinding[] {
  const findings: PHIFinding[] = [];
  const seen = new Set<string>();

  for (const { type, regex } of patterns) {
    const re = new RegExp(regex.source, regex.flags);
    let match;
    while ((match = re.exec(text)) !== null) {
      const key = `${match.index}-${match[0]}`;
      if (!seen.has(key)) {
        seen.add(key);
        findings.push({
          type,
          match: match[0],
          start: match.index,
          end: match.index + match[0].length,
        });
      }
    }
  }

  return findings.sort((a, b) => a.start - b.start);
}

export function redactPHI(text: string, findings: PHIFinding[]): string {
  let result = text;
  const sorted = [...findings].sort((a, b) => b.start - a.start);
  for (const finding of sorted) {
    result =
      result.slice(0, finding.start) + "[REDACTED]" + result.slice(finding.end);
  }
  return result;
}
