import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "../../components/PageHeader";
import CommandBar from "../../components/CommandBar";
import FilterBar from "../../components/FilterBar";
import DataTable from "../../components/DataTable";
import BladePanel from "../../components/BladePanel";
import StatusBadge from "../../components/StatusBadge";
import ConfirmDialog from "../../components/ConfirmDialog";
import { Input } from "../../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { cancelCampaign, deleteCampaign, duplicateCampaign, fetchCampaigns, requeueCampaign } from "../../api/campaigns";
import { Campaign } from "../../types";
import { useToast } from "../../hooks/useToast";
import { exportCampaignRecipients } from "../../api/reports";

export default function CampaignsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [selectedRows, setSelectedRows] = useState<Record<number, boolean>>({});
  const [search, setSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const statusFilter = new URLSearchParams(location.search).get("status") || undefined;
  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns", statusFilter],
    queryFn: () => fetchCampaigns(statusFilter ? { status: statusFilter } : undefined),
    refetchInterval: 5000
  });

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (!search) return true;
      return c.title.toLowerCase().includes(search.toLowerCase());
    });
  }, [campaigns, statusFilter, search]);

  const selectedIds = useMemo(
    () => Object.keys(selectedRows).filter((id) => selectedRows[Number(id)]),
    [selectedRows]
  );
  const selectedCampaign = selectedIds.length === 1 ? filtered.find((c) => c.id === Number(selectedIds[0])) : null;
  const canRequeue = selectedCampaign?.status === "COMPLETED";

  const cancelMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => cancelCampaign(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      push({ title: "Campaigns cancelled", variant: "success" });
      setSelectedRows({});
    },
    onError: () => push({ title: "Cancel failed", variant: "error" })
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => deleteCampaign(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      push({ title: "Campaigns deleted", variant: "success" });
      setSelectedRows({});
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Delete failed";
      push({ title: "Delete failed", description: message, variant: "error" });
    }
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: number) => duplicateCampaign(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      push({ title: "Campaign duplicated", variant: "success" });
      navigate(`/campaigns/compose?id=${data.id}`);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Duplicate failed";
      push({ title: "Duplicate failed", description: message, variant: "error" });
    }
  });

  const requeueMutation = useMutation({
    mutationFn: async (id: number) => requeueCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      push({ title: "Campaign re-queued", variant: "success" });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Re-queue failed";
      push({ title: "Re-queue failed", description: message, variant: "error" });
    }
  });

  const handleExport = async () => {
    if (selectedIds.length !== 1) {
      push({ title: "Select one campaign to export", variant: "error" });
      return;
    }
    const campaignId = Number(selectedIds[0]);
    const blob = await exportCampaignRecipients(campaignId);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `campaign-${campaignId}-recipients.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Campaigns" description="Track bulk email campaigns and delivery status." />
      <CommandBar
        className="sticky top-0 z-20"
        actions={[
          { label: "New", onClick: () => navigate("/campaigns/compose") },
          {
            label: "Edit",
            onClick: () => selectedCampaign && navigate(`/campaigns/compose?id=${selectedCampaign.id}`),
            disabled: !selectedCampaign
          },
          {
            label: "Submit",
            onClick: () => selectedCampaign && navigate(`/campaigns/compose?id=${selectedCampaign.id}`),
            disabled: !selectedCampaign
          },
          {
            label: "Resend (copy)",
            onClick: () => selectedCampaign && duplicateMutation.mutate(selectedCampaign.id),
            disabled: !selectedCampaign
          },
          {
            label: "Re-queue",
            onClick: () => selectedCampaign && requeueMutation.mutate(selectedCampaign.id),
            disabled: !canRequeue
          },
          { label: "Cancel", onClick: () => setConfirmOpen(true), variant: "danger", disabled: selectedIds.length === 0 },
          { label: "Delete", onClick: () => setDeleteOpen(true), variant: "danger", disabled: selectedIds.length === 0 },
          { label: "Refresh", onClick: () => window.location.reload(), variant: "outline" },
          { label: "Export", onClick: handleExport, variant: "outline" }
        ]}
      />
      <FilterBar>
        <Input placeholder="Search campaigns" value={search} onChange={(e) => setSearch(e.target.value)} />
      </FilterBar>
      <DataTable
        columns={[
          {
            key: "select",
            header: (
              <input
                type="checkbox"
                checked={filtered.length > 0 && filtered.every((row) => selectedRows[row.id])}
                onChange={(e) => {
                  const next: Record<number, boolean> = {};
                  filtered.forEach((row) => {
                    next[row.id] = e.target.checked;
                  });
                  setSelectedRows(next);
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ),
            render: (row) => (
              <input
                type="checkbox"
                checked={!!selectedRows[row.id]}
                onChange={(e) => {
                  setSelectedRows((prev) => ({ ...prev, [row.id]: e.target.checked }));
                }}
                onClick={(e) => e.stopPropagation()}
              />
            )
          },
          { key: "title", header: "Title", sortable: true },
          { key: "category", header: "Category" },
          { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
          { key: "createdBy", header: "Created by" },
          { key: "scheduledAt", header: "Scheduled" },
          { key: "smtpAccountId", header: "Provider" },
          { key: "updatedAt", header: "Last updated" }
        ]}
        data={filtered}
        onRowClick={(row) => setSelected(row)}
      />

      <BladePanel
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        title={selected?.title || "Campaign details"}
        subtitle="Campaign"
      >
        {selected && (
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="recipients">Recipients</TabsTrigger>
              <TabsTrigger value="approvals">Approvals</TabsTrigger>
              <TabsTrigger value="report">Report</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <div className="space-y-3 text-sm">
                <Detail label="Status" value={<StatusBadge value={selected.status} />} />
                <Detail label="Category" value={selected.category} />
                <Detail label="Created by" value={selected.createdBy} />
              </div>
            </TabsContent>
            <TabsContent value="recipients">
              <div className="text-sm text-muted">Recipients snapshot will appear after expansion.</div>
            </TabsContent>
            <TabsContent value="approvals">
              <div className="text-sm text-muted">Approval steps and comments will display here.</div>
            </TabsContent>
            <TabsContent value="report">
              <div className="text-sm text-muted">Delivery metrics and exports are available here.</div>
            </TabsContent>
          </Tabs>
        )}
      </BladePanel>

      <ConfirmDialog
        open={confirmOpen}
        title="Cancel campaign"
        description="This will stop the campaign and prevent sending."
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          if (selectedIds.length > 0) {
            cancelMutation.mutate(selectedIds.map(Number));
          }
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete campaigns"
        description="This will permanently remove the selected campaigns."
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          setDeleteOpen(false);
          if (selectedIds.length > 0) {
            deleteMutation.mutate(selectedIds.map(Number));
          }
        }}
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
