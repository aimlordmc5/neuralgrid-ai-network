"use client";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Cpu } from "lucide-react";
import { toast } from "sonner";

export type RegisterNodeProps = {
  onRegistered?: (computePower: number) => void;
};

export const RegisterNode: React.FC<RegisterNodeProps> = ({ onRegistered }) => {
  const [computePower, setComputePower] = useState<number>(50);
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setLoading(true);
    try {
      const address = typeof window !== "undefined" ? localStorage.getItem("wallet_address") : null;
      if (!address) {
        toast.error("Connect wallet first", { description: "Please connect your wallet to register your node." });
        return;
      }

      const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null;
      const res = await fetch("/api/nodes/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ address, computePower }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Failed with ${res.status}`);
      }

      await res.json();
      setRegistered(true);
      onRegistered?.(computePower);
      toast.success("Node registered", { description: `Compute power: ${computePower} GFLOPS` });
    } catch (e: any) {
      toast.error("Registration failed", { description: e?.message || "Try again" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-primary" />
          <CardTitle>Register as Compute Node</CardTitle>
        </div>
        <CardDescription>Advertise your device's capacity to receive AI jobs.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2">
          <Label htmlFor="power">Compute Power (GFLOPS)</Label>
          <Input
            id="power"
            type="number"
            min={1}
            value={computePower}
            onChange={(e) => setComputePower(Math.max(1, Number(e.target.value) || 1))}
            placeholder="e.g. 75"
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleRegister} disabled={registered || loading}>
            {registered ? "Registered" : loading ? "Registering…" : "Register Node"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RegisterNode;