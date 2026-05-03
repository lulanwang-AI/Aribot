/**
 * PHI guard regexes used at request time and during memory writes.
 *
 * The goal is NOT to be a perfect identifier detector — it's to catch obvious
 * leakage before a query lands in Anthropic's API and before content is
 * persisted to the memory store. False positives are fine; we want clinicians
 * to rephrase using clinical descriptors rather than risk a real leak.
 */

const PATTERNS: Array<{ name: string; re: RegExp }> = [
  // SSN-like: 3-2-4 with dashes or spaces.
  { name: "ssn", re: /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/ },
  // US phone: (xxx) xxx-xxxx, xxx-xxx-xxxx, xxx.xxx.xxxx, +1 xxx xxx xxxx.
  {
    name: "phone",
    re: /\b(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/,
  },
  // Full DOB: MM/DD/YYYY, MM-DD-YYYY, M/D/YYYY.
  { name: "dob", re: /\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](19|20)\d{2}\b/ },
  // ISO DOB: 1989-04-21
  { name: "dob_iso", re: /\b(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/ },
  // MRN-like: MRN: 12345678, MRN# 12345
  { name: "mrn", re: /\bMRN[:#\s]+\d{4,}\b/i },
  // Long bare digit runs that look like medical record numbers (8+).
  { name: "long_digit_run", re: /\b\d{8,}\b/ },
  // Address-like: "<number> <Word> <St|Street|Ave|Avenue|Rd|Road|Blvd|Lane|Drive|Way|Ct|Court>"
  // Matches "123 Main St", "4567 Oak Avenue", etc. Avoids false positives on
  // things like "5 mg" because the second token must be capitalized.
  {
    name: "address",
    re: /\b\d{1,6}\s+[A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]+)*\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Ln|Lane|Dr|Drive|Way|Ct|Court|Pl|Place|Pkwy|Parkway|Hwy|Highway)\b/i,
  },
  // ZIP code with state: "CA 90048" or "CA 90048-1234".
  { name: "zip_with_state", re: /\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/ },
  // Honorific + name: "Mr. Smith", "Mrs. Lopez", "Ms. Chen", "Dr. Patel"
  // (only when followed by a Capitalized name word so "Dr." standalone is OK).
  // Skip "Dr." alone because clinicians refer to themselves often.
  {
    name: "honorific_name",
    re: /\b(?:Mr|Mrs|Ms|Miss|Mx)\.?\s+[A-Z][a-z]{2,}\b/,
  },
  // Likely full names with explicit "patient/pt/name" anchor:
  // "patient John Smith", "pt: Jane Doe", "name is John Smith"
  {
    name: "patient_name",
    re: /\b(?:patient|pt|pt\.|name(?:\s+is)?|named)\s*:?\s+[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\b/i,
  },
  // Email address.
  {
    name: "email",
    re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
  },
];

export interface PhiCheckResult {
  ok: boolean;
  matchedPatterns: string[];
}

export function detectPhi(text: string): PhiCheckResult {
  const matched: string[] = [];
  for (const p of PATTERNS) {
    if (p.re.test(text)) matched.push(p.name);
  }
  return { ok: matched.length === 0, matchedPatterns: matched };
}

export const PHI_REJECTION_MESSAGE =
  "Query appears to contain personal identifiers. Please rephrase using clinical descriptors only " +
  "(age range, sex, relevant conditions). Do not include names, MRNs, dates of birth, addresses, or phone numbers.";

/**
 * Strip PHI-looking patterns from a piece of text. Returns the redacted text
 * plus the count of redactions performed and the redaction ratio
 * (chars-removed / original-length). Used by the memory writer.
 */
export function redactPhi(text: string): {
  redacted: string;
  redactionCount: number;
  redactionRatio: number;
} {
  const original = text;
  let redacted = text;
  let redactionCount = 0;

  for (const p of PATTERNS) {
    redacted = redacted.replace(new RegExp(p.re, "g"), () => {
      redactionCount += 1;
      return "[REDACTED]";
    });
  }

  // Crude name pattern: two title-cased words followed by a number ("John Smith 12345")
  redacted = redacted.replace(
    /\b[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\s+\d{3,}\b/g,
    () => {
      redactionCount += 1;
      return "[REDACTED NAME+ID]";
    }
  );

  const removed = Math.max(0, original.length - redacted.length);
  const redactionRatio =
    original.length === 0 ? 0 : removed / original.length;

  return { redacted, redactionCount, redactionRatio };
}
