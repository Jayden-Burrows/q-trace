"use client"

import { useRef, useState } from "react";
import SingleFileDropzone from "@/components/FileUpload";
import ResultsDashboard from "@/components/analyze/ResultsDashboard";
import { EmptyState, ErrorPanel, ResultsSkeleton } from "@/components/analyze/StatusPanels";
import jsQR from "jsqr";
import type { VtUrlReport } from "@/types/vt";
import type { DomainResponse, ScreenshotResponse } from "@/types/api";
import type { DomainInfo } from "@/types/domain";
import AmbientBlob from "@/components/AmbientBlob";
import { getVerdict } from "@/lib/report";

export default function Home() {
  const [virusTotalData, setVirusTotalData] = useState<VtUrlReport | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [screenshot, setScreenShot] = useState<string | null>(null);
  const [screenshotPending, setScreenshotPending] = useState(false);
  const [domainInfo, setDomainInfo] = useState<DomainInfo | null>(null);
  // Bumped on every new upload or clear so a slow screenshot/RDAP response from an
  // earlier upload can't overwrite the current one.
  const runRef = useRef(0);
  const verdict = virusTotalData ? getVerdict(virusTotalData.data.attributes.last_analysis_stats) : null;

  function decodeQRCode(file: File): Promise<string | null> {
    return new Promise((resolve) => {
      const objectURL = URL.createObjectURL(file);
      let img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          URL.revokeObjectURL(objectURL);
          resolve(null);
          return;
        }

        ctx.drawImage(img, 0, 0);
        let { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(objectURL);

        resolve(jsQR(data, width, height)?.data ?? null);
      }

      img.onerror = () => {
        URL.revokeObjectURL(objectURL);
        resolve(null);
      }

      img.src = objectURL;
    });
  }

  function validateURL(text: string): string | null {
    let trimmedText = text.trim();

    if (trimmedText.length === 0 || trimmedText.length > 2048) {
      return null;
    }

    // Test if the regex starts with a protocol
    //    If it doesn't then prepend https://, so bare URLs like 
    //    example.com don't automatically get rejected as invalid 
    //    by the new URL() constructor 
    const hasProtocol =
      /^[a-z][a-z\d+.-]*:/i.test(trimmedText) && !/^[^/\s:]+:\d+(\/|$)/.test(trimmedText);
    const textWithProtocol = hasProtocol ? trimmedText : `https://${trimmedText}`;
    try {
      const url = new URL(textWithProtocol);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return null;
      }

      // reject URLs like localhost (127.0.0.1)
      if (!url.hostname.includes(".")) return null;

      // remove fragment identifiers from URL
      url.hash = "";
      return url.href;
    } catch (e) {
      return null;
    }
  }

  const MAX_REQUEST_ATTEMPTS = 10;
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  async function fetchVirusTotal(url: string, rescan = false) {
    let res = await fetch("/api/virus-total", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url, rescan }),
    });
    let analysisId: string | null = null;

    for (let requestAttempts = 0; requestAttempts <= MAX_REQUEST_ATTEMPTS; requestAttempts++) {
      const data = await res.json().catch(() => null);

      if (res.status === 429 && analysisId) {
        // Quota hit mid-poll: wait as told, then ask again.
        await sleep((data?.error?.retryAfterSeconds ?? 60) * 1000);
      } else if (!res.ok) {
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      } else if (data.status === "completed") {
        setVirusTotalData(data.report as VtUrlReport);
        return;
      } else {
        analysisId = data.analysisId;
        await sleep((data.pollAfterSeconds ?? 15) * 1000);
      }

      res = await fetch(`/api/virus-total?analysisId=${encodeURIComponent(analysisId!)}`);
    }

    throw new Error("VirusTotal is taking longer than expected. Try again in a minute.");
  }

  // Screenshot and RDAP are extras. They never throw: if either fails, the
  // VirusTotal result still shows.
  async function fetchSiteShot(url: string): Promise<string | null> {
    try {
      const res = await fetch("/api/site-shot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as ScreenshotResponse;
      return data.screenshot.url;
    } catch {
      return null;
    }
  }

  async function fetchRDAP(url: string): Promise<DomainInfo | null> {
    try {
      const res = await fetch("/api/rdap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as DomainResponse;
      return data.domain;
    } catch {
      return null;
    }
  }

  async function handleFile(file: File | null) {
    const run = ++runRef.current;
    setError(null);
    setVirusTotalData(null);
    setScreenShot(null);
    setScreenshotPending(false);
    setDomainInfo(null);

    if (!file) {
      setFileName(null);
      return;
    }

    setFileName(file.name);
    setLoading(true);
    try {
      // decode text from the QR code
      let text = await decodeQRCode(file);
      if (text === null) {
        setError("No QR code found in that image.");
        return;
      }

      // validate that the text is a valid URL
      let validatedUrl = validateURL(text);
      if (!validatedUrl) {
        setError("That QR code does not contain a valid URL.")
        return;
      }

      // The screenshot and RDAP lookups don't depend on VirusTotal, so start them
      // now and let them fill in whenever they finish.
      setScreenshotPending(true);
      fetchSiteShot(validatedUrl).then((shot) => {
        if (runRef.current !== run) return;
        setScreenShot(shot);
        setScreenshotPending(false);
      });
      fetchRDAP(validatedUrl).then((info) => {
        if (runRef.current === run) setDomainInfo(info);
      });

      // fetch the associated report
      await fetchVirusTotal(validatedUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    runRef.current++;
    setScreenShot(null);
    setScreenshotPending(false);
    setDomainInfo(null);
    setVirusTotalData(null);
    setError(null);
    setFileName(null);
    setResetKey(key => key + 1);
  }

  return (
    <main className="mx-auto w-full max-w-[1400px] px-5 pb-20 pt-10 sm:px-8 lg:px-11 lg:pt-16">
      <AmbientBlob verdict={verdict} />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <section aria-labelledby="page-title" className="lg:sticky lg:top-10 lg:self-start">
          <p className="label-mono flex items-center gap-3">
            <span className="h-px w-10 bg-ink/60" aria-hidden="true" />
            New analysis
          </p>
          <h1
            id="page-title"
            className="mt-5 font-display text-[clamp(2.75rem,8vw,5.25rem)] font-extrabold leading-[0.92] tracking-[-0.04em]"
          >
            Expose the destination.
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted">
            Upload a QR image to see where it leads before you scan it. The code is decoded in your
            browser. Only the link is sent out: to VirusTotal&apos;s security engines, to Site-Shot for a
            screenshot of the page, and its domain to a public RDAP registry lookup.
          </p>

          <div className="mt-8">
            <SingleFileDropzone key={resetKey} onFileSelect={handleFile} disabled={loading} />
          </div>
        </section>

        <section aria-label="Results" aria-live="polite" aria-busy={loading} className="min-w-0">
          {loading ? (
            <ResultsSkeleton />
          ) : error ? (
            <ErrorPanel message={error} />
          ) : virusTotalData ? (
            <ResultsDashboard report={virusTotalData} fileName={fileName} screenshot={screenshot} screenshotPending={screenshotPending} rdapInfo={domainInfo} onClear={handleClear} />
          ) : (
            <EmptyState />
          )}
        </section>
      </div>
    </main>
  );

}