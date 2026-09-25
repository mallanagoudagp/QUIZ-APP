export default function SummaryBlock({ points }) {
  if (!points || points.length === 0) return null;
  return (
    <ul className="summary">
      {points.map((point, i) => (
        <li key={i}>{point}</li>
      ))}
    </ul>
  );
}
