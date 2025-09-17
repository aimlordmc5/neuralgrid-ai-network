"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { readCoreTotalStats, getAccount, getTokenBalance } from "@/lib/web3";
import { toast } from "sonner";

export const OnchainStatus: React.FC = () => {
  const core = process.env.NEXT_PUBLIC_CORE_ADDRESS;
  const token = process.env.NEXT_PUBLIC_TOKEN_ADDRESS;
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<null | {
    totalNodes: number;
    totalJobs: number;
    activeJobs: number;
  }>(null);
  const [balance, setBalance] = useState<number | null>(null);

  const handleCheck = async () => {
    try {
      setLoading(true);
      const res = await readCoreTotalStats();
      setStats(res);
      // If token address is configured, also read connected user's NGR balance
      if (token) {
        try {
          const addr = await getAccount();
          const bal = await getTokenBalance(addr);
          setBalance(bal);
        } catch (e: any) {
          // Show a soft warning but don't fail the main action
          toast.message("Couldn't fetch NGR balance", {
            description: e?.message || "Wallet not connected or wrong network",
          });
        }
      }
      toast.success(
        `On-chain stats — Nodes: ${res.totalNodes}, Jobs: ${res.totalJobs}, Active: ${res.activeJobs}`
      );
    } catch (e: any) {
      toast.error(e?.message || "Failed to read on-chain stats");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="font-medium">On-chain Status</p>
          <p className="text-muted-foreground">
            Core: <span className="font-mono">{core ? core : "—"}</span>
          </p>
          <p className="text-muted-foreground">
            Token: <span className="font-mono">{token ? token : "—"}</span>
          </p>
          {balance !== null && (
            <p className="text-muted-foreground">
              Your NGR: <span className="font-semibold">{balance.toLocaleString()}</span>
            </p>
          )}
        </div>
        <Button size="sm" onClick={handleCheck} disabled={loading || !core}>
          {loading ? "Checking…" : "Check On-chain Stats"}
        </Button>
      </div>
      {stats && (
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-md bg-secondary p-2">
            <div className="text-xs text-muted-foreground">Nodes</div>
            <div className="text-base font-semibold">{stats.totalNodes}</div>
          </div>
          <div className="rounded-md bg-secondary p-2">
            <div className="text-xs text-muted-foreground">Jobs</div>
            <div className="text-base font-semibold">{stats.totalJobs}</div>
          </div>
          <div className="rounded-md bg-secondary p-2">
            <div className="text-xs text-muted-foreground">Active</div>
            <div className="text-base font-semibold">{stats.activeJobs}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnchainStatus;