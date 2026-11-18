"use client";

import { useMemo } from "react";
import type { VtUrlReport } from "@/types/vt";
import { toReportView } from "@/lib/report";
import EngineTable from "./EngineTable";
import ReportPanel from "./ReportPanel";
import VerdictCard from "./VerdictCard";

type ResultsDashboardProps = {
    report: VtUrlReport;
    fileName: string | null;
    onClear: () => void;
};

export default function ResultsDashboard({ report, fileName, onClear }: ResultsDashboardProps) {
    const view = useMemo(() => toReportView(report), [report]);
    const isHarmful = view.verdict === "malicious" || view.verdict === "suspicious";

    return (
        <div>
            <VerdictCard view={view} fileName={fileName} />
            <EngineTable engines={view.engines} onClear={onClear} />
            {isHarmful && <ReportPanel view={view} />}
        </div>
    );
}