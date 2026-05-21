export default function Loading() {
  return (
    <div className="loading-screen" aria-live="polite" aria-busy="true">
      <p className="loading-screen__brand">CG Bhaskar</p>
      <p className="loading-screen__label">Edition loading</p>
      <div className="loading-screen__bar" role="presentation" />
    </div>
  );
}
