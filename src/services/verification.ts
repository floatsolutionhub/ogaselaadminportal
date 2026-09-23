// Ogasela.Api/Controllers/Verification/VerificationController.cs - only manual-review is used by
// this portal; the rest of that controller is the seller-facing submission flow.
import { api } from "../lib/apiClient";
import type { VerificationDecision } from "../types/api";

export function decideManualReview(verificationId: string, decision: VerificationDecision, notes?: string): Promise<void> {
  return api.post<void>(`/verification/${verificationId}/manual-review`, { decision, notes });
}
