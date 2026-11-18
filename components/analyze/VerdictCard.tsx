import type { Verdict } from "@/types/domain";
import { GlobeIcon, ShieldIcon, type ShieldVariant } from "@/components/icons";
import { VERDICT_COPY, buildOverview, formatUtc, type ReportView } from "@/lib/report";
import CopyButton from "./CopyButton";
import DonutChart from "./DonutChart";

type VerdictCardProps = {
    view: ReportView;
    fileName: string | null;
};

const TONES: Record<
    Verdict,
    { wash: string; line: string; ink: string; icon: string; variant: ShieldVariant }
> = {
    malicious: {
        wash: "bg-alarm-wash",
        line: "border-alarm-line",
        ink: "text-alarm-ink",
        icon: "bg-alarm text-white",
        variant: "x",
    },
    suspicious: {
        wash: "bg-warn-wash",
        line: "border-warn-line",
        ink: "text-warn-ink",
        icon: "bg-warn text-ink",
        variant: "alert",
    },
    harmless: {
        wash: "bg-lime-wash",
        line: "border-lime",
        ink: "text-lime-ink",
        icon: "bg-lime text-ink",
        variant: "check",
    },
    undetected: {
        wash: "bg-quiet-wash",
        line: "border-line",
        ink: "text-muted",
        icon: "bg-quiet text-white",
        variant: "unknown",
    },
};

const STAT_CELLS = [
    { key: "malicious", label: "Malicious", number: "text-alarm-ink", swatch: "bg-alarm" },
    { key: "suspicious", label: "Suspicious", number: "text-warn-ink", swatch: "bg-warn" },
    { key: "harmless", label: "Harmless", number: "text-lime-ink", swatch: "bg-lime" },
    { key: "undetected", label: "Undetected", number: "text-muted", swatch: "bg-quiet" },
] as const;

export default function VerdictCard({ view, fileName }: VerdictCardProps) {
    const tone = TONES[view.verdict];
    const copy = VERDICT_COPY[view.verdict];

    // Details come from the scanned page itself, so they are shown as plain text only.
    const rows: { label: string; value: string | null; mono?: boolean; clamp?: boolean }[] = [
        { label: "Title", value: view.site.title },
        { label: "Type", value: view.site.type },
        { label: "Description", value: view.site.description, clamp: true },
        { label: "Category", value: view.site.category },
    ];
    if (view.finalUrl) {
        rows.push({ label: "Redirects to", value: view.finalUrl, mono: true });
    }
    const hasSiteDetails = rows.some((row) => row.value);

    return (
        <article aria-labelledby="verdict-heading" className="overflow-hidden border border-line bg-surface">
            <header className={`border-b p-5 sm:p-7 ${tone.wash} ${tone.line}`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                        <span className={`grid h-12 w-12 shrink-0 place-items-center sm:h-14 sm:w-14 ${tone.icon}`}>
                            <ShieldIcon variant={tone.variant} className="h-6 w-6 sm:h-7 sm:w-7" />
                        </span>
                        <div className="min-w-0">
                            <p className={`label-mono ${tone.ink}`}>Consensus verdict</p>
                            <h2
                                id="verdict-heading"
                                className="mt-1 font-display text-3xl font-extrabold leading-none tracking-tight sm:text-4xl"
                            >
                                {copy.heading}
                            </h2>
                            <p className="mt-2 break-words text-sm text-muted">
                                {fileName ? `${fileName} · ` : ""}analyzed {formatUtc(view.analyzedAt)}
                            </p>
                        </div>
                    </div>
                    <p
                        className={`w-fit shrink-0 border border-current px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] ${tone.ink}`}
                    >
                        {view.flagged} / {view.totalEngines} flagged
                    </p>
                </div>

                <div className={`mt-5 flex items-center gap-3 border-t pt-4 ${tone.line}`}>
                    <GlobeIcon className="h-5 w-5 shrink-0 text-muted" />
                    <p className="min-w-0 flex-1 break-all font-mono text-sm">{view.url}</p>
                    <CopyButton text={view.url} label="Copy link" />
                </div>
            </header>

            <div className="grid gap-6 p-5 sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-center sm:gap-8 sm:p-7">
                <div className="min-w-0">
                    {hasSiteDetails ? (
                        <dl>
                            {rows.map((row) => (
                                <div
                                    key={row.label}
                                    className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 border-t border-line py-2 first:border-t-0 first:pt-0"
                                >
                                    <dt className="label-mono pt-1">{row.label}</dt>
                                    <dd
                                        className={[
                                            "min-w-0 break-words text-sm",
                                            row.mono ? "break-all font-mono text-xs" : "",
                                            row.clamp ? "line-clamp-3" : "",
                                            row.value ? "" : "text-muted",
                                        ].join(" ")}
                                    >
                                        {row.value ?? "Not provided"}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    ) : (
                        <p className="text-sm text-muted">No page details were captured for this link.</p>
                    )}
                    <p className="mt-4 text-sm leading-relaxed">{buildOverview(view)}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{copy.blurb}</p>
                </div>

                <DonutChart
                    stats={view.stats}
                    flagged={view.flagged}
                    total={view.totalEngines}
                    className="mx-auto w-40 sm:w-full"
                />
            </div>

            <dl className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-4">
                {STAT_CELLS.map((cell) => (
                    <div key={cell.key} className="bg-surface p-4 sm:p-5">
                        <dd className={`font-display text-4xl font-extrabold leading-none ${cell.number}`}>
                            {view.stats[cell.key]}
                        </dd>
                        <dt className="mt-3 flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 ${cell.swatch}`} aria-hidden="true" />
                            <span className="label-mono">{cell.label}</span>
                        </dt>
                    </div>
                ))}
            </dl>
        </article>
    );
}