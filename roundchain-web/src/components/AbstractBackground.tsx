/** Clean static gradient background — no animated orbs or rings. */
export function AbstractBackground() {
  return (
    <div className="abstract-bg" aria-hidden>
      <div className="abstract-bg__gradient" />
    </div>
  );
}
