"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Square, Activity } from "lucide-react";
import { toast } from "sonner";

export type ComputeWorkerProps = {
  onStart?: () => void;
  onStop?: () => void;
};

export const ComputeWorker: React.FC<ComputeWorkerProps> = ({ onStart, onStop }) => {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        setProgress((p) => {
          const next = Math.min(100, p + Math.random() * 8);
          return next;
        });
      }, 500);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running]);

  useEffect(() => {
    if (progress >= 100 && running) {
      setRunning(false);
      onStop?.();
      toast.success("Job completed", { description: "Result submitted. Earned 10 NGR." });
    }
  }, [progress, running, onStop]);

  const handleStart = () => {
    setProgress(0);
    setRunning(true);
    onStart?.();
    toast.success("Compute started", { description: "Simulating AI job…" });
  };

  const handleStop = () => {
    setRunning(false);
    onStop?.();
    toast.info("Compute stopped", { description: "You can resume anytime." });
  };

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <CardTitle>Compute Worker</CardTitle>
        </div>
        <CardDescription>Simulated AI job execution with progress.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress} />
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">{running ? "Running" : progress >= 100 ? "Completed" : "Idle"}</div>
          <div className="flex gap-2">
            <Button onClick={handleStart} disabled={running} size="sm">
              <Play className="h-4 w-4 mr-2" /> Start
            </Button>
            <Button onClick={handleStop} disabled={!running} variant="secondary" size="sm">
              <Square className="h-4 w-4 mr-2" /> Stop
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ComputeWorker;