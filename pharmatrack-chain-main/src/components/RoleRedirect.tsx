import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useWeb3 } from "@/contexts/Web3Context";
import { type UserRole } from "@/lib/contract";

const ROLE_ROUTES: Record<UserRole, string> = {
  owner: "/owner",
  rms: "/rms",
  manufacturer: "/manufacturer",
  distributor: "/distributor",
  retailer: "/retailer",
  public: "/customer",
};

export const RoleRedirect = () => {
  const { role, account } = useWeb3();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!account) return;

    const targetRoute = ROLE_ROUTES[role];
    
    // Don't redirect from landing page
    if (location.pathname === "/") return;
    
    if (targetRoute && !location.pathname.startsWith(targetRoute)) {
      console.log(`Redirecting to ${targetRoute} for role ${role}`);
      navigate(targetRoute, { replace: true });
    }
  }, [role, account, navigate, location.pathname]);

  return null;
};
