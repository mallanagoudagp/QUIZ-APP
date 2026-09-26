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
      answer: "The light reactions happen in the thylakoid membranes inside a chloroplast. Chlorophyll in these membranes absorbs light energy. The plant uses that energy to make ATP and NADPH, which are then used in the next stage of photosynthesis."
    },
    {
      type: "flashcard",
      id: "c2",
      topic: "Calvin cycle",
      difficulty: "medium",
      question: "Where does the Calvin cycle take place?",
      answer: "The Calvin cycle takes place in the stroma, the fluid-filled space inside a chloroplast. It uses carbon dioxide along with ATP and NADPH from the light reactions. These steps help build sugar molecules that store energy for the plant."
    },
    {
      type: "mcq",
      id: "q1",
      topic: "Calvin cycle",
      difficulty: "medium",
      question: "Which molecule is fixed during the Calvin cycle?",
      options: ["Oxygen (O2)", "Carbon dioxide (CO2)", "Nitrogen (N2)", "Water (H2O)"],
      correctIndex: 1,
      explanation: "The Calvin cycle takes in carbon dioxide and builds its carbon into larger molecules. The enzyme RuBisCO attaches CO2 to a five-carbon molecule to start this process. The cycle then uses energy from ATP and NADPH to help make sugar. For example, the carbon atoms in glucose originally came from CO2.",
      optionFeedback: [
        "Oxygen is released during the light reactions when water molecules are split. The Calvin cycle does a different job: it takes in carbon dioxide and uses its carbon to build sugar. So oxygen is a product of one stage, while carbon dioxide is the molecule fixed in this stage.",
        "",
        "Nitrogen fixation is a different process, usually carried out by certain bacteria. It changes nitrogen gas into forms organisms can use. In the Calvin cycle, the plant works with carbon dioxide instead, using its carbon to build sugar.",
        "Water is split during the light reactions to help provide electrons and release oxygen. The Calvin cycle uses carbon dioxide as its carbon source. Remember: water is involved in the light reactions, while CO2 is fixed in the Calvin cycle."
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
      explanation: "Chlorophyll is the main green pigment that captures light energy for photosynthesis. It absorbs light especially well in blue and red parts of the spectrum. The captured energy powers the light reactions, which make energy-carrying molecules for the Calvin cycle.",
      optionFeedback: [
        "",
        "Keratin is a protein that helps form structures such as hair and nails. It does not capture light for a plant. Chlorophyll is the pigment in chloroplasts that absorbs light and supplies energy to photosynthesis.",
        "Hemoglobin is the protein in blood that carries oxygen around the body. It is not the pigment plants use to capture light. In photosynthesis, chlorophyll absorbs light energy inside chloroplasts.",
        "Melanin is a pigment that helps color and protect skin, hair, and eyes. It does not power photosynthesis. Chlorophyll is the green pigment that captures light in plant cells."
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

function personalizedResult(learnerContext) {
  const result = structuredClone(GOOD_RESULT);
  const levels = learnerContext?.levels || {};

  for (const block of result.blocks) {
    if (!block.topic) continue;
    const level = levels[block.topic];
    if (!level) continue;
    block.difficulty = level === "beginner" ? "easy" : level === "intermediate" ? "medium" : "hard";

    if (level === "beginner" && block.type === "mcq") {
      block.explanation += " Take it one step at a time: first identify the stage, then recall what that stage takes in or produces.";
    }
    if (level === "beginner" && block.type === "flashcard") {
      block.answer += " A quick way to remember it is to connect the place with its job: this location supports this particular step of photosynthesis.";
    }
  }

  return result;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {string} simulate one of: "good" (default), "malformed",
 *   "wrong-shape", "empty", "slow", "fail"
 */
export async function mockGenerate(simulate = "good", learnerContext) {
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
      return JSON.stringify(personalizedResult(learnerContext));
    case "fail":
      throw new Error("Simulated provider failure");
    default:
      await delay(600);
      return JSON.stringify(personalizedResult(learnerContext));
  }
}
