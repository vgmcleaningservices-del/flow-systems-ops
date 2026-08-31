export default function Loading() {
  return (
    <div className="skeleton-wrap" aria-hidden="true">
      <div className="skeleton-block" style={{ height: 26, width: 180 }} />
      <div className="skeleton-grid">
        <div className="skeleton-block skeleton-tile" />
        <div className="skeleton-block skeleton-tile" />
        <div className="skeleton-block skeleton-tile" />
      </div>
      <div className="skeleton-block" style={{ height: 140 }} />
      <div className="skeleton-block" style={{ height: 140 }} />
    </div>
  );
}
