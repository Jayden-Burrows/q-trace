import { AlertIcon } from "@/components/icons";

export function EmptyState() {
    return (
        <div className="border border-dashed border-line bg-surface/60 p-6 sm:p-10">
            <h2 className="font-display text-2xl font-bold tracking-tight">Your results will appear here</h2>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted">
                Add a QR code image to see a verdict, how each security engine rated the link, and, if it looks
                harmful, a report you can send to Google Safe Browsing.
            </p>
        </div>
    );
}

export function ResultsSkeleton() {
    const block = "bg-quiet-wash motion-safe:animate-pulse";

    return (
        <div role="status" className="border border-line bg-surface">
            <span className="sr-only">Checking this link...</span>
            <div aria-hidden="true">
                <div className="space-y-4 border-b border-line p-5 sm:p-7">
                    <div className="flex items-center gap-4">
                        <div className={`h-14 w-14 ${block}`} />
                        <div className="flex-1 space-y-3">
                            <div className={`h-3 w-28 ${block}`} />
                            <div className={`h-8 w-3/4 ${block}`} />
                        </div>
                    </div>
                    <div className={`h-4 w-full ${block}`} />
                </div>
                <div className="grid gap-6 p-5 sm:grid-cols-[1fr_11rem] sm:p-7">
                    <div className="space-y-3">
                        <div className={`h-4 w-full ${block}`} />
                        <div className={`h-4 w-5/6 ${block}`} />
                        <div className={`h-4 w-2/3 ${block}`} />
                    </div>
                    <div className={`mx-auto aspect-square w-40 rounded-full sm:w-full ${block}`} />
                </div>
                <div className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-4">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="bg-surface p-5">
                            <div className={`h-9 w-14 ${block}`} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function ErrorPanel({ message }: { message: string }) {
    return (
        <div role="alert" className="flex items-start gap-4 border border-alarm-line bg-alarm-wash p-5 sm:p-7">
            <AlertIcon className="mt-0.5 h-6 w-6 shrink-0 text-alarm-ink" />
            <div>
                <h2 className="font-display text-xl font-bold tracking-tight">We couldn&apos;t check that image</h2>
                <p className="mt-1 text-sm leading-relaxed">{message}</p>
            </div>
        </div>
    );
}