/**
 * AnimatedBackground renders the gradient blobs behind all dashboard content.
 * It wraps the existing `.bg-blobs` CSS class into a reusable React component
 * and adds a third blob via an extra `<div>` (since CSS pseudo-elements only
 * give us two).
 */
export default function AnimatedBackground() {
  return (
    <div className="bg-blobs fixed inset-0 -z-10 pointer-events-none" aria-hidden="true">
      {/* Third blob — green/emerald, animated independently */}
      <div className="animated-blob-3" />
    </div>
  );
}
