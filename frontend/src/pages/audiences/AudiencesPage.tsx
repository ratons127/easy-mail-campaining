import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import PageHeader from "../../components/PageHeader";
import CommandBar from "../../components/CommandBar";
import DataTable from "../../components/DataTable";
import BladePanel from "../../components/BladePanel";
import FilterBar from "../../components/FilterBar";
import ConfirmDialog from "../../components/ConfirmDialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { fetchAudiences, createAudience, updateAudience, deleteAudience, previewAudience } from "../../api/audiences";
import { fetchDepartments, fetchLocations } from "../../api/directory";
import { Audience, AudienceRule } from "../../types";
import { useToast } from "../../hooks/useToast";
import ServerErrorBanner from "../../components/ServerErrorBanner";
import { useAuth, hasRole } from "../../lib/auth";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  scope: z.enum(["DEPT", "ORG"]),
  departmentIds: z.array(z.string()).optional(),
  locationIds: z.array(z.string()).optional(),
  titleContains: z.string().optional(),
  status: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

export default function AudiencesPage() {
  const queryClient = useQueryClient();
  const { push } = useToast();
  const { user } = useAuth();
  const [selected, setSelected] = useState<Audience | null>(null);
  const [preview, setPreview] = useState<{ count: number; sample: any[] } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Record<number, boolean>>({});
  const [deleteIds, setDeleteIds] = useState<number[]>([]);

  const { data: audiences = [] } = useQuery({ queryKey: ["audiences"], queryFn: fetchAudiences });
  const { data: departments = [] } = useQuery({ queryKey: ["departments"], queryFn: fetchDepartments });
  const { data: locations = [] } = useQuery({ queryKey: ["locations"], queryFn: fetchLocations });
  const selectedIds = useMemo(() => Object.keys(selectedRows).filter((id) => selectedRows[Number(id)]), [selectedRows]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { scope: "DEPT", departmentIds: [], locationIds: [] }
  });

  useEffect(() => {
    if (selected) {
      form.reset({
        name: selected.name || "",
        description: selected.description || "",
        scope: "DEPT",
        departmentIds: [],
        locationIds: [],
        titleContains: "",
        status: ""
      });
    }
  }, [selected, form]);

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const rules: AudienceRule[] = [];
      values.departmentIds?.forEach((id) => rules.push({ ruleType: "DEPARTMENT", ruleValue: id }));
      values.locationIds?.forEach((id) => rules.push({ ruleType: "LOCATION", ruleValue: id }));
      if (values.titleContains) rules.push({ ruleType: "TITLE_CONTAINS", ruleValue: values.titleContains });
      if (values.status) rules.push({ ruleType: "STATUS", ruleValue: values.status });
      const payload = {
        name: values.name,
        description: values.description,
        rules
      };
      return selected?.id ? updateAudience(selected.id, payload) : createAudience(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audiences"] });
      push({ title: "Audience created", variant: "success" });
      setSelected(null);
      setPreview(null);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.response?.data?.error || "Failed to save audience";
      push({ title: "Failed to save audience", description: message, variant: "error" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(deleteIds.map((id) => deleteAudience(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audiences"] });
      push({ title: "Audiences deleted", variant: "success" });
      setSelected(null);
      setDeleteIds([]);
      setSelectedRows({});
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Failed to delete audience";
      push({ title: "Failed to delete audience", description: message, variant: "error" });
    }
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Audiences" description="Create dynamic recipient groups." />
      <CommandBar
        className="sticky top-0 z-20"
        actions={[
          {
            label: "New",
            onClick: () => setSelected({ id: 0, name: "" }),
            disabled: !hasRole(user, ["SUPER_ADMIN", "HR_ADMIN"])
          },
          {
            label: "Edit",
            onClick: () => {
              const only = selectedIds.length === 1 ? audiences.find((a) => a.id === Number(selectedIds[0])) : null;
              if (only) setSelected(only);
            },
            disabled: selectedIds.length !== 1 || !hasRole(user, ["SUPER_ADMIN", "HR_ADMIN"])
          },
          {
            label: "Delete",
            onClick: () => {
              setDeleteIds(selectedIds.map((id) => Number(id)));
              setConfirmOpen(true);
            },
            variant: "danger",
            disabled: selectedIds.length === 0 || !hasRole(user, ["SUPER_ADMIN", "HR_ADMIN"])
          },
          { label: "Refresh", onClick: () => window.location.reload(), variant: "outline" }
        ]}
      />
      <FilterBar>
        <Input placeholder="Search audiences" />
      </FilterBar>
      <DataTable
        columns={[
          {
            key: "select",
            header: (
              <input
                type="checkbox"
                checked={audiences.length > 0 && audiences.every((row) => selectedRows[row.id])}
                onChange={(e) => {
                  const next: Record<number, boolean> = {};
                  audiences.forEach((row) => {
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
          { key: "name", header: "Name", sortable: true },
          { key: "description", header: "Scope" },
          { key: "createdBy", header: "Owner" },
          { key: "createdAt", header: "Created" }
        ]}
        data={audiences}
      />

      <BladePanel
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        title={selected?.id ? "Edit audience" : "New audience"}
        subtitle="Audience builder"
        footer={
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={async () => {
                if (selected?.id) {
                  const result = await previewAudience(selected.id);
                  setPreview(result);
                }
              }}
            >
              Preview recipients
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSelected(null)}>
                Cancel
              </Button>
              <Button onClick={form.handleSubmit((values) => saveMutation.mutate(values))}>Save</Button>
            </div>
          </div>
        }
      >
        <form className="space-y-4">
          {saveMutation.isError && (
            <ServerErrorBanner
              message={saveMutation.error && (saveMutation.error as any)?.response?.data?.message
                ? (saveMutation.error as any).response.data.message
                : "Unable to save audience. Check rules and try again."
              }
            />
          )}
          <div className="space-y-1">
            <label className="text-xs text-muted">Name</label>
            <Input {...form.register("name")} defaultValue={selected?.name} />
            {form.formState.errors.name && (
              <p className="text-xs text-danger">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted">Description</label>
            <Input {...form.register("description")} defaultValue={selected?.description} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted">Scope</label>
            <Controller
              control={form.control}
              name="scope"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Scope" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEPT">Department</SelectItem>
                    <SelectItem value="ORG">Org-wide</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted">Department</label>
            <Controller
              control={form.control}
              name="departmentIds"
              render={({ field }) => (
                <Select value={field.value?.[0] || ""} onValueChange={(val) => field.onChange([val])}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={String(dept.id)}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted">Location</label>
            <Controller
              control={form.control}
              name="locationIds"
              render={({ field }) => (
                <Select value={field.value?.[0] || ""} onValueChange={(val) => field.onChange([val])}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={String(loc.id)}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted">Title contains</label>
            <Input {...form.register("titleContains")} placeholder="e.g. manager" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted">Status</label>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Select value={field.value || ""} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {preview && (
            <div className="m365-card p-3">
              <div className="text-sm font-semibold">Estimated recipients: {preview.count}</div>
              <ul className="mt-2 text-xs text-muted">
                {preview.sample?.slice(0, 5).map((sample, idx) => (
                  <li key={idx}>{sample.email || sample.fullName}</li>
                ))}
              </ul>
            </div>
          )}
        </form>
      </BladePanel>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete audience"
        description="This will remove the audience and its rules."
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          if (deleteIds.length > 0) {
            deleteMutation.mutate();
          }
        }}
      />
    </div>
  );
}
