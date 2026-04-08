import {
  Home, Users, Pill, Settings, Truck, Factory, Package, ShoppingCart, Search, ShoppingBag, LogOut, User as UserIcon, Wallet
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useWeb3 } from "@/contexts/Web3Context";
import { cn } from "@/lib/utils";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar, SidebarFooter, SidebarSeparator
} from "@/components/ui/sidebar";

const publicItems = [
  { title: "Track Product", url: "/#tracking-section", icon: Search },
];

const customerItems = [
  { title: "My Purchases", url: "/customer", icon: ShoppingBag },
  { title: "Track Product", url: "/customer?tab=tracking", icon: Search },
];

const ownerItems = [
  { title: "Dashboard", url: "/owner", icon: Home },
  { title: "Participants", url: "/owner/participants", icon: Users },
  { title: "Medicines", url: "/owner/medicines", icon: Pill },
  { title: "Settings", url: "/owner/settings", icon: Settings },
];

const rmsItems = [
  { title: "Dashboard", url: "/rms", icon: Package },
];

const manItems = [
  { title: "Dashboard", url: "/manufacturer", icon: Factory },
];

const disItems = [
  { title: "Dashboard", url: "/distributor", icon: Truck },
];

const retItems = [
  { title: "Dashboard", url: "/retailer", icon: ShoppingCart },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { role, account, connectWallet, disconnectWallet, isConnecting } = useWeb3();

  // Helper to determine if a link is active, including query param awareness
  const isActiveLink = (toUrl: string) => {
    const currentPath = location.pathname;
    const currentSearch = location.search;
    
    // Split URL into path and search
    const [targetPath, targetSearch] = toUrl.split('?');
    
    if (targetSearch) {
      // If target has search params, both path and search must match
      return currentPath === targetPath && currentSearch === `?${targetSearch}`;
    }
    
    // Default path matching
    return currentPath === targetPath;
  };

  const roleMenuMap: Record<string, typeof publicItems> = {
    owner: ownerItems,
    rms: rmsItems,
    manufacturer: manItems,
    distributor: disItems,
    retailer: retItems,
    public: customerItems,
  };

  const items = roleMenuMap[role] || publicItems;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && "Navigation"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      isActive={() => isActiveLink(item.url)}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tracking link for all roles */}
        {role !== "public" && (
          <SidebarGroup>
            <SidebarGroupLabel>{!collapsed && "General"}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Track Product">
                    <NavLink
                      to="/#tracking-section"
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      isActive={() => isActiveLink("/#tracking-section")}
                    >
                      <Search className="mr-2 h-4 w-4" />
                      {!collapsed && <span>Track Product</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarSeparator />
      
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className={cn(
              "flex items-center gap-2 px-2 py-2 rounded-md bg-sidebar-accent/30 glass-card mb-2",
              collapsed && "justify-center px-0"
            )}>
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <UserIcon className="h-4 w-4 text-primary" />
              </div>
              {!collapsed && (
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-medium truncate capitalize">{role}</span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Not Connected"}
                  </span>
                </div>
              )}
            </div>
          </SidebarMenuItem>
          
          {account ? (
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={disconnectWallet}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                tooltip="Disconnect Wallet"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {!collapsed && <span>Disconnect</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : (
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={connectWallet}
                disabled={isConnecting}
                className="text-primary hover:text-primary hover:bg-primary/10"
                tooltip="Connect Wallet"
              >
                <Wallet className="mr-2 h-4 w-4" />
                {!collapsed && <span>{isConnecting ? "Connecting..." : "Connect Wallet"}</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
