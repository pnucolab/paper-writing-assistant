/**
 * pubmed.ts — Minimal PubMed (NCBI E-utilities) client with 1s/3req rate limit
 *
 * Requirements:
 * - Node 18+ (global fetch) or browsers.
 * - Respect default NCBI rate limit (≤ 3 req/sec without API key).
 * - Lightweight retry for 429/5xx with Retry-After + exponential backoff.
 */

// --------------------------------- Types ---------------------------------
export type ESearchResponse = {
  esearchresult?: {
    count?: string;
    idlist?: string[];
  };
};

export type ESummaryAuthor = {
  name?: string;
};

export type ESummaryArticleId = {
  idtype?: string;
  value?: string;
};

export type ESummaryItem = {
  title?: string;
  fulljournalname?: string;
  pubdate?: string;
  authors?: ESummaryAuthor[];
  articleids?: ESummaryArticleId[];
};

export type ESummaryResponse = {
  result?: Record<string, ESummaryItem> & { uids?: string[] };
};

export type SearchOptions = {
  term: string;
  retmax?: number; // default 20
  retstart?: number; // default 0
  sort?: "most+recent" | "pub+date" | "relevance" | "author" | "journal" | "title";
  mindate?: string; // e.g. "2024/01/01"
  maxdate?: string; // e.g. "2025/08/24"
  datetype?: "pdat" | "edat" | "mdat"; // publish / entry / modification date
};

export type SearchResult = {
  count: number;
  pmids: string[];
};

export type SummaryEntry = {
  pmid: string;
  title?: string;
  journal?: string;
  pubdate?: string;
  authors?: string[];
  doi?: string;
};

export type PubMedClientOptions = {
  apiKey?: string; // optional; allows higher throughput on NCBI but we keep limiter at 3 rps by default
  maxRps?: number; // default 3
  baseUrl?: string; // override for testing
};

// --------------------------- Utility: build URL ---------------------------
function buildUrl(base: string, params: Record<string, unknown>): string {
  const u = new URL(base);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") u.searchParams.set(k, String(v));
  }
  return u.toString();
}

// -------------------------- Token-bucket limiter --------------------------
class RateLimiter {
  private capacity: number;
  private tokens: number;
  private queue: Array<{
    task: () => Promise<Response> | Response;
    resolve: (value: Response | PromiseLike<Response>) => void;
    reject: (reason?: unknown) => void;
  }> = [];

  constructor(maxPerSecond = 3) {
    this.capacity = maxPerSecond;
    this.tokens = maxPerSecond;
    setInterval(() => {
      this.tokens = this.capacity; // refill once per second
      this.drain();
    }, 1000);
  }

  schedule<T extends Response>(task: () => Promise<T> | T): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ task: task as any, resolve: resolve as any, reject });
      this.drain();
    });
  }

  private drain() {
    while (this.tokens > 0 && this.queue.length > 0) {
      const { task, resolve, reject } = this.queue.shift()!;
      this.tokens -= 1;
      Promise.resolve()
        .then(task)
        .then(resolve)
        .catch(reject);
    }
  }
}

// ------------------------------- Main client ------------------------------
export class PubMedClient {
  private base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
  private apiKey?: string;
  private limiter: RateLimiter;

  constructor(opts: PubMedClientOptions = {}) {
    this.apiKey = opts.apiKey;
    this.base = opts.baseUrl ?? this.base;
    this.limiter = new RateLimiter(opts.maxRps ?? 3);
  }

  private async request(path: string, params: Record<string, unknown> = {}, retries = 2): Promise<Response> {
    const url = buildUrl(`${this.base}/${path}`, { ...params, api_key: this.apiKey });
    const doFetch = () => fetch(url, { method: "GET" });

    let res = await this.limiter.schedule(doFetch);
    let attempt = 0;

    while (!res.ok && attempt < retries && (res.status === 429 || (res.status >= 500 && res.status < 600))) {
      attempt += 1;
      const retryAfter = Number(res.headers.get("retry-after"));
      const delayMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : Math.min(2000, 400 * 2 ** (attempt - 1));
      await new Promise((r) => setTimeout(r, delayMs));
      res = await this.limiter.schedule(doFetch);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText} – ${text.slice(0, 200)}`);
    }
    return res;
  }

  /**
   * ESearch: search PMIDs by term and optional filters.
   */
  async esearch(opts: SearchOptions): Promise<SearchResult> {
    const res = await this.request("esearch.fcgi", {
      db: "pubmed",
      term: opts.term,
      retmax: opts.retmax ?? 20,
      retstart: opts.retstart ?? 0,
      retmode: "json",
      sort: opts.sort,
      mindate: opts.mindate,
      maxdate: opts.maxdate,
      datetype: opts.datetype ?? "pdat",
    });

    const json = (await res.json()) as ESearchResponse;
    return {
      count: Number(json.esearchresult?.count ?? 0),
      pmids: json.esearchresult?.idlist ?? [],
    };
  }

  /**
   * ESummary: fetch summary metadata for a list of PMIDs (order preserved as given).
   */
  async esummary(pmids: string[]): Promise<SummaryEntry[]> {
    if (!pmids?.length) return [];
    const res = await this.request("esummary.fcgi", {
      db: "pubmed",
      id: pmids.join(","),
      retmode: "json",
    });

    const json = (await res.json()) as ESummaryResponse;
    const out: SummaryEntry[] = [];
    for (const pmid of pmids) {
      const item = json.result?.[pmid];
      if (!item) continue;
      const doi = item.articleids?.find((a) => a.idtype === "doi")?.value;
      out.push({
        pmid,
        title: item.title,
        journal: item.fulljournalname,
        pubdate: item.pubdate,
        authors: (item.authors ?? []).map((a) => a.name ?? "").filter(Boolean),
        doi,
      });
    }
    return out;
  }

  /**
   * EFetch: XML payload (for abstracts, etc.).
   * Note: EFetch for PubMed does not provide JSON; use XML parsing if needed.
   */
  async efetchXml(pmids: string[]): Promise<string> {
    if (!pmids?.length) return "<Empty/>";
    const res = await this.request("efetch.fcgi", {
      db: "pubmed",
      id: pmids.join(","),
      retmode: "xml",
    });
    return await res.text();
  }
}

export default PubMedClient;