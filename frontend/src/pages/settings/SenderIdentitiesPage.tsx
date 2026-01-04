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
import {
  fetchSenderIdentities,
  createSenderIdentity,
  updateSenderIdentity,
  deleteSenderIdentity,
  fetchSmtpAccounts
} from "../../api/settings";
import { SenderIdentity, SmtpAccount } from "../../types";
import { useToast } from "../../hooks/useToast";
import ServerErrorBanner from "../../components/ServerErrorBanner";

const schema = z.object({
  displayName: z.string().min(2, "Display name required"),
  email: z.string().email("Valid email required"),
  smtpAccountId: z.string().min(1, "SMTP account required"),
  replyTo: z.string().optional(),
  allowedScopes: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

export default function SenderIdentitiesPage() {
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<SenderIdentity | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Record<number, boolean>>({});

  const { data: identities = [] } = useQuery({ queryKey: ["senderIdentities"], queryFn: fetchSenderIdentities });
  const { data: smtpAccounts = [] } = useQuery({ queryKey: ["smtp"], queryFn: fetchSmtpAccounts });
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  const selectedIds = useMemo(
    () => Object.keys(selectedRows).filter((id) => selectedRows[Number(id)]),
    [selectedRows]
  );

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      (selected?.id
        ? updateSenderIdentity(selected.id, {
            displayName: values.displayName,
            email: values.email,
            smtpAccountId: Number(values.smtpAccountId)
          })
        : createSenderIdentity({
            displayName: values.displayName,
            email: values.email,
            smtpAccountId: Number(values.smtpAccountId)
          })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["senderIdentities"] });
      push({ title: "Sender identity saved", variant: "success" });
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
      await Promise.all(ids.map((id) => deleteSenderIdentity(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["senderIdentities"] });
      push({ title: "Sender identity deleted", variant: "success" });
      setSelectedRows({});
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.response?.data?.error || "Delete failed";
      push({ title: "Delete failed", description: message, variant: "error" });
    }
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Sender identities" description="Manage approved sender profiles." />
      <CommandBar
        actions={[
          {
            label: "New",
            onClick: () => {
              setSelected(null);
              form.reset({});
              setOpen(true);
            }
          },
          {
            label: "Edit",
            onClick: () => {
              const only = selectedIds.length === 1 ? identities.find((i) => i.id === Number(selectedIds[0])) : null;
              if (only) {
                setSelected(only);
                form.reset({
                  displayName: only.displayName,
                  email: only.email,
                  smtpAccountId: String(only.smtpAccountId || ""),
                  replyTo: "",
                  allowedScopes: ""
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
                checked={identities.length > 0 && identities.every((row) => selectedRows[row.id])}
                onChange={(e) => {
                  const next: Record<number, boolean> = {};
                  identities.forEach((row) => {
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
          { key: "displayName", header: "Display name" },
          { key: "email", header: "From email" },
          { key: "smtpAccountId", header: "SMTP" }
        ]}
        data={identities}
      />

      <BladePanel
        open={open}
        onOpenChange={setOpen}
        title={selected?.id ? "Edit sender identity" : "New sender identity"}
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
                : "Unable to save sender identity."
              }
            />
          )}
          <div className="space-y-1">
            <label className="text-xs text-muted">Display name</label>
            <Input {...form.register("displayName")} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted">From email</label>
            <Input {...form.register("email")} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted">SMTP account</label>
            <Select value={form.watch("smtpAccountId")} onValueChange={(val) => form.setValue("smtpAccountId", val)}>
              <SelectTrigger><SelectValue placeholder="Select SMTP account" /></SelectTrigger>
              <SelectContent>
                {smtpAccounts.map((account) => (
                  <SelectItem key={account.id} value={String(account.id)}>
                    {account.name} (id {account.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted">Reply-to</label>
            <Input {...form.register("replyTo")} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted">Allowed scopes</label>
            <Input {...form.register("allowedScopes")} placeholder="ORG,DEPT" />
          </div>
        </form>
      </BladePanel>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete sender identities"
        description="This will remove the selected sender identities."
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
