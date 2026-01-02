import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "../../components/PageHeader";
import FilterBar from "../../components/FilterBar";
import DataTable from "../../components/DataTable";
import BladePanel from "../../components/BladePanel";
import JsonViewer from "../../components/JsonViewer";
import ServerErrorBanner from "../../components/ServerErrorBanner";
import { Input } from "../../components/ui/input";
import { fetchAuditLogs } from "../../api/compliance";
import { AuditLog } from "../../types";

export default function AuditLogsPage() {
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const { data: logs = [], isError } = useQuery<AuditLog[]>({
    queryKey: ["auditLogs"],
    queryFn: () => fetchAuditLogs()
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Audit logs" description="Review security-sensitive activity across the platform." />
      <FilterBar>
        <Input placeholder="Filter by actor" />
        <Input placeholder="Action" />
        <Input placeholder="Date range" />
      </FilterBar>
      {isError && (
        <ServerErrorBanner message="Audit log endpoint is unavailable or you lack permissions." />
      )}
      <DataTable
        columns={[
          { key: "createdAt", header: "Time" },
          { key: "actorEmail", header: "Actor" },
          { key: "action", header: "Action" },
          { key: "resourceType", header: "Resource" },
          { key: "ip", header: "IP" }
        ]}
        data={logs}
        onRowClick={(row) => setSelected(row)}
      />

      <BladePanel
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        title="Audit details"
        subtitle={selected?.action}
      >
        {selected && (
          <div className="space-y-4">
            <div>
              <div className="text-xs text-muted mb-2">Before</div>
              <JsonViewer data={selected.beforeJson} />
            </div>
            <div>
              <div className="text-xs text-muted mb-2">After</div>
              <JsonViewer data={selected.afterJson} />
            </div>
          </div>
        )}
      </BladePanel>
    </div>
  );
}
