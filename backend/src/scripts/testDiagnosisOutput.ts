import { getDiagnosisFromAI } from '../lib/llmClient';

async function main() {
  console.log('Testing LLM Output for TWS Earbuds Diagnosis...');

  // Mock input based on Earbuds scenario
  const mockInput = {
    device: 'wireless headphones (earbuds)',
    problemText: 'The right earbud has no sound, but the left works fine.',
    ruleSymptom: 'Headphones or earbuds silent on one side',
    questionsAndAnswers: [
      { question: 'Have you verified the audio balance slider in your device settings is centered?', answer: true },
      { question: 'For in-ear earbuds, have you cleaned or inspected the mesh sound filter for wax buildup?', answer: false },
    ],
    intakeData: {
      brand: 'Samsung',
      model: 'Galaxy Buds',
      ageYears: 2,
      purchasePriceINR: 10000,
      warrantyStatus: 'OUT_OF_WARRANTY',
      priorRepairs: 'NONE',
      usageIntensity: 'MODERATE',
    },
    possibleIssues: [
      {
        id: 'mesh_filter_clogged',
        label: 'Clogged wax filter',
        pricingData: {
          repairMinINR: 0,
          repairMaxINR: 200,
          replacementMinINR: 8000,
          replacementMaxINR: 12000,
          source: 'live' as const
        },
        arbitrationResult: {
          decision: 'repair_recommended' as const,
          repairCostPerYear: 100,
          replaceCostPerYear: 4000
        }
      }
    ],
    forceComplete: true
  };

  try {
    const aiOutput = await getDiagnosisFromAI(mockInput as any);
    console.log('\n--- RAW LLM RESPONSE JSON ---\n');
    console.log(JSON.stringify(aiOutput, null, 2));
    console.log('\n-----------------------------\n');
    console.log('Check if `result.reason` contains `observed`, `likelyCause`, `recommendedFix`, `outlook`');
  } catch (err) {
    console.error('Error calling AI:', err);
  }
}

main().catch(console.error);
