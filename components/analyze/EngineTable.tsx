"use client";

import { useState } from "react";
import type { EngineCategory, EngineResult } from "@/types/domain";
import { ChevronDownIcon } from "@/components/icons";

type EngineTableProps = {
    engines: EngineResult[];
    onClear: () => void;
};

const COLLAPSED_COUNT = 6;

const CHIP_TONES: Record<EngineCategory, string> = {
    malicious: "border-alarm-line bg-alarm-wash text-alarm-ink",
    suspicious: "border-warn-line bg-warn-wash text-warn-ink",
    harmless: "border-lime bg-ok-wash text-lime-ink",
    undetected: "border-line bg-quiet-wash text-muted",
    timeout: "border-line bg-quiet-wash text-muted",
    unknown: "border-line bg-quiet-wash text-muted",
};

export default function EngineTable({ engines, onClear }: EngineTableProps) {
    const [expanded, setExpanded] = useState(false);
    const canExpand = engines.length > COLLAPSED_COUNT;
    const visible = expanded ? engines : engines.slice(0, COLLAPSED_COUNT);

    return (
        <section aria-labelledby="engine-heading" className="mt-8">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <h2 id="engine-heading" className="font-display text-2xl font-bold tracking-tight">
                        Engine results
                    </h2>
                    <p className="mt-1 text-sm text-muted">What each security engine reported for this link.</p>
                </div>
                <button
                    type="button"
                    onClick={onClear}
                    className="label-mono shrink-0 border-b border-ink pb-0.5 text-ink transition-colors hover:text-alarm-ink"
                >
                    Clear
                </button>
            </div>

            <div className="mt-4 overflow-x-auto border-t border-ink">
                <table className="w-full min-w-[20rem] text-left text-sm">
                    <caption className="sr-only">Results from each security engine</caption>
                    <thead>
                        <tr>
                            <th scope="col" className="label-mono py-3 pr-4 font-normal">Engine</th>
                            <th scope="col" className="label-mono py-3 pr-4 font-normal">Method</th>
                            <th scope="col" className="label-mono py-3 text-right font-normal sm:text-left">Verdict</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visible.map((engine) => (
                            <tr key={engine.name} className="border-t border-line">
                                <th scope="row" className="py-3.5 pr-4 text-left font-semibold">{engine.name}</th>
                                <td className="py-3.5 pr-4 capitalize text-muted">{engine.method}</td>
                                <td className="py-3.5 text-right sm:text-left">
                                    <span
                                        className={`inline-block border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.1em] ${CHIP_TONES[engine.category]}`}
                                    >
                                        {engine.result}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {canExpand && (
                <button
                    type="button"
                    onClick={() => setExpanded((open) => !open)}
                    aria-expanded={expanded}
                    className="mt-3 inline-flex items-center gap-2 text-sm font-semibold hover:text-alarm-ink"
                >
                    {expanded ? "Show fewer engines" : `Show all ${engines.length} engines`}
                    <ChevronDownIcon className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
                </button>
            )}
        </section>
    );
}