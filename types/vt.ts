// Raw VirusTotal shapes: only the fields the app reads.

export type VtErrorBody = { error: { code: string; message: string } };

export type VtEngineResult = {
  engine_name: string;
  category: string;
  method: string;
  result: string;
};

// Response to POST /urls and POST /urls/{id}/analyse
export type VtScanResponse = {
  data: {
    type: string,
    id: string,
    links: {
      self: string,
    }
  }
}

export type VtUrlReport = {
  data: {
    id?: string; // SHA-256 of the URL
    attributes: {
      url: string;
      last_final_url?: string;
      last_http_response_code?: number;
      last_analysis_date: number; // Unix seconds
      last_analysis_stats: {
        malicious: number;
        suspicious: number;
        harmless: number;
        undetected: number;
        timeout: number;
      };
      last_analysis_results: Record<string, VtEngineResult>;
      categories?: Record<string, string>;
      threat_names?: string[];
      tags?: string[];
      // Page details VirusTotal captured. All of it is untrusted text from
      // the scanned site, so it must only ever be rendered as plain text.
      title?: string;
      web_category?: string;
      html_meta?: Record<string, string[]>; // e.g. "og:type": ["website"]
    };
  };
};

// Response to POST /urls (submitting a URL for analysis)
export type VtSubmitResponse = { data: { type: "analysis"; id: string } };

export type VtAnalysisStatus = "queued" | "in-progress" | "completed";

// Response to GET /analyses/{id}: only the fields the route reads.
// Note it uses "stats"/"results", not "last_analysis_*" like the URL report.
export type VtAnalysis = {
  data: {
    id: string;
    type: "url_analysis";
    attributes: {
      status: VtAnalysisStatus;
      date: number; // Unix seconds
      url: string;
      crawler_error?: string; // e.g. "unreachable"
    };
  };
  meta?: { url_info?: { id: string; url: string } };
};