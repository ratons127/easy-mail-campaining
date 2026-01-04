import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import PageHeader from "../../components/PageHeader";
import CommandBar from "../../components/CommandBar";
import DataTable from "../../components/DataTable";
import BladePanel from "../../components/BladePanel";
import ConfirmDialog from "../../components/ConfirmDialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { fetchSmtpAccounts, createSmtpAccount, updateSmtpAccount, deleteSmtpAccount } from "../../api/settings";
import { SmtpAccount } from "../../types";
import { useToast } from "../../hooks/useToast";
import ServerErrorBanner from "../../components/ServerErrorBanner";

const schema = z.object({
  name: z.string().min(2),
  provider: z.string(),
  host: z.string().min(2),
  username: z.string().optional(),
  password: z.string().optional(),
  port: z.string().min(1),
  useTls: z.string(),
  throttlePerMinute: z.string().min(1)
});

type FormValues = z.infer<typeof schema>;

export default function SmtpAccountsPage() {
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<SmtpAccount | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Record<number, boolean>>({});

  const { data: accounts = [] } = useQuery({ queryKey: ["smtp"], queryFn: fetchSmtpAccounts });
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { useTls: "true" } });

  const selectedIds = useMemo(
    () => Object.keys(selectedRows).filter((id) => selectedRows[Number(id)]),
    [selectedRows]
  );

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      (selected?.id
        ? updateSmtpAccount(selected.id, {
            name: values.name,
            provider: values.provider,
            host: values.host,
            username: values.username || null,
            password: values.password || null,
            port: Number(values.port),
            useTls: values.useTls === "true",
            throttlePerMinute: Number(values.throttlePerMinute)
          })
        : createSmtpAccount({
            name: values.name,
            provider: values.provider,
            host: values.host,
            username: values.username || null,
            password: values.password || null,
            port: Number(values.port),
            useTls: values.useTls === "true",
            throttlePerMinute: Number(values.throttlePerMinute)
          })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smtp"] });
      push({ title: "SMTP account saved", variant: "success" });
      setOpen(false);
      setSelected(null);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.response?.data?.error || "Failed to save";
      push({ title: "Failed to save", description: message, variant: "error" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => deleteSmtpAccount(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smtp"] });
      push({ title: "SMTP account deleted", variant: "success" });
      setSelectedRows({});
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.response?.data?.error || "Delete failed";
      push({ title: "Delete failed", description: message, variant: "error" });
    }
  });

  return (
    <div className="space-y-6">
      <PageHeader title="SMTP accounts" description="Configure outbound mail providers." />
      <CommandBar
        actions={[
          {
            label: "New",
            onClick: () => {
              setSelected(null);
              form.reset({ useTls: "true" });
              setOpen(true);
            }
          },
          {
            label: "Edit",
            onClick: () => {
              const only = selectedIds.length === 1 ? accounts.find((a) => a.id === Number(selectedIds[0])) : null;
              if (only) {
                setSelected(only);
                form.reset({
                  name: only.name || "",
                  provider: only.provider || "PRIVATE_SMTP",
                  host: only.host || "",
                  username: (only as any).username || "",
                  password: "",
                  port: String(only.port || ""),
                  useTls: String(only.useTls ?? true),
                  throttlePerMinute: String(only.throttlePerMinute || "")
                });
                setOpen(true);
              }
            },
            disabled: selectedIds.length !== 1
          },
          {
            label: "Delete",
            onClick: () => setConfirmOpen(true),
            variant: "danger",
            disabled: selectedIds.length === 0
          },
          { label: "Refresh", onClick: () => window.location.reload(), variant: "outline" }
        ]}
      />
      <DataTable
        columns={[
          {
            key: "select",
            header: (
              <input
                type="checkbox"
                checked={accounts.length > 0 && accounts.every((row) => selectedRows[row.id])}
                onChange={(e) => {
                  const next: Record<number, boolean> = {};
                  accounts.forEach((row) => {
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
          { key: "name", header: "Name" },
          { key: "provider", header: "Provider" },
          { key: "host", header: "Host" },
          { key: "port", header: "Port" },
          { key: "throttlePerMinute", header: "Throttle" }
        ]}
        data={accounts}
      />

      <BladePanel
        open={open}
        onOpenChange={setOpen}
        title={selected?.id ? "Edit SMTP account" : "New SMTP account"}
        subtitle="Settings"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={form.handleSubmit((values) => mutation.mutate(values))}>Save</Button>
          </div>
        }
      >
        <form className="space-y-4">
          {mutation.isError && (
            <ServerErrorBanner
              message={mutation.error && (mutation.error as any)?.response?.data?.message
                ? (mutation.error as any).response.data.message
                : "Unable to save SMTP account."
              }
            />
          )}
          <div className="space-y-1">
            <label className="text-xs text-muted">Name</label>
            <Input {...form.register("name")} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted">Provider</label>
            <Select value={form.watch("provider")} onValueChange={(val) => form.setValue("provider", val)}>
              <SelectTrigger><SelectValue placeholder="Provider" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AWS_SES">AWS SES</SelectItem>
                <SelectItem value="PRIVATE_SMTP">Private SMTP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted">Host</label>
            <Input {...form.register("host")} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted">Username</label>
            <Input {...form.register("username")} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted">Password</label>
            <Input type="password" {...form.register("password")} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-muted">Port</label>
              <Input {...form.register("port")} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted">TLS</label>
              <Select value={form.watch("useTls")} onValueChange={(val) => form.setValue("useTls", val)}>
                <SelectTrigger><SelectValue placeholder="TLS" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Enabled</SelectItem>
                  <SelectItem value="false">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted">Throttle per minute</label>
            <Input {...form.register("throttlePerMinute")} />
          </div>
        </form>
      </BladePanel>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete SMTP accounts"
        description="This will remove the selected SMTP accounts."
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          if (selectedIds.length > 0) {
            deleteMutation.mutate(selectedIds.map(Number));
          }
        }}
      />
    </div>
  );
}
