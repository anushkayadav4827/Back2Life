import Groq from 'groq-sdk';
import { LLMOutputSchema, LLMOutput } from './schemas';
import { ZodError } from 'zod';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Valid models retrieved directly from Groq's API for this specific API key tier:
 * - meta-llama/llama-prompt-guard-2-22m
 * - groq/compound-mini
 * - canopylabs/orpheus-v1-english
 * - openai/gpt-oss-120b
 * - meta-llama/llama-prompt-guard-2-86m
 * - whisper-large-v3
 * - whisper-large-v3-turbo
 * - openai/gpt-oss-20b
 * - allam-2-7b
 * - groq/compound
 * - qwen/qwen3.8-27b
 * - openai/gpt-oss-safeguard-20b
 * - canopylabs/orpheus-arabic-saudi
 */
// Use a verified Groq model, configurable via env var
const MODEL_ID = process.env.GROQ_MODEL_ID || 'openai/gpt-oss-120b';

export interface AIInput {
  device: string;
  problemText: string;
  ruleSymptom: string;
  questionsAndAnswers: Array<{ question: string; answer: boolean }>;
  intakeData?: any;
  possibleIssues?: {
    id: string;
    label: string;
    pricingData: {
      replacementMinINR: number;
      replacementMaxINR?: number;
      repairMinINR: number;
      repairMaxINR: number;
      source: 'live' | 'cache' | 'category_average';
    };
    arbitrationResult: any;
  }[];
  forceComplete?: boolean;
}

export async function getDiagnosisFromAI(input: AIInput): Promise<LLMOutput> {
  let optionsContext = 'Options: Unavailable';
  if (input.possibleIssues && input.possibleIssues.length > 0) {
    optionsContext = input.possibleIssues.map(opt => {
      const dec = opt.arbitrationResult.decision;
      const forcedWinner = dec === 'repair_recommended' ? 'REPAIR' : dec === 'replacement_recommended' ? 'REPLACE' : 'NEUTRAL';
      return `
Issue Option: ${opt.label} (ID: ${opt.id})
- Expected Repair Cost: ₹${opt.pricingData.repairMinINR} - ₹${opt.pricingData.repairMaxINR}
- Expected Replacement Cost: ₹${opt.pricingData.replacementMinINR} ${opt.pricingData.replacementMaxINR ? `- ₹${opt.pricingData.replacementMaxINR}` : '+'}
- Repair Cost Per Year: ₹${opt.arbitrationResult.repairCostPerYear}
- Replace Cost Per Year: ₹${opt.arbitrationResult.replaceCostPerYear}
- Deterministic Winner for this option: ${forcedWinner}
`;
    }).join('\n');
  }

  const forceComplete = input.forceComplete ?? false;

  const instructions = forceComplete
    ? `INSTRUCTIONS:
You MUST now return "status": "COMPLETE" and provide the "result".
In the "result":
1. "primaryIssueId": MUST be one of the IDs from the 'Issue Options' provided below. Choose the most likely issue.
2. "primaryIssue": State exactly what part needs replacement or if it's a software/cleaning issue.
3. "reason": Provide a highly structured diagnostic analysis. Use plain language (no markdown).
4. Conduct a "debate" between a Repair Agent and a Replace Agent. 
   - "repairArgument": Write a structured financial and logical breakdown of why repairing makes sense. Use plain language.
   - "replaceArgument": Argue the structured financial and practical counterpoint for replacing the device. Use plain language.
   - "winner": You MUST strictly return the "Deterministic Winner" of your chosen Issue Option. Do not change this.
   - You MUST use the exact pricing numbers and Cost Per Year provided for your chosen Issue Option. Do NOT guess or estimate different prices.
5. "safetyWarning": Only provide if there is a SEVERE safety hazard. Do NOT provide this for normal physical damage. Return null otherwise.`
    : `INSTRUCTIONS:
You can ask a maximum of 10 questions. Currently, ${input.questionsAndAnswers.length} questions have been answered.
Evaluate if you have enough information to confidently diagnose the issue AND stage a debate between repairing vs replacing the device.

IF YOU NEED MORE INFO:
Return "status": "NEEDS_INFO" and provide 1 to 3 "newQuestions" (id, text). The text must be a yes/no question.

IF YOU HAVE ENOUGH INFO:
Return "status": "COMPLETE" and provide the "result".
In the "result":
1. "primaryIssueId": MUST be one of the IDs from the 'Issue Options' provided below. Choose the most likely issue.
2. "primaryIssue": State exactly what part needs replacement or if it's a software/cleaning issue.
3. "reason": Provide a highly structured diagnostic analysis connecting the symptoms to the likely cause. Follow the exact JSON structure provided.
4. Conduct a "debate" between a Repair Agent and a Replace Agent. 
   - "repairArgument": Write a structured financial and logical breakdown of why repairing makes sense. Use plain language.
   - "replaceArgument": Argue the structured financial and practical counterpoint for replacing the device. Use plain language.
   - "winner": You MUST strictly return the "Deterministic Winner" of your chosen Issue Option. Do not change this.
   - You MUST use the exact pricing numbers and Cost Per Year provided for your chosen Issue Option. Do NOT guess or estimate different prices.
5. "safetyWarning": Only provide if there is a SEVERE safety hazard. Do NOT provide this for normal physical damage. Return null otherwise.`;

  const structuredArgJson = `{
      "summary": "1 short sentence, plain language, no jargon",
      "keyPoints": ["bullet 1", "bullet 2", "bullet 3"],
      "pros": ["pro 1", "pro 2"],
      "cons": ["con 1", "con 2"],
      "bottomLine": "1 short sentence"
    }`;

  const synthesizedDiagnosisJson = `{
      "observed": "1-2 sentences summarizing the pattern of symptoms",
      "likelyCause": "the specific issue, in plain language, with WHY",
      "recommendedFix": "what should be done about it",
      "outlook": "what happens if fixed vs. not fixed (in plain terms)"
    }`;

  const schemaInstruction = forceComplete 
    ? `{
  "status": "COMPLETE",
  "result": {
    "primaryIssueId": "string",
    "primaryIssue": "string",
    "reason": ${synthesizedDiagnosisJson},
    "debate": {
      "repairArgument": ${structuredArgJson},
      "replaceArgument": ${structuredArgJson},
      "winner": "REPAIR" | "REPLACE" | "NEUTRAL"
    },
    "safetyWarning": "string" | null
  }
}`
    : `{
  "status": "NEEDS_INFO" | "COMPLETE",
  "newQuestions": [
    { "id": "q_id", "text": "Yes/No question string" }
  ],
  "result": {
    "primaryIssueId": "string",
    "primaryIssue": "string",
    "reason": ${synthesizedDiagnosisJson},
    "debate": {
      "repairArgument": ${structuredArgJson},
      "replaceArgument": ${structuredArgJson},
      "winner": "REPAIR" | "REPLACE" | "NEUTRAL"
    },
    "safetyWarning": "string" | null
  }
}`;

  const prompt = `
You are an expert electronics repair AI diagnosing a ${input.device}.
Problem: "${input.problemText}"
Symptom Category: "${input.ruleSymptom}"
User Intake Data:
${JSON.stringify(input.intakeData || {}, null, 2)}
(Note: If budgetINR is provided, the Replace Agent should compare the replacement cost against the user's budget. If replacement cost exceeds the budget, the Repair Agent can argue that repair is the only affordable option, or the Replace Agent can suggest buying refurbished/financing.)

Issue Options & Arbitration Math to choose from (You MUST use their deterministic math for your debate!):
${optionsContext}

Diagnostic Q&A so far:
${input.questionsAndAnswers.map((qa) => `- Q: ${qa.question} | A: ${qa.answer ? 'Yes' : 'No'}`).join('\n') || "None yet."}

${instructions}

You MUST respond in valid JSON matching exactly this schema:
${schemaInstruction}
Do not include any other text, only the JSON object.
  `.trim();

  try {
    console.info('[LLMClient] Structured Log - Request Payload:', JSON.stringify({
      device: input.device,
      symptom: input.ruleSymptom,
      questionsAsked: input.questionsAndAnswers.length,
      forceComplete
    }));

    let rawJson: any;
    let attempts = 0;
    const MAX_RETRIES = 3; // Groq rate limits are strict, allow 3 retries
    let rawText = '';
    
    while (attempts <= MAX_RETRIES) {
      try {
        const response = await groq.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: MODEL_ID,
          temperature: 0.2,
          response_format: { type: "json_object" },
        });

        rawText = response.choices[0]?.message?.content || '';
        if (!rawText) {
          throw new Error('Groq returned an empty response');
        }
        
        console.info('[LLMClient] Structured Log - Raw Response:', rawText);
        rawJson = JSON.parse(rawText);
        break; // Success, break out of loop
      } catch (e: any) {
        attempts++;
        if (attempts > MAX_RETRIES) {
          console.error(`[LLMClient] Structured Log - Max Retries Reached (${MAX_RETRIES}). Last Error:`, e?.message || e);
          throw e;
        }
        
        const isDecommissioned = e?.error?.code === 'model_decommissioned' || e?.code === 'model_decommissioned' || e?.message?.includes('model_decommissioned');
        
        if (isDecommissioned) {
          console.error(`[LLMClient] CRITICAL ERROR: The configured model '${MODEL_ID}' has been decommissioned by Groq. Please update GROQ_MODEL_ID to a supported model.`);
          throw new Error('MODEL_DECOMMISSIONED');
        }

        const isRateLimit = e?.status === 429 || e?.message?.includes('429');
        // Groq rate limit resets usually after a few seconds, exponential backoff starting at 3s
        const delayMs = isRateLimit ? Math.pow(2, attempts) * 1500 : 2000;
        
        console.warn(`[LLMClient] Error on attempt ${attempts}/${MAX_RETRIES + 1}. Retrying in ${delayMs}ms...`, e?.message);
        await new Promise(r => setTimeout(r, delayMs));
      }
    }

    if (rawJson.result === null) delete rawJson.result;
    if (rawJson.newQuestions === null) delete rawJson.newQuestions;
    
    // Validate using Zod (Rule: Malformed AI output never reaches user)
    const validData = LLMOutputSchema.parse(rawJson);
    console.info('[LLMClient] Structured Log - Validation Passed:', validData.status);
    return validData;
  } catch (error) {
    console.error('[LLMClient] Error calling LLM or validating response:', error);
    if (error instanceof ZodError) {
      console.error('Zod Validation Errors:', error.errors);
    }

    // Fallback response per T10 rules
    return {
      status: 'COMPLETE',
      result: {
        primaryIssue: 'Analysis Unavailable',
        reason: {
          observed: 'The diagnostic system was unable to process the symptom data for this session.',
          likelyCause: 'An internal error prevented the AI from completing the analysis.',
          recommendedFix: 'Please try running the diagnosis again. If the issue persists, consult a professional technician.',
          outlook: 'Without a confirmed diagnosis, repair or replacement decisions cannot be made reliably.',
        },
        debate: {
          repairArgument: {
            summary: 'Unable to reliably estimate repair costs without a confident diagnosis.',
            keyPoints: ['Requires manual evaluation first'], pros: [], cons: [], bottomLine: 'Pending physical inspection.'
          },
          replaceArgument: {
            summary: 'Unable to compare replacement value without confirming the underlying issue.',
            keyPoints: ['Cannot determine if repair is uneconomical'], pros: [], cons: [], bottomLine: 'Pending physical inspection.'
          },
          winner: 'REPLACE',
        },
        safetyWarning: null,
      },
    };
  }
}
