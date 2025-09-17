import Link from "next/link";
import { Button } from "@/components/ui/button";
import ConnectWallet from "@/components/ConnectWallet";
import ComputeWorker from "@/components/ComputeWorker";
import { JobCard } from "@/components/JobCard";
import RegisterNode from "@/components/RegisterNode";
import NetworkStats from "@/components/NetworkStats";
import { headers } from "next/headers";
import OnchainStatus from "@/components/OnchainStatus";

export default async function Home() {
  const h = headers();
  const protocol = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host");
  const base = `${protocol}://${host}`;

  let stats: { totalNodes: number; activeJobs: number; totalRewards: number } = {
    totalNodes: 0,
    activeJobs: 0,
    totalRewards: 0,
  };
  let jobs: any[] = [];

  try {
    const [statsRes, jobsRes] = await Promise.all([
      fetch(`${base}/api/stats/network`, { cache: "no-store" }),
      fetch(`${base}/api/jobs`, { cache: "no-store" }),
    ]);
    if (statsRes.ok) stats = await statsRes.json();
    if (jobsRes.ok) jobs = (await jobsRes.json()).slice(0, 2);
  } catch {
    // Fallback to mock data if API is unavailable
    stats = { totalNodes: 128, activeJobs: 7, totalRewards: 12450 };
    jobs = [
      { title: "Image Classification Batch", reward: "120 NGR", deadline: "in 2h", requiredNodes: 5, status: "PENDING" as const },
      { title: "Sentiment Analysis", reward: "75 NGR", deadline: "in 50m", requiredNodes: 3, status: "ACTIVE" as const },
    ];
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">NeuralGrid Dashboard</h1>
          <p className="text-sm text-muted-foreground">Connect your wallet, start computing, and earn NGR tokens.</p>
        </div>
        <ConnectWallet />
      </div>

      <NetworkStats totalNodes={stats.totalNodes} activeJobs={stats.activeJobs} totalRewards={stats.totalRewards} />

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ComputeWorker />
          <div className="mt-6">
            <RegisterNode />
          </div>
        </div>
        <div className="lg:col-span-1 space-y-4">
          <OnchainStatus />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Available Jobs</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/jobs">View all</Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {jobs.map((j: any, i: number) => (
              <JobCard key={i} {...j} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}