import { Wallet, Moon, Sun, LogOut, Loader2 } from "lucide-react";
import { useWeb3 } from "@/contexts/Web3Context";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppHeader() {
  const { account, balance, role, isConnecting, connectWallet, disconnectWallet } = useWeb3();
  const { theme, toggleTheme } = useTheme();

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const roleBadge: Record<string, string> = {
    owner: "Owner",
    rms: "Raw Material Supplier",
    manufacturer: "Manufacturer",
    distributor: "Distributor",
    retailer: "Retailer",
    public: "Public",
  };

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-4 gap-3 sticky top-0 z-30">
      <SidebarTrigger className="mr-1" />

      <div className="flex items-center gap-2">
        <div className="gradient-primary rounded-lg p-1.5">
          <Wallet className="h-5 w-5 text-primary-foreground" />
        </div>
        <h1 className="text-lg font-display font-bold gradient-text hidden sm:block">PharmaChain</h1>
      </div>

      <div className="flex-1" />

      <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground">
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      {account ? (
        <div className="flex items-center gap-2">
          <div className="hidden md:flex flex-col items-end text-xs">
            <span className="text-muted-foreground">{truncate(account)}</span>
            <span className="text-muted-foreground">{balance} ETH</span>
          </div>
          <span className="text-xs font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-full">
            {roleBadge[role]}
          </span>
          <Button variant="ghost" size="icon" onClick={disconnectWallet} className="text-muted-foreground">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button onClick={connectWallet} disabled={isConnecting} className="gradient-primary text-primary-foreground">
          {isConnecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wallet className="h-4 w-4 mr-2" />}
          Connect Wallet
        </Button>
      )}
    </header>
  );
}
