import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';
import { logger } from '../middleware/logger.js';
import { AnalysisUnavailableError } from '../lib/errors.js';

let aiInstance = null;

function getAIClient() {
  if (!aiInstance) {
    if (!env.GEMINI_API_KEY || env.GEMINI_API_KEY === 'replace-me') {
      return null;
    }
    aiInstance = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return aiInstance;
}

/**
 * Attempts to repair common JSON issues (trailing commas, unescaped newlines).
 */
export function repairJsonString(raw) {
  if (!raw || typeof raw !== 'string') return '{}';
  let cleaned = raw.trim();

  // Strip markdown code fences if model returned them
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
  }

  // Remove trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

  return cleaned;
}

/**
 * Calls Gemini with timeout, retries, fallback model, and JSON validation.
 */
export async function callGeminiStructured({
  contents,
  systemInstruction = undefined,
  schema = undefined,
  modelName = env.GEMINI_MODEL,
}) {
  const client = getAIClient();
  if (!client) {
    throw new AnalysisUnavailableError('Gemini API key is not configured');
  }

  const modelsToTry = [modelName, env.GEMINI_FALLBACK_MODEL];
  let lastError = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const currentModel = attempt === 2 ? modelsToTry[1] : modelsToTry[0];
    const start = Date.now();

    try {
      const config = {
        responseMimeType: 'application/json',
      };
      if (systemInstruction) {
        config.systemInstruction = systemInstruction;
      }
      if (schema) {
        config.responseSchema = schema;
      }

      // Timeout wrapper
      const generatePromise = client.models.generateContent({
        model: currentModel,
        contents,
        config,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API request timeout exceeded')), env.GEMINI_TIMEOUT_MS)
      );

      const response = await Promise.race([generatePromise, timeoutPromise]);
      const duration = Date.now() - start;

      const usage = response.usageMetadata || {};
      logger.info(
        {
          model: currentModel,
          durationMs: duration,
          promptTokens: usage.promptTokenCount,
          candidatesTokens: usage.candidatesTokenCount,
        },
        'Gemini API structured call succeeded'
      );

      const rawText = response.text || '';
      try {
        const parsed = JSON.parse(rawText);
        return { data: parsed, model: currentModel };
      } catch (jsonErr) {
        // Try repairing JSON
        const repaired = repairJsonString(rawText);
        const parsed = JSON.parse(repaired);
        return { data: parsed, model: currentModel };
      }
    } catch (err) {
      lastError = err;
      const duration = Date.now() - start;
      logger.warn(
        { err: err.message, attempt, model: currentModel, durationMs: duration },
        'Gemini API call failed, retrying...'
      );

      // Backoff with jitter before next attempt
      const backoffMs = Math.pow(2, attempt) * 1000 + Math.random() * 500;
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }

  logger.error({ err: lastError?.message }, 'All Gemini API attempts failed');
  throw new AnalysisUnavailableError(`Gemini call failed after retries: ${lastError?.message}`);
}
