import apiClient from "../lib/apiClient";
import { AuditLog, SuppressionEntry } from "../types";

export async function fetchSuppression() {
  const { data } = await apiClient.get<SuppressionEntry[]>("/api/suppression");
  return data;
}

export async function addSuppression(payload: Partial<SuppressionEntry>) {
  const { data } = await apiClient.post<SuppressionEntry>("/api/suppression", payload);
  return data;
}

export async function removeSuppression(email: string) {
  const { data } = await apiClient.delete("/api/suppression", { params: { email } });
  return data;
}

export async function fetchAuditLogs(params?: Record<string, any>) {
  const { data } = await apiClient.get<AuditLog[]>("/api/audit-logs", { params });
  return data;
}
