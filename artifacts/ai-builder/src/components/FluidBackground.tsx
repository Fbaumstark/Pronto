export function FluidBackground() {
  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
      style={{ zIndex: 0 }}
    >
      <div className="fluid-blob blob-1" />
      <div className="fluid-blob blob-2" />
      <div className="fluid-blob blob-3" />
      <div className="fluid-blob blob-4" />
      <div className="fluid-blob blob-5" />
      <div className="fluid-blob blob-6" />
    </div>
  );
}
