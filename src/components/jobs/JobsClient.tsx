"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { JobCard } from "@/components/JobCard";
import { toast } from "sonner";
import { createOnchainJob } from "@/lib/web3";

export type JobStatus = "PENDING" | "ACTIVE" | "COMPLETED";
export type Job = {
  // add id so we can call join/submit endpoints
  id?: number;
  title: string;
  reward: string; // e.g. "120 NGR"
  deadline: string; // e.g. "in 2h"
  requiredNodes: number;
  status: JobStatus;
  onchainId?: number | null;
  onchainTx?: string | null;
};

export interface JobsClientProps {
  initialJobs: Job[];
}

export const JobsClient = ({ initialJobs }: JobsClientProps) => {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [statusFilter, setStatusFilter] = useState<"ALL" | JobStatus>("ALL");
  const [sortBy, setSortBy] = useState<"reward_desc" | "deadline_asc">("reward_desc");
  const [open, setOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Create form state
  const [form, setForm] = useState({
    title: "",
    reward: 50,
    requiredNodes: 1,
    deadline: "in 2h",
    description: "",
  });

  const filteredSorted = useMemo(() => {
    let list = [...jobs];
    if (statusFilter !== "ALL") list = list.filter((j) => j.status === statusFilter);
    // Sort helpers
    if (sortBy === "reward_desc") {
      list.sort((a, b) => parseFloat(a.reward) && parseFloat(b.reward) ? parseFloat(b.reward) - parseFloat(a.reward) : 0);
    } else {
      // Very rough deadline sort based on unit priority
      const weight = (d: string) => {
        const m = d.match(/in\s+(\d+)\s*(m|h|d)/i);
        if (!m) return Infinity;
        const v = Number(m[1]);
        const u = m[2].toLowerCase();
        if (u === "m") return v; // minutes
        if (u === "h") return v * 60;
        if (u === "d") return v * 60 * 24;
        return Infinity;
      };
      list.sort((a, b) => weight(a.deadline) - weight(b.deadline));
    }
    return list;
  }, [jobs, statusFilter, sortBy]);

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }

    const address = typeof window !== "undefined" ? localStorage.getItem("wallet_address") : null;
    if (!address) {
      toast.error("Connect wallet first", { description: "Please connect your wallet to create a job." });
      return;
    }

    try {
      // 1) Try on-chain create if CORE is configured
      let onchainJobId: number | undefined = undefined;
      let txHash: string | undefined = undefined;
      if (process.env.NEXT_PUBLIC_CORE_ADDRESS) {
        try {
          const res = await createOnchainJob({
            description: (form.description?.trim() || form.title.trim()),
            requiredNodes: Math.max(1, Number(form.requiredNodes) || 1),
            deadline: form.deadline || "in 2h",
            rewardNgrOrU2U: Number(form.reward) || 0,
          });
          onchainJobId = res.jobId;
          txHash = res.txHash;
          toast.success("On-chain job created", {
            description: txHash ? `Tx: ${txHash.slice(0, 10)}…` : "Transaction sent",
          });
        } catch (e: any) {
          toast.warning("On-chain create failed", { description: e?.message || "Falling back to off-chain" });
        }
      }

      // 2) Persist to API (DB)
      const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null;
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description?.trim() || "",
          reward: Number(form.reward),
          requiredNodes: Math.max(1, Number(form.requiredNodes) || 1),
          deadline: form.deadline || "in 2h",
          requesterAddress: address,
          // Pass-through (ignored by API today, useful later)
          onchainId: onchainJobId,
          onchainTx: txHash,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        throw new Error(err?.error || `Failed with ${res.status}`);
      }

      const created: Job = await res.json();
      setJobs((prev) => [created, ...prev]);
      setOpen(false);
      setForm({ title: "", reward: 50, requiredNodes: 1, deadline: "in 2h", description: "" });
      toast.success("Job listed", { description: onchainJobId ? `On-chain ID ${onchainJobId}` : "Off-chain listing created" });
    } catch (e: any) {
      toast.error("Creation failed", { description: e?.message || "Try again" });
    }
  };

  const handleAction = async (job: Job) => {
    if (typeof job.id !== "number") {
      toast.error("Missing job ID", { description: "Try refreshing the page." });
      return;
    }
    const address = typeof window !== "undefined" ? localStorage.getItem("wallet_address") : null;
    if (!address) {
      toast.error("Connect wallet first", { description: "Please connect your wallet to continue." });
      return;
    }
    try {
      setActionLoadingId(job.id);
      const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null;
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      if (job.status === "PENDING") {
        const res = await fetch(`/api/jobs/${job.id}/join`, {
          method: "POST",
          headers,
          body: JSON.stringify({ workerAddress: address }),
        });
        const data = await res.json().catch(() => ({} as any));
        if (!res.ok) throw new Error(data?.error || `Join failed (${res.status})`);
        setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: data.status || "ACTIVE" } : j)));
        toast.success("Joined job", { description: "You're now participating in this job." });
      } else if (job.status === "ACTIVE") {
        const res = await fetch(`/api/jobs/${job.id}/submit`, {
          method: "POST",
          headers,
          body: JSON.stringify({ workerAddress: address }),
        });
        const data = await res.json().catch(() => ({} as any));
        if (!res.ok) throw new Error(data?.error || `Submit failed (${res.status})`);
        setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: "COMPLETED" } : j)));
        const amount = typeof data?.amount === "number" ? data.amount : undefined;
        toast.success("Work submitted", { description: amount ? `Earned ${amount} NGR` : "Submission successful" });
      }
    } catch (e: any) {
      toast.error("Action failed", { description: e?.message || "Please try again" });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="w-48">
            <Label className="mb-1 block">Status</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-56">
            <Label className="mb-1 block">Sort by</Label>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reward_desc">Reward (high → low)</SelectItem>
                <SelectItem value="deadline_asc">Deadline (soonest)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Create Job</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Create a new job</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-1">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Image Classification Batch" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1">
                  <Label htmlFor="reward">Reward (NGR)</Label>
                  <Input
                    id="reward"
                    type="number"
                    min={1}
                    value={form.reward}
                    onChange={(e) => setForm((f) => ({ ...f, reward: Number(e.target.value) }))}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="nodes">Required Nodes</Label>
                  <Input
                    id="nodes"
                    type="number"
                    min={1}
                    value={form.requiredNodes}
                    onChange={(e) => setForm((f) => ({ ...f, requiredNodes: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div className="grid gap-1">
                <Label htmlFor="deadline">Deadline (e.g. in 2h)</Label>
                <Input id="deadline" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="desc">Description</Label>
                <Textarea id="desc" rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSorted.map((j, i) => (
          <JobCard
            key={j.id ?? i}
            {...j}
            // Show action only for PENDING/ACTIVE
            onAction={actionLoadingId ? undefined : () => handleAction(j)}
          />
        ))}
      </section>
    </div>
  );
};

export default JobsClient;