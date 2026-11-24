import { ExternalIcon } from "@/components/icons";
import { SAFE_BROWSING_REPORT_URL, buildReportText, type ReportView } from "@/lib/report";
import type { DomainInfo } from "@/types/domain";
import CopyButton from "./CopyButton";

type ReportPanelProps = {
    view: ReportView;
    rdapInfo: DomainInfo | null;
};

export default function ReportPanel({ view, rdapInfo }: ReportPanelProps) {
    const reportText = buildReportText(view, rdapInfo);

    return (
        <section aria-labelledby="report-heading" className="mt-8 border border-ink bg-surface">
            <div className="border-b border-line p-5 sm:p-7">
                <h2 id="report-heading" className="font-display text-2xl font-bold tracking-tight">
                    Report this link
                </h2>
                <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
                    Reporting potentially or known malicious links to Google Safe Browsing helps browsers warn other people.
                </p>

                <ol className="mt-4 max-w-prose list-decimal space-y-1.5 pl-5 text-sm leading-relaxed">
                    <li>Copy the report below.</li>
                    <li>Open Google&apos;s report form and paste it into the details field.</li>
                    <li>Replace the bracketed line with where you saw the QR code.</li>
                </ol>

                <a
                    href={SAFE_BROWSING_REPORT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center gap-2 bg-ink px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-alarm-ink"
                >
                    Open Google&apos;s report form
                    <ExternalIcon />
                </a>
            </div>

            <div className="p-5 sm:p-7">
                <div className="flex items-center justify-between gap-4">
                    <h3 className="label-mono">Report text</h3>
                    <CopyButton text={reportText} label="Copy report" />
                </div>
                <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words border border-line bg-canvas p-4 font-mono text-xs leading-relaxed">
                    {reportText}
                </pre>
            </div>
        </section>
    );
}