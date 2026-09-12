import { Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { shortAddress, useWallet } from "@/lib/wallet";

export function WalletButton() {
  const { address, available, connecting, connect, disconnect, error } = useWallet();

  if (address) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2 border-primary/40 bg-primary/10 font-mono text-xs"
        onClick={() => {
          disconnect();
          toast("Wallet disconnected");
        }}
      >
        <span className="size-1.5 rounded-full bg-success" />
        {shortAddress(address)}
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      className="gap-2 bg-gradient-accent font-medium text-primary-foreground"
      disabled={connecting}
      onClick={async () => {
        await connect();
        if (!available) {
          toast.error("MetaMask not detected", {
            description: "Install the MetaMask extension to link an agent wallet.",
          });
        } else if (error) {
          toast.error("Connection failed", { description: error });
        }
      }}
    >
      <Wallet className="size-4" />
      {connecting ? "Connecting…" : "Connect MetaMask"}
    </Button>
  );
}
