// A fake "LLM" used when LLM_PROVIDER=mock (no API key needed). Lets you
// build and demo the whole UI, including every failure state, without
// spending API credits. Pass a `simulate` field in the request body to force
// a specific case (see the debug panel in the UI, ?debug=1).

const GOOD_RESULT = {
  title: "Sample: Photosynthesis basics",
  blocks: [
    {
      type: "flashcard",
      id: "c1",
      topic: "Light reactions",
      difficulty: "easy",
      question: "Where do the light reactions of photosynthesis occur?",
      answer: "In the thylakoid membranes of the chloroplast."
    },
    {
      type: "flashcard",
      id: "c2",
      topic: "Calvin cycle",
      difficulty: "medium",
      question: "Where does the Calvin cycle take place?",
      answer: "In the stroma of the chloroplast."
    },
    {
      type: "mcq",
      id: "q1",
      topic: "Calvin cycle",
      difficulty: "medium",
      question: "Which molecule is fixed during the Calvin cycle?",
      options: ["Oxygen (O2)", "Carbon dioxide (CO2)", "Nitrogen (N2)", "Water (H2O)"],
      correctIndex: 1,
      explanation: "CO2 is fixed by the enzyme RuBisCO to begin the Calvin cycle.",
      optionFeedback: [
        "O2 is a product of the light reactions, not something fixed in the Calvin cycle.",
        "",
        "Nitrogen fixation is a separate biological process unrelated to the Calvin cycle.",
        "Water is split in the light reactions, not fixed in the Calvin cycle."
      ]
    },
    {
      type: "mcq",
      id: "q2",
      topic: "Light reactions",
      difficulty: "easy",
      question: "What pigment primarily absorbs light for photosynthesis?",
      options: ["Chlorophyll", "Keratin", "Hemoglobin", "Melanin"],
      correctIndex: 0,
      explanation: "Chlorophyll absorbs light energy, mainly in the blue and red wavelengths.",
      optionFeedback: [
        "",
        "Keratin is a structural protein in hair and nails, unrelated to photosynthesis.",
        "Hemoglobin carries oxygen in blood; it does not absorb light for photosynthesis.",
        "Melanin is a pigment in skin and hair, not involved in photosynthesis."
      ]
    },
    {
      type: "summary",
      id: "s1",
      points: [
        "Photosynthesis has two stages: light reactions and the Calvin cycle.",
        "Light reactions happen in the thylakoid membrane and produce ATP and NADPH.",
        "The Calvin cycle happens in the stroma and fixes CO2 into sugar.",
        "Chlorophyll is the main pigment that captures light energy."
      ]
    }
  ]
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {string} simulate one of: "good" (default), "malformed",
 *   "wrong-shape", "empty", "slow", "fail"
 */
export async function mockGenerate(simulate = "good") {
  switch (simulate) {
    case "malformed":
      // Truncated JSON — will fail JSON.parse.
      return '{ "title": "Broken", "blocks": [ { "type": "flashcard"';
    case "wrong-shape":
      // Valid JSON, but doesn't match the contract at all.
      return JSON.stringify({ notes: "here are some notes", ok: true });
    case "empty":
      return "";
    case "slow":
      await delay(35000);
      return JSON.stringify(GOOD_RESULT);
    case "fail":
      throw new Error("Simulated provider failure");
    default:
      await delay(600);
      return JSON.stringify(GOOD_RESULT);
  }
}
