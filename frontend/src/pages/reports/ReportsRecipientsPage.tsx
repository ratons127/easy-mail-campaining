import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "../../components/PageHeader";
import FilterBar from "../../components/FilterBar";
import DataTable from "../../components/DataTable";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { fetchCampaigns } from "../../api/campaigns";
import { fetchCampaignRecipients } from "../../api/reports";
import { CampaignRecipientReport } from "../../types";

export default function ReportsRecipientsPage() {
  const [campaignId, setCampaignId] = useState<string>("");
  const [search, setSearch] = useState("");
  const { data: campaigns = [] } = useQuery({ queryKey: ["campaigns"], queryFn: fetchCampaigns });
  const { data: recipients = [] } = useQuery({
    queryKey: ["campaignRecipients", campaignId],
    queryFn: () => fetchCampaignRecipients(Number(campaignId)),
    enabled: !!campaignId
  });

  const filtered = useMemo(() => {
    if (!search) {
      return recipients;
    }
    return (recipients as CampaignRecipientReport[]).filter((r) =>
      r.email.toLowerCase().includes(search.toLowerCase())
    );
  }, [recipients, search]);

  return (
    <div className="space-y-6">
      <PageHeader title="Recipient log" description="Review every email delivery attempt for a campaign." />
      <FilterBar>
        <Select value={campaignId} onValueChange={setCampaignId}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Select campaign" /></SelectTrigger>
          <SelectContent>
            {campaigns.map((campaign) => (
              <SelectItem key={campaign.id} value={String(campaign.id)}>
                {campaign.title} (#{campaign.id})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Search by recipient email"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </FilterBar>

      <DataTable
        columns={[
          { key: "email", header: "Recipient email" },
          { key: "fullName", header: "Name" },
          { key: "status", header: "Status" },
          { key: "retryCount", header: "Retries" },
          { key: "updatedAt", header: "Last update" },
          { key: "lastError", header: "Last error" }
        ]}
        data={filtered}
      />
    </div>
  );
}
