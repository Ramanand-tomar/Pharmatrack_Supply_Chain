import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
  isActive?: boolean | (() => boolean);
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, isActive: customIsActive, ...props }, ref) => {
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={({ isActive: rrdIsActive, isPending }) => {
          const isActive = typeof customIsActive === 'function' ? customIsActive() : 
                          (customIsActive !== undefined ? customIsActive : rrdIsActive);
          return cn(className, isActive && activeClassName, isPending && pendingClassName);
        }}
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
