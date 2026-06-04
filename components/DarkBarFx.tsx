import NetworkAmbientDots from "./NetworkAmbientDots";

// Shared decorative layer for the site's dark (ink-900) section bars so they
// all mirror the homepage "For Vendors" bar: the floating network dots + the
// same left-to-right gradient veil. Pair it with `relative overflow-hidden
// border-y-2 border-brand-500` on the parent <section> and wrap the section's
// real content in `relative z-10` so it sits above this layer.
export default function DarkBarFx() {
  return (
    <>
      {/* Network ambient floating dots (no map) - the see-your-network effect:
          drift up, pulse, fade. */}
      <NetworkAmbientDots />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(15,29,36,0.82) 0%, rgba(15,29,36,0.35) 50%, rgba(15,29,36,0.7) 100%)",
        }}
      />
    </>
  );
}
