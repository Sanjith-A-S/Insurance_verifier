const BANNED_PATTERNS = [
  /\bfraud\b/i,
  /\bfraudulent\b/i,
  /\bfake\b/i,
  /\bforged\b/i,
  /\bfabricated\b/i,
  /\bdoctored\b/i,
  /\btampered\b/i,
  /\bscam\b/i,
  /\blying\b/i,
  /\bliar\b/i,
  /\bauthentic\b/i,
  /\bproves\s+that\b/i,
];

export function containsBannedLanguage(text) {
  if (!text || typeof text !== 'string') return false;
  return BANNED_PATTERNS.some((pattern) => pattern.test(text));
}

export function sanitizeBannedLanguage(text) {
  if (!text || typeof text !== 'string') return text;
  let sanitized = text;
  sanitized = sanitized.replace(/\b(fraud|fraudulent|scam)\b/gi, 'inconsistent declaration');
  sanitized = sanitized.replace(/\b(fake|forged|fabricated|doctored|tampered)\b/gi, 'unverified document');
  sanitized = sanitized.replace(/\b(authentic)\b/gi, 'verified');
  sanitized = sanitized.replace(/\b(proves\s+that)\b/gi, 'indicates that');
  return sanitized;
}

/**
 * Validates and sanitizes AI findings against safety guardrails.
 */
export function validateAndSanitizeFindings(findings = [], context = {}) {
  const { validEvidenceIds = new Set(), storedFacts = [] } = context;
  const sanitizedFindings = [];
  const warnings = [];

  for (const raw of findings) {
    let finding = { ...raw };

    // 1. Language screen across all text fields
    const textsToCheck = [
      finding.title,
      finding.uncertainty,
      finding.nextAction,
      ...(finding.alternatives || []),
      ...(finding.observed || []),
      ...(finding.claimantAssertions || []),
      ...(finding.documentFacts || []),
      ...(finding.calculations || []),
      finding.aiInference,
    ].filter(Boolean);

    const hasBanned = textsToCheck.some((t) => containsBannedLanguage(t));
    if (hasBanned) {
      // Apply sanitization
      finding.title = sanitizeBannedLanguage(finding.title);
      finding.uncertainty = sanitizeBannedLanguage(finding.uncertainty);
      finding.nextAction = sanitizeBannedLanguage(finding.nextAction);
      finding.alternatives = (finding.alternatives || []).map(sanitizeBannedLanguage);
      if (finding.aiInference) {
        finding.aiInference = sanitizeBannedLanguage(finding.aiInference);
      }

      // If still contains banned words after sanitization, drop finding and log warning
      const stillBanned = [
        finding.title,
        finding.uncertainty,
        finding.nextAction,
        ...(finding.alternatives || []),
      ].some((t) => containsBannedLanguage(t));

      if (stillBanned) {
        warnings.push(`Finding '${finding.title || 'untitled'}' dropped due to policy banned language screening.`);
        continue;
      }
    }

    // 2. Ref check: evidenceId must belong to this claim
    const validSources = [];
    for (const src of finding.sources || []) {
      if (src && src.evidenceId && validEvidenceIds.has(src.evidenceId)) {
        let validSrc = { ...src };

        // 3. Quote check: quote <= 25 words & must exist in stored fact
        if (validSrc.quote) {
          const wordCount = validSrc.quote.trim().split(/\s+/).length;
          const matchingFact = storedFacts.find(
            (f) =>
              f.evidenceId === validSrc.evidenceId &&
              JSON.stringify(f.value).toLowerCase().includes(validSrc.quote.toLowerCase())
          );

          if (wordCount > 25 || !matchingFact) {
            delete validSrc.quote; // Drop quote, keep ref
          }
        }
        validSources.push(validSrc);
      }
    }

    finding.sources = validSources;

    // If finding has no valid ref, convert to low evidence hypothesis
    if (finding.sources.length === 0) {
      finding.lowEvidence = true;
      finding.type = 'low_evidence_hypothesis';
      if (finding.priority === 'high') {
        finding.priority = 'low';
      }
    }

    // 4. Priority cap: AI-only findings cannot be 'high' priority unless sources span >= 2 distinct evidence files
    const distinctEvidenceCount = new Set(finding.sources.map((s) => s.evidenceId)).size;
    if (finding.originType === 'ai_inference' || !finding.ruleId) {
      if (finding.priority === 'high' && distinctEvidenceCount < 2) {
        finding.priority = 'medium';
      }
    }

    // 5. Ensure alternatives exist for inconsistencies
    if (finding.type === 'inconsistency' && (!finding.alternatives || finding.alternatives.length === 0)) {
      finding.alternatives = ['Potential typographical error or timing offset in documentation'];
    }

    sanitizedFindings.push(finding);
  }

  return { findings: sanitizedFindings, warnings };
}
