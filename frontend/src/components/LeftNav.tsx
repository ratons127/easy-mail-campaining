import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  Users,
  Building2,
  MapPin,
  Target,
  Mail,
  CheckSquare,
  BarChart3,
  ShieldCheck,
  Settings,
  LayoutGrid,
  ChevronLeft
} from "lucide-react";
import { useAuth, hasRole, Role } from "../lib/auth";
import { cn } from "../lib/utils";

const navGroups = [
  {
    label: "Home",
    icon: Home,
    to: "/",
    roles: [] as Role[]
  },
  {
    label: "Directory",
    icon: Users,
    items: [
      { label: "Employees", to: "/directory/employees", roles: [] as Role[] },
      { label: "Departments", to: "/directory/departments", roles: [] as Role[] },
      { label: "Locations", to: "/directory/locations", roles: [] as Role[] }
    ]
  },
  {
    label: "Audiences",
    icon: Target,
    to: "/audiences",
    roles: ["SUPER_ADMIN", "HR_ADMIN", "DEPT_ADMIN", "SENDER"] as Role[]
  },
  {
    label: "Campaigns",
    icon: Mail,
    items: [
      { label: "All campaigns", to: "/campaigns", roles: [] as Role[] },
      { label: "Drafts", to: "/campaigns?status=DRAFT", roles: [] as Role[] },
      { label: "Pending approval", to: "/campaigns?status=PENDING_APPROVAL", roles: [] as Role[] },
      { label: "Scheduled", to: "/campaigns?status=SCHEDULED", roles: [] as Role[] },
      { label: "Sending", to: "/campaigns?status=SENDING", roles: [] as Role[] },
      { label: "Completed", to: "/campaigns?status=COMPLETED", roles: [] as Role[] }
    ]
  },
  {
    label: "Approvals",
    icon: CheckSquare,
    items: [{ label: "My approvals", to: "/approvals", roles: ["APPROVER", "HR_ADMIN", "DEPT_ADMIN"] as Role[] }]
  },
  {
    label: "Reports",
    icon: BarChart3,
    items: [
      { label: "Delivery summary", to: "/reports/delivery", roles: [] as Role[] },
      { label: "Campaign analytics", to: "/reports/analytics", roles: [] as Role[] },
      { label: "Recipient log", to: "/reports/recipients", roles: [] as Role[] }
    ]
  },
  {
    label: "Compliance",
    icon: ShieldCheck,
    items: [
      { label: "Suppression list", to: "/compliance/suppression", roles: ["SUPER_ADMIN", "HR_ADMIN", "AUDITOR"] as Role[] },
      { label: "Audit logs", to: "/compliance/audit", roles: ["SUPER_ADMIN", "AUDITOR", "HR_ADMIN"] as Role[] }
    ]
  },
  {
    label: "Settings",
    icon: Settings,
    items: [
      { label: "Sender identities", to: "/settings/sender-identities", roles: ["SUPER_ADMIN", "HR_ADMIN"] as Role[] },
      { label: "SMTP accounts", to: "/settings/smtp-accounts", roles: ["SUPER_ADMIN", "HR_ADMIN"] as Role[] },
      { label: "Policies", to: "/settings/policies", roles: ["SUPER_ADMIN", "HR_ADMIN"] as Role[] },
      { label: "User access", to: "/settings/user-access", roles: ["SUPER_ADMIN", "HR_ADMIN"] as Role[] }
    ]
  }
];

export default function LeftNav() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-slate-200 bg-white transition-all",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-primary" />
          {!collapsed && <span className="text-sm font-semibold">Comm Center</span>}
        </div>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="text-muted hover:text-ink"
          aria-label="Toggle navigation"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed ? "rotate-180" : "")}
          />
        </button>
      </div>
      <nav className="flex-1 space-y-2 overflow-y-auto px-2 pb-6">
        {navGroups.map((group) => {
          if (group.roles && group.roles.length > 0 && !hasRole(user, group.roles)) {
            return null;
          }
          if (group.to) {
            return (
              <NavItem key={group.label} to={group.to} label={group.label} icon={group.icon} collapsed={collapsed} />
            );
          }
          return (
            <div key={group.label} className="space-y-1">
              <div className={cn("px-3 text-xs uppercase text-muted", collapsed ? "hidden" : "block")}>
                {group.label}
              </div>
              {group.items?.map((item) => {
                if (item.roles && item.roles.length > 0 && !hasRole(user, item.roles)) {
                  return null;
                }
                return (
                  <NavItem
                    key={item.to}
                    to={item.to}
                    label={item.label}
                    icon={group.icon}
                    collapsed={collapsed}
                  />
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  collapsed
}: {
  to: string;
  label: string;
  icon: typeof Home;
  collapsed: boolean;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
          isActive ? "bg-primary/10 text-primary" : "text-slate-700 hover:bg-slate-100"
        )
      }
    >
      <Icon className="h-4 w-4" />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );
}
