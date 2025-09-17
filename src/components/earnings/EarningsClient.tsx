"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export type Earning = {
  id: number;
  amount: number; // integer NGR units
  createdAt: number; // timestamp
  jobId: number | null;
  jobTitle?: string | null;
};

export const EarningsClient = () => {
  const [address, setAddress] = useState<string | null>(null);
  const [data, setData] = useState<Earning[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const a = localStorage.getItem("wallet_address");
      setAddress(a);
    } catch {}
  }, []);

  const fetchEarnings = async () => {
    if (!address) {
      setData(null);
      setError("Connect your wallet to view earnings");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("bearer_token");
      const res = await fetch(`/api/earnings?address=${encodeURIComponent(address)}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Failed with ${res.status}`);
      }
      const list: Earning[] = await res.json();
      setData(list);
    } catch (e: any) {
      setError(e?.message || "Failed to load earnings");
      toast.error("Failed to load earnings", { description: e?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // auto-fetch when address becomes available
    if (address) fetchEarnings();
  }, [address]);

  const total = useMemo(() => {
    if (!data) return 0;
    return data.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [data]);

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="md:col-span-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Total Balance</CardTitle>
              <CardDescription>Available NGR tokens</CardDescription>
            </div>
            {!address ? <Badge variant="outline">Wallet: Disconnected</Badge> : <Badge variant="secondary">{address.slice(0,6)}…{address.slice(-4)}</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold">{(total || 0).toLocaleString()} NGR</div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={fetchEarnings} disabled={loading || !address}>
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
          {error && <div className="mt-3 text-sm text-destructive">{error}</div>}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Payouts</CardTitle>
              <CardDescription>Latest rewards from completed jobs</CardDescription>
            </div>
            <Badge variant="secondary">{address ? "Live" : "Connect wallet"}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Job</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data && !loading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">{error || "No data"}</TableCell>
                </TableRow>
              )}
              {loading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">Loading…</TableCell>
                </TableRow>
              )}
              {data?.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">No payouts yet</TableCell>
                </TableRow>
              )}
              {data?.map((e) => {
                const date = new Date(e.createdAt).toISOString().slice(0, 10);
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.id}</TableCell>
                    <TableCell>{e.jobTitle || `Job #${e.jobId ?? "-"}`}</TableCell>
                    <TableCell className="text-right font-medium">+{Number(e.amount).toLocaleString()} NGR</TableCell>
                    <TableCell className="text-right text-muted-foreground">{date}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
};

export default EarningsClient;