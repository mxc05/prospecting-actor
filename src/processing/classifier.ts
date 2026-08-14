import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { ActorInput, AIClassificationResult, NormalizedProfileData, RuleSignals } from '../types/index.js';
import { logger } from '../utils/logger.js';

export async function classifyProfile(
  profile: NormalizedProfileData,
  targetProfileType: string,
  signals: RuleSignals,
  input: ActorInput
): Promise<AIClassificationResult> {
  const provider = input.llm_provider || 'gemini';

  const systemPrompt = `You are a professional lead qualification classifier.
Evaluate public social media profile information to determine if the profile matches the requested persona.
Target Profile Persona: "${targetProfileType}"

Rules:
1. Do not invent information not supported by the profile text.
2. If evidence is insufficient, use "Unknown" or false.
3. Output MUST be valid JSON only. No markdown fences.

Required JSON Structure:
{
  "profession": "string",
  "niche": "string",
  "employment_type": "Freelancer" | "Agency" | "In-House" | "Business" | "Unknown",
  "profession_match": boolean,
  "freelancer_confidence": number, // 0.0 to 1.0
  "business_confidence": number,   // 0.0 to 1.0
  "confidence": number,            // 0.0 to 1.0
  "reason": "string"
}`;

  const userPrompt = `
Profile Name: ${profile.name}
Username: @${profile.username}
Bio: ${profile.bio || 'None'}
Location: ${profile.location || 'Unknown'}
Website: ${profile.website || 'None'}
Matched Rule Signals: ${signals.matched_signals.join(', ') || 'None'}
`;

  try {
    if (provider === 'gemini') {
      const apiKey = input.gemini_api_key || process.env.GEMINI_API_KEY || process.env.LLM_API_KEY;
      if (!apiKey) {
        logger.info(`No GEMINI_API_KEY supplied for @${profile.username}. Using rule-based fallback classification.`);
        return createFallbackClassification(signals, targetProfileType);
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: process.env.LLM_MODEL || 'gemini-2.0-flash',
        contents: `${systemPrompt}\n\n${userPrompt}`,
      });

      const text = response.text || '';
      return parseAIResponse(text);
    } 
    
    if (provider === 'openai' || provider === 'openrouter') {
      const apiKey = input.openai_api_key || process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
      if (!apiKey) {
        logger.info(`No OPENAI_API_KEY supplied for @${profile.username}. Using fallback classification.`);
        return createFallbackClassification(signals, targetProfileType);
      }

      const baseURL = provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : undefined;
      const openai = new OpenAI({ apiKey, baseURL });

      const completion = await openai.chat.completions.create({
        model: process.env.LLM_MODEL || (provider === 'openrouter' ? 'openai/gpt-4o-mini' : 'gpt-4o-mini'),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      });

      const text = completion.choices[0]?.message?.content || '';
      return parseAIResponse(text);
    }

    // Default or provider === 'none'
    return createFallbackClassification(signals, targetProfileType);
  } catch (err: unknown) {
    logger.warning(`AI Classification error for @${profile.username}: ${(err as Error).message}. Using fallback.`);
    return createFallbackClassification(signals, targetProfileType);
  }
}

function parseAIResponse(jsonText: string): AIClassificationResult {
  const cleanJson = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleanJson);
  
  return {
    profession: parsed.profession || 'Unknown',
    niche: parsed.niche || 'Unknown',
    employment_type: parsed.employment_type || 'Unknown',
    profession_match: typeof parsed.profession_match === 'boolean' ? parsed.profession_match : false,
    freelancer_confidence: Number(parsed.freelancer_confidence) || 0,
    business_confidence: Number(parsed.business_confidence) || 0,
    confidence: Number(parsed.confidence) || 0,
    reason: parsed.reason || 'AI classification processed.',
  };
}

export function createFallbackClassification(signals: RuleSignals, targetProfileType: string): AIClassificationResult {
  return {
    profession: signals.profession_signal_found ? targetProfileType : 'Unknown',
    niche: 'Unknown',
    employment_type: signals.freelancer_score > 0 ? 'Freelancer' : signals.business_score > 0 ? 'Business' : 'Unknown',
    profession_match: signals.profession_signal_found ? true : null,
    freelancer_confidence: signals.freelancer_score / 100,
    business_confidence: signals.business_score / 100,
    confidence: 0.5,
    reason: 'Rule-based fallback signal classification.',
  };
}
