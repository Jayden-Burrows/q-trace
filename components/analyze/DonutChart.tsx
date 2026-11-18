import type { ReportStats } from "@/types/domain";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";


ChartJS.register(ArcElement, Tooltip, Legend);

type DonutChartProps = {
    stats: ReportStats;
    flagged: number;
    total: number;
    className?: string;
};

export default function DonutChart({ stats, flagged, total, className = "" }: DonutChartProps) {
    let data = {
        datasets: [
            {
                data: [stats["malicious"], stats["suspicious"], stats["harmless"], stats["undetected"]],
                backgroundColor: [
                    "#ea5a40",
                    "#e3a312",
                    "#c9f25a",
                    "#8b948f"
                ],
            }
        ]
    }

    let options = {
        responsive: true,
        cutout: "75%"
    }

    const summary = `${stats["malicious"]} malicious, ${stats["suspicious"]} suspicious, ${stats["harmless"]} harmless, ${stats["undetected"]} undetected`;

    return (
        <div className={`relative aspect-square ${className}`} role="img" aria-label={`Engine verdicts: ${summary}`}>
            <Doughnut data={data} options={options} />
            <div className="absolute inset-0 grid place-content-center text-center">
                <span className="font-display text-3xl font-extrabold leading-none sm:text-4xl">{flagged}</span>
                <span className="mt-1 font-mono text-[11px] text-muted">of {total} flagged</span>
            </div>
        </div>
    );
}