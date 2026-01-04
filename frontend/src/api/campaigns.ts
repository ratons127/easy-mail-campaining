import apiClient from "../lib/apiClient";
import { Campaign } from "../types";

export async function fetchCampaigns(params?: Record<string, any>) {
  const { data } = await apiClient.get<Campaign[]>("/api/campaigns", { params });
  return data;
}

export async function fetchCampaign(id: number) {
  const { data } = await apiClient.get<Campaign>(`/api/campaigns/${id}`);
  return data;
}

export async function createCampaign(payload: Partial<Campaign>) {
  const { data } = await apiClient.post<Campaign>("/api/campaigns", payload);
  return data;
}

export async function updateCampaign(id: number, payload: Partial<Campaign>) {
  const { data } = await apiClient.put<Campaign>(`/api/campaigns/${id}`, payload);
  return data;
}

export async function submitCampaign(id: number, payload: any) {
  const { data } = await apiClient.post<Campaign>(`/api/campaigns/${id}/submit`, payload);
  return data;
}

export async function scheduleCampaign(id: number, payload: any) {
  const { data } = await apiClient.post<Campaign>(`/api/campaigns/${id}/schedule`, payload);
  return data;
}

export async function expandRecipients(id: number, payload: any) {
  const { data } = await apiClient.post<string>(`/api/campaigns/${id}/expand`, payload);
  return data;
}

export async function testSend(id: number, payload: any) {
  const { data } = await apiClient.post<string>(`/api/campaigns/${id}/test-send`, payload);
  return data;
}

export async function deleteCampaign(id: number) {
  const { data } = await apiClient.delete(`/api/campaigns/${id}`);
  return data;
}

export async function uploadCampaignAttachment(id: number, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<Campaign>(`/api/campaigns/${id}/attachments`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data;
}

export async function cancelCampaign(id: number) {
  const { data } = await apiClient.post<string>(`/api/campaigns/${id}/cancel`);
  return data;
}

export async function duplicateCampaign(id: number) {
  const { data } = await apiClient.post<Campaign>(`/api/campaigns/${id}/duplicate`);
  return data;
}

export async function requeueCampaign(id: number) {
  const { data } = await apiClient.post<string>(`/api/campaigns/${id}/requeue`);
  return data;
}
