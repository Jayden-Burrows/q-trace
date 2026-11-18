// components/AmbientBlob.tsx
import type { Verdict } from "@/types/domain";

// Soft background shapes whose colour follows the link's verdict.
// null (no result yet) uses the default lime. Styles live in globals.css.
export default function AmbientBlob({ verdict }: { verdict: Verdict | null }) {
  return (
    <div className="ambient" data-verdict={verdict ?? "idle"} aria-hidden="true">
      <span className="ambient-blob ambient-blob-a" />
      <span className="ambient-blob ambient-blob-b" />
    </div>
  );
}