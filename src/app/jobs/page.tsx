import JobsClient from "@/components/jobs/JobsClient";
import { headers } from "next/headers";

export default async function JobsPage() {
  const h = headers();
  const protocol = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host");
  const base = `${protocol}://${host}`;

  let jobs: any[] = [];
  try {
    const res = await fetch(`${base}/api/jobs`, { cache: "no-store" });
    if (res.ok) {
      jobs = await res.json();
    } else {
      // fallback if non-200
      jobs = [
        { title: "Image Classification Batch", reward: "120 NGR", deadline: "in 2h", requiredNodes: 5, status: "PENDING" as const },
        { title: "Sentiment Analysis", reward: "75 NGR", deadline: "in 50m", requiredNodes: 3, status: "ACTIVE" as const },
        { title: "ETL: CSV → Parquet", reward: "40 NGR", deadline: "in 1d", requiredNodes: 2, status: "PENDING" as const },
      ];
    }
  } catch {
    // Fallback to mock data if API is unavailable
    jobs = [
      { title: "Image Classification Batch", reward: "120 NGR", deadline: "in 2h", requiredNodes: 5, status: "PENDING" as const },
      { title: "Sentiment Analysis", reward: "75 NGR", deadline: "in 50m", requiredNodes: 3, status: "ACTIVE" as const },
      { title: "ETL: CSV → Parquet", reward: "40 NGR", deadline: "in 1d", requiredNodes: 2, status: "PENDING" as const },
    ];
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Jobs Marketplace</h1>
          <p className="text-sm text-muted-foreground">Browse available AI compute jobs and join to earn NGR.</p>
        </div>
      </div>
      <JobsClient initialJobs={jobs} />
    </main>
  );
}