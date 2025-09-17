"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet } from "lucide-react";
import { toast } from "sonner";

export type ConnectWalletProps = {
  onConnected?: (address: string) => void;
};

export const ConnectWallet: React.FC<ConnectWalletProps> = ({ onConnected }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const CHAIN_ID_HEX = "0x27"; // 39 decimal
  const NETWORK_PARAMS = {
    chainId: CHAIN_ID_HEX,
    chainName: "U2U Nebulas Testnet",
    nativeCurrency: { name: "U2U", symbol: "U2U", decimals: 18 },
    rpcUrls: ["https://rpc-nebulas-testnet.uniultra.xyz"],
    blockExplorerUrls: ["https://testnet.u2uscan.xyz"],
  } as const;

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const ethereum = (window as any)?.ethereum;
      if (!ethereum) {
        toast.error("MetaMask not found", { description: "Install MetaMask to connect your wallet." });
        return;
      }

      // Request accounts
      const accounts: string[] = await ethereum.request({ method: "eth_requestAccounts" });
      const acct = accounts?.[0];
      if (!acct) throw new Error("No account returned");

      // Switch / add U2U testnet
      try {
        await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_ID_HEX }] });
      } catch (err: any) {
        // Unrecognized chain, try to add it
        if (err?.code === 4902) {
          await ethereum.request({ method: "wallet_addEthereumChain", params: [NETWORK_PARAMS] });
        } else {
          throw err;
        }
      }

      setAddress(acct);
      try {
        localStorage.setItem("wallet_address", acct);
      } catch {}
      onConnected?.(acct);
      toast.success("Wallet connected", { description: `${acct.slice(0, 6)}…${acct.slice(-4)} on U2U Testnet` });
    } catch (e: any) {
      const message = e?.message || "Failed to connect wallet";
      toast.error("Connection failed", { description: message });
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {address ? (
        <Badge variant="secondary" className="font-mono">
          {address}
        </Badge>
      ) : (
        <Badge variant="outline">Wallet: Disconnected</Badge>
      )}
      <Button onClick={handleConnect} disabled={!!address || connecting}>
        <Wallet className="h-4 w-4 mr-2" />
        {address ? "Connected" : connecting ? "Connecting..." : "Connect Wallet"}
      </Button>
    </div>
  );
};

export default ConnectWallet;