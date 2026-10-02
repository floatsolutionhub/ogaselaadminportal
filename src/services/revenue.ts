// Ogasela.Api/Controllers/Admin/AdminRevenueController.cs - the Revenue page (SuperAdmin only).
import { api } from "../lib/apiClient";
import type { RevenueSummary, RevenueTransactionPage, TransactionStatus, TransactionType } from "../types/api";

/** from/to are yyyy-MM-dd, both inclusive. */
export function getRevenueSummary(from: string, to: string): Promise<RevenueSummary> {
  return api.get<RevenueSummary>(`/admin/revenue/summary?from=${from}&to=${to}`);
}

export function getRevenueTransactions(params: {
  type?: TransactionType;
  status?: TransactionStatus;
  search?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}): Promise<RevenueTransactionPage> {
  const query = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
  if (params.type) query.set("type", params.type);
  if (params.status) query.set("status", params.status);
  if (params.search) query.set("search", params.search);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  return api.get<RevenueTransactionPage>(`/admin/revenue/transactions?${query.toString()}`);
}

/** Reverses a successful transaction (a top-up is also refunded through the payment gateway). */
export function refundTransaction(id: string): Promise<void> {
  return api.post<void>(`/admin/transactions/${id}/refund`);
}
