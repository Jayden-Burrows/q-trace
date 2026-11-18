"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, CopyIcon } from "@/components/icons";
import { copyText } from "@/lib/clipboard";

type CopyButtonProps = {
    text: string;
    label?: string;
    className?: string;
};

export default function CopyButton({ text, label = "Copy", className = "" }: CopyButtonProps) {
    const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => () => clearTimeout(timer.current), []);

    async function handleClick() {
        const ok = await copyText(text);
        setState(ok ? "copied" : "failed");
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setState("idle"), 2000);
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            className={`inline-flex shrink-0 items-center gap-2 border border-ink/30 bg-surface px-3 py-1.5 text-sm font-semibold transition-colors hover:border-ink hover:bg-ink hover:text-white ${className}`}
        >
            {state === "copied" ? <CheckIcon /> : <CopyIcon />}
            <span aria-live="polite">
                {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label}
            </span>
        </button>
    );
}