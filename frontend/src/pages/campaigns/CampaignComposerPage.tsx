import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import PageHeader from "../../components/PageHeader";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import FilterBar from "../../components/FilterBar";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchAudiences, previewAudience } from "../../api/audiences";
import { fetchPolicySettings, fetchSmtpAccounts, fetchSenderIdentities } from "../../api/settings";
import { createCampaign, fetchCampaign, submitCampaign, testSend, updateCampaign, uploadCampaignAttachment } from "../../api/campaigns";
import { useToast } from "../../hooks/useToast";

const schema = z.object({
  title: z.string().min(3, "Title required"),
  category: z.string(),
  subject: z.string().min(3, "Subject required"),
  senderIdentityId: z.string(),
  smtpAccountId: z.string(),
  audienceIds: z.array(z.string()).optional(),
  htmlBody: z.string().optional(),
  textBody: z.string().optional(),
  testRecipients: z.string().optional()
});

type FormValues = z.infer<typeof schema>;
type CampaignAttachment = {
  id: string;
  originalName: string;
  storedName: string;
  size: number;
  contentType?: string | null;
  uploadedAt?: string;
};

export default function CampaignComposerPage() {
  const { push } = useToast();
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<{ count: number; sample: any[] } | null>(null);
  const [attachments, setAttachments] = useState<CampaignAttachment[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const campaignIdParam = new URLSearchParams(location.search).get("id");
  const [localCampaignId, setLocalCampaignId] = useState<number | null>(
    campaignIdParam ? Number(campaignIdParam) : null
  );

  const { data: audiences = [] } = useQuery({ queryKey: ["audiences"], queryFn: fetchAudiences });
  const { data: smtpAccounts = [] } = useQuery({ queryKey: ["smtp"], queryFn: fetchSmtpAccounts });
  const { data: senderIdentities = [] } = useQuery({ queryKey: ["senders"], queryFn: fetchSenderIdentities });
  const { data: policySettings } = useQuery({ queryKey: ["policies"], queryFn: fetchPolicySettings });
  const { data: campaign } = useQuery({
    queryKey: ["campaign", localCampaignId],
    queryFn: () => fetchCampaign(localCampaignId!),
    enabled: !!localCampaignId
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { category: "ORG_WIDE", audienceIds: [] }
  });

  const selectedAudienceId = form.watch("audienceIds")?.[0];
  const previewSample = preview?.sample ?? [];
  const notificationSmtpId = policySettings?.notificationSmtpAccountId ?? null;
  const notificationSenderId = policySettings?.notificationSenderIdentityId ?? null;
  const availableSmtpAccounts = useMemo(
    () => (notificationSmtpId ? smtpAccounts.filter((s) => s.id !== notificationSmtpId) : smtpAccounts),
    [smtpAccounts, notificationSmtpId]
  );
  const availableSenderIdentities = useMemo(() => {
    if (!notificationSmtpId && !notificationSenderId) {
      return senderIdentities;
    }
    return senderIdentities.filter((s) => {
      if (notificationSenderId && s.id === notificationSenderId) {
        return false;
      }
      if (notificationSmtpId && s.smtpAccountId === notificationSmtpId) {
        return false;
      }
      return true;
    });
  }, [senderIdentities, notificationSmtpId, notificationSenderId]);

  useEffect(() => {
    setPreview(null);
  }, [selectedAudienceId]);

  useEffect(() => {
    if (campaign) {
      form.reset({
        title: campaign.title || "",
        category: campaign.category || "ORG_WIDE",
        subject: campaign.subject || "",
        senderIdentityId: campaign.senderIdentityId ? String(campaign.senderIdentityId) : "",
        smtpAccountId: campaign.smtpAccountId ? String(campaign.smtpAccountId) : "",
        audienceIds: [],
        htmlBody: campaign.htmlBody || "",
        textBody: campaign.textBody || "",
        testRecipients: ""
      });
      if (campaign.attachmentsJson) {
        try {
          setAttachments(JSON.parse(campaign.attachmentsJson));
        } catch {
          setAttachments([]);
        }
      } else {
        setAttachments([]);
      }
    }
  }, [campaign, form]);

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      createCampaign({
        title: values.title,
        subject: values.subject,
        category: values.category,
        htmlBody: values.htmlBody,
        textBody: values.textBody,
        senderIdentityId: Number(values.senderIdentityId),
        smtpAccountId: Number(values.smtpAccountId),
        attachmentsJson: attachments.length ? JSON.stringify(attachments) : null
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      push({ title: "Draft saved", variant: "success" });
    },
    onError: () => push({ title: "Failed to save draft", variant: "error" })
  });

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) =>
      updateCampaign(localCampaignId!, {
        title: values.title,
        subject: values.subject,
        category: values.category,
        htmlBody: values.htmlBody,
        textBody: values.textBody,
        senderIdentityId: Number(values.senderIdentityId),
        smtpAccountId: Number(values.smtpAccountId),
        attachmentsJson: attachments.length ? JSON.stringify(attachments) : null
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      push({ title: "Draft updated", variant: "success" });
    },
    onError: () => push({ title: "Failed to update draft", variant: "error" })
  });

  const saveDraft = async (values: FormValues) => {
    if (localCampaignId) {
      return updateMutation.mutateAsync(values);
    }
    const created = await createMutation.mutateAsync(values);
    setLocalCampaignId(created.id);
    navigate(`/campaigns/compose?id=${created.id}`);
    return created;
  };

  const submitMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const saved = await saveDraft(values);
      return submitCampaign(saved.id, { audienceIds: values.audienceIds?.map(Number) || [] });
    },
    onSuccess: () => push({ title: "Submitted for approval", variant: "success" }),
    onError: () => push({ title: "Submission failed", variant: "error" })
  });

  const testMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const created = await saveDraft(values);
      const emails = values.testRecipients?.split(",").map((email) => email.trim()).filter(Boolean) || [];
      return testSend(created.id, { recipients: emails });
    },
    onSuccess: () => push({ title: "Test send requested", variant: "success" }),
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.response?.data?.error || "Test send failed";
      push({ title: "Test send failed", description: message, variant: "error" });
    }
  });

  const recipientEstimate = useMemo(() => (form.watch("audienceIds")?.length || 0) * 250, [form]);

  return (
    <div className="space-y-6">
      <PageHeader title="Campaign composer" description="Draft a new communication and route for approval." />
      <FilterBar>
        <Button variant="outline" onClick={form.handleSubmit((values) => saveDraft(values))}>Save draft</Button>
        <Button
          variant="outline"
          onClick={async () => {
            if (!selectedAudienceId) {
              push({ title: "Select an audience first", variant: "error" });
              return;
            }
            try {
              const result = await previewAudience(Number(selectedAudienceId));
              setPreview(result);
            } catch (error: any) {
              const message = error?.response?.data?.message || "Preview failed";
              push({ title: "Preview failed", description: message, variant: "error" });
            }
          }}
        >
          Preview recipients
        </Button>
        <Button variant="outline" onClick={form.handleSubmit((values) => testMutation.mutate(values))}>Test send</Button>
        <Button onClick={form.handleSubmit((values) => submitMutation.mutate(values))}>Submit for approval</Button>
      </FilterBar>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <section className="m365-card p-4 space-y-4">
            <h2 className="text-sm font-semibold">Basics</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs text-muted">Title</label>
                <Input {...form.register("title")} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted">Category</label>
                <Controller
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ORG_WIDE">Org-wide</SelectItem>
                        <SelectItem value="DEPARTMENTAL">Department</SelectItem>
                        <SelectItem value="GENERAL">General</SelectItem>
                        <SelectItem value="EMERGENCY">Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted">Subject</label>
              <Input {...form.register("subject")} />
            </div>
          </section>

          <section className="m365-card p-4 space-y-4">
            <h2 className="text-sm font-semibold">Sender</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs text-muted">Sender identity</label>
                <Controller
                  control={form.control}
                  name="senderIdentityId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {availableSenderIdentities.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.displayName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted">SMTP account</label>
                <Controller
                  control={form.control}
                  name="smtpAccountId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {availableSmtpAccounts.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </section>

          <section className="m365-card p-4 space-y-4">
            <h2 className="text-sm font-semibold">Audience</h2>
            <div className="space-y-1">
              <label className="text-xs text-muted">Audience selections</label>
              <Controller
                control={form.control}
                name="audienceIds"
                render={({ field }) => (
                  <Select value={field.value?.[0] || ""} onValueChange={(val) => field.onChange([val])}>
                    <SelectTrigger><SelectValue placeholder="Select audience" /></SelectTrigger>
                    <SelectContent>
                      {audiences.map((audience) => (
                        <SelectItem key={audience.id} value={String(audience.id)}>{audience.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="text-xs text-muted">
              Estimated recipients: {preview?.count ?? recipientEstimate}
            </div>
            {previewSample.length > 0 && (
              <div className="text-xs text-muted">
                Sample: {previewSample.slice(0, 3).map((p) => p.email || p.fullName || "Recipient").join(", ")}
              </div>
            )}
          </section>

          <section className="m365-card p-4 space-y-4">
            <h2 className="text-sm font-semibold">Content</h2>
            <Tabs defaultValue="html">
              <TabsList>
                <TabsTrigger value="html">HTML</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="text">Text fallback</TabsTrigger>
              </TabsList>
              <TabsContent value="html">
                <textarea className="h-40 w-full rounded-md border border-slate-200 p-3 text-sm" {...form.register("htmlBody")} />
              </TabsContent>
              <TabsContent value="preview">
                <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-muted">
                  HTML preview will render here.
                </div>
              </TabsContent>
              <TabsContent value="text">
                <textarea className="h-32 w-full rounded-md border border-slate-200 p-3 text-sm" {...form.register("textBody")} />
              </TabsContent>
            </Tabs>
          </section>

          <section className="m365-card p-4 space-y-4">
            <h2 className="text-sm font-semibold">Attachments</h2>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (!localCampaignId) {
                    push({ title: "Save draft first", variant: "error" });
                    event.target.value = "";
                    return;
                  }
                  try {
                    const updated = await uploadCampaignAttachment(localCampaignId, file);
                    if (updated.attachmentsJson) {
                      setAttachments(JSON.parse(updated.attachmentsJson));
                    }
                    push({ title: "Attachment uploaded", variant: "success" });
                  } catch (error: any) {
                    const message = error?.response?.data?.message || "Upload failed";
                    push({ title: "Upload failed", description: message, variant: "error" });
                  } finally {
                    event.target.value = "";
                  }
                }}
              />
            </div>
            {attachments.length === 0 && (
              <span className="text-xs text-muted">No files uploaded</span>
            )}
            {attachments.length > 0 && (
              <div className="text-xs text-muted">
                {attachments.map((file) => file.originalName).join(", ")}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="m365-card p-4 space-y-3">
            <h2 className="text-sm font-semibold">Test send</h2>
            <div className="space-y-1">
              <label className="text-xs text-muted">Recipient emails (comma separated)</label>
              <Input placeholder="name@company.com" {...form.register("testRecipients")} />
            </div>
            <p className="text-xs text-muted">Max 5 recipients, internal domains only.</p>
          </section>
          <section className="m365-card p-4 space-y-3">
            <h2 className="text-sm font-semibold">Approval checklist</h2>
            <ul className="text-xs text-muted space-y-1">
              <li>Category selected</li>
              <li>Audience defined</li>
              <li>Content validated</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
