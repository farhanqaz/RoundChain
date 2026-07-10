/** Subtle animated abstract background — orbs + ring echoes of the brand mark. */
export function AbstractBackground() {
  return (
    <div className="abstract-bg" aria-hidden>
      <div className="abstract-bg__mesh" />
      <div className="abstract-bg__orb abstract-bg__orb--1" />
      <div className="abstract-bg__orb abstract-bg__orb--2" />
      <div className="abstract-bg__orb abstract-bg__orb--3" />
      <div className="abstract-bg__ring abstract-bg__ring--1" />
      <div className="abstract-bg__ring abstract-bg__ring--2" />
      <div className="abstract-bg__grain" />
    </div>
  );
}
