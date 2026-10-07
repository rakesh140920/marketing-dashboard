/** Circular 0–100 fit score. Green ≥ 70, amber ≥ 40, red below. */
export default function ScoreRing({ score, size = 40 }: { score?: number | null; size?: number }) {
  if (score === undefined || score === null) {
    return (
      <div
        className="score-ring"
        style={{ width: size, height: size, background: 'var(--track)' }}
        title="Not analysed yet"
      >
        <span className="faint" style={{ fontSize: size * 0.3 }}>
          –
        </span>
      </div>
    );
  }
  const color = score >= 70 ? 'var(--score-good)' : score >= 40 ? 'var(--score-mid)' : 'var(--score-bad)';
  return (
    <div
      className="score-ring"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${color} ${score * 3.6}deg, var(--track) 0deg)`,
      }}
      title={`Fit score ${score}/100`}
    >
      <span style={{ fontSize: size * 0.32 }}>{score}</span>
    </div>
  );
}
