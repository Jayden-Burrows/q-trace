import { NextResponse } from "next/server";
import type { ErrorCode } from "@/types/api";

// Shape matches types/api.ts ApiError, same as the virus-total route.
export function fail(status: number, code: ErrorCode, message: string, retryAfterSeconds?: number) {
    return NextResponse.json(
        { error: { code, message, ...(retryAfterSeconds ? { retryAfterSeconds } : {}) } },
        { status, headers: retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : undefined },
    );
}
