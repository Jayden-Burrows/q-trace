type IconProps = { className?: string };

const base = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
};

export function UploadIcon({ className = "h-6 w-6" }: IconProps) {
    return (
        <svg {...base} className={className}>
            <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </svg>
    );
}

export type ShieldVariant = "x" | "alert" | "check" | "unknown";

const SHIELD_MARKS: Record<ShieldVariant, string> = {
    x: "M9.5 9.5l5 5M14.5 9.5l-5 5",
    alert: "M12 8.5v4M12 15.5h.01",
    check: "M9 12l2.2 2.2L15.5 10",
    unknown: "M9.8 9.6a2.3 2.3 0 1 1 3.3 2.1c-.7.4-1.1.9-1.1 1.7M12 16.5h.01",
};

export function ShieldIcon({ variant, className = "h-6 w-6" }: IconProps & { variant: ShieldVariant }) {
    return (
        <svg {...base} className={className}>
            <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z" />
            <path d={SHIELD_MARKS[variant]} />
        </svg>
    );
}

export function GlobeIcon({ className = "h-5 w-5" }: IconProps) {
    return (
        <svg {...base} className={className}>
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
        </svg>
    );
}

export function CopyIcon({ className = "h-4 w-4" }: IconProps) {
    return (
        <svg {...base} className={className}>
            <rect x="9" y="9" width="11" height="11" rx="1.5" />
            <path d="M5 15V5.5A1.5 1.5 0 0 1 6.5 4H15" />
        </svg>
    );
}

export function CheckIcon({ className = "h-4 w-4" }: IconProps) {
    return (
        <svg {...base} className={className}>
            <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
    );
}

export function ChevronDownIcon({ className = "h-4 w-4" }: IconProps) {
    return (
        <svg {...base} className={className}>
            <path d="M6 9l6 6 6-6" />
        </svg>
    );
}

export function ExternalIcon({ className = "h-4 w-4" }: IconProps) {
    return (
        <svg {...base} className={className}>
            <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
        </svg>
    );
}

export function AlertIcon({ className = "h-5 w-5" }: IconProps) {
    return (
        <svg {...base} className={className}>
            <path d="M12 3.5l9.5 16.5h-19L12 3.5z" />
            <path d="M12 10v4.5M12 17.5h.01" />
        </svg>
    );
}