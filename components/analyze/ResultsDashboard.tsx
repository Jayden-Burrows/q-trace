"use client";

import { useMemo } from "react";
import type { VtUrlReport } from "@/types/vt";
import { toReportView } from "@/lib/report";
import type { DomainInfo } from "@/types/domain";
import EngineTable from "./EngineTable";
import ReportPanel from "./ReportPanel";
import VerdictCard from "./VerdictCard";
import Image from "next/image";

type ResultsDashboardProps = {
    report: VtUrlReport;
    fileName: string | null;
    screenshot: string | null;
    screenshotPending: boolean;
    rdapInfo: DomainInfo | null;
    onClear: () => void;
};

export default function ResultsDashboard({ report, fileName, screenshot, screenshotPending, rdapInfo, onClear }: ResultsDashboardProps) {
    const view = useMemo(() => toReportView(report), [report]);
    const isHarmful = view.verdict === "malicious" || view.verdict === "suspicious";

    return (
        <div>
            <VerdictCard view={view} fileName={fileName} />
            {screenshotPending && !screenshot && (
                <div className="mt-6 aspect-[4/3] w-full animate-pulse rounded-lg bg-ink/10" aria-hidden="true" />
            )}
            {screenshot && (
                // unoptimized: the file is already a 1024px webp, so skip the image optimizer
                <Image
                    src={screenshot}
                    alt={`Screenshot of ${view.hostname}`}
                    width={1024}
                    height={768}
                    unoptimized
                    className="mt-6 h-auto w-full rounded-lg"
                />
            )}
            <EngineTable engines={view.engines} onClear={onClear} />
            {isHarmful && <ReportPanel view={view} rdapInfo={rdapInfo} />}
        </div>
    );
}