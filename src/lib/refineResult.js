/**
 * A refinement should not silently remove the summary tab just because the
 * model omitted its summary block. Keep the existing summary unless the user
 * explicitly asks to remove it; a replacement summary from the model wins.
 */
export function preserveSummaryOnRefine(previousResult, refinedResult, instruction = "") {
  const previousSummaries = previousResult?.blocks?.filter((block) => block.type === "summary") || [];
  if (!previousSummaries.length || refinedResult.blocks.some((block) => block.type === "summary")) {
    return refinedResult;
  }

  const explicitlyRemovesSummary =
    /\b(remove|delete|drop|omit)\b.{0,40}\bsummary\b|\bsummary\b.{0,40}\b(remove|delete|drop|omit)\b/i.test(instruction);
  if (explicitlyRemovesSummary) return refinedResult;

  return { ...refinedResult, blocks: [...refinedResult.blocks, ...previousSummaries] };
}
