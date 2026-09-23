import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, UserPlus } from "lucide-react";
import { useApiQuery } from "../lib/useApiQuery";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/apiClient";
import { getDepartments } from "../services/rbac";
import { getUnits, getRoles } from "../services/rbac";
import { createStaff, uploadStaffKycDocument } from "../services/staff";
import type { Role, RoleType, StaffKycDocument, StaffKycDocumentType } from "../types/api";
import { Card } from "../components/Card";
import { Select } from "../components/Select";
import { Spinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { Stepper } from "../components/Stepper";
import { FileInput } from "../components/FileInput";

const STEPS = ["Details", "Documents"];

/** Mirrors StaffHierarchy.CanAssign on the backend - a client-side hint only, so the role picker
 * doesn't offer obviously-doomed options. The backend re-checks this independently. */
function assignableRoleTypes(actorTier: RoleType | null): RoleType[] {
  switch (actorTier) {
    case "SuperAdmin":
      return ["SuperAdmin", "Admin"];
    case "Admin":
      return ["HR"];
    case "HR":
      return ["Standard"];
    default:
      return [];
  }
}

export function StaffOnboardPage() {
  const navigate = useNavigate();
  const { user, isSuperAdmin } = useAuth();
  const actorTier: RoleType | null = isSuperAdmin ? "SuperAdmin" : (user?.staffProfile?.roleType ?? null);
  const allowedRoleTypes = useMemo(() => assignableRoleTypes(actorTier), [actorTier]);

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [staffProfileId, setStaffProfileId] = useState<string | null>(null);

  const { data: departments, isLoading: departmentsLoading } = useApiQuery(() => getDepartments());
  const { data: units, isLoading: unitsLoading } = useApiQuery(
    () => (departmentId ? getUnits(departmentId) : Promise.resolve([])),
    [departmentId],
  );
  const { data: roles, isLoading: rolesLoading } = useApiQuery(() => getRoles());

  const assignableRoles: Role[] = (roles ?? []).filter((role) => allowedRoleTypes.includes(role.roleType));

  const [govIdFile, setGovIdFile] = useState<File | null>(null);
  const [proofOfAddressFile, setProofOfAddressFile] = useState<File | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<StaffKycDocument[]>([]);
  const [uploadingType, setUploadingType] = useState<StaffKycDocumentType | null>(null);

  async function handleDetailsSubmit() {
    setError(null);
    if (!name.trim() || !departmentId || !unitId || !roleId) {
      setError("Name, department, unit, and role are all required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const staff = await createStaff({
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        departmentId,
        unitId,
        roleId,
      });
      setStaffProfileId(staff.id);
      setStep(2);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create this staff record.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpload(file: File | null, documentType: StaffKycDocumentType) {
    if (!file || !staffProfileId) return;
    setError(null);
    setUploadingType(documentType);
    try {
      const doc = await uploadStaffKycDocument(staffProfileId, file, documentType);
      setUploadedDocs((prev) => [...prev.filter((d) => d.documentType !== documentType), doc]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not upload that document.");
    } finally {
      setUploadingType(null);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-ink">Onboard staff</h2>
        <p className="text-xs text-ink-muted">
          Assign a department, unit, and role, then upload their KYC documents. Approving the record afterwards
          emails them their login credentials.
        </p>
      </div>

      <Stepper steps={STEPS} currentStep={step} />

      {error && <ErrorBanner message={error} />}

      {step === 1 && (
        <Card className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Full name</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">Phone</label>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="0803..."
                className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">Department</label>
              <Select
                value={departmentId}
                onChange={(event) => {
                  setDepartmentId(event.target.value);
                  setUnitId("");
                }}
                placeholder={departmentsLoading ? "Loading..." : "Select department"}
                options={(departments ?? []).map((d) => ({ value: d.id, label: d.name }))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">Unit</label>
              <Select
                value={unitId}
                onChange={(event) => setUnitId(event.target.value)}
                placeholder={!departmentId ? "Select a department first" : unitsLoading ? "Loading..." : "Select unit"}
                options={(units ?? []).map((u) => ({ value: u.id, label: u.name }))}
                disabled={!departmentId}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Role</label>
            <Select
              value={roleId}
              onChange={(event) => setRoleId(event.target.value)}
              placeholder={rolesLoading ? "Loading..." : "Select role"}
              options={assignableRoles.map((r) => ({ value: r.id, label: `${r.name} (${r.roleType})` }))}
            />
            {!rolesLoading && assignableRoles.length === 0 && (
              <p className="mt-1.5 text-xs text-amber-700">
                Your account isn't set up to assign any role type. Contact a Super Admin.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleDetailsSubmit}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <Spinner size={16} /> : <UserPlus size={16} />}
            Create record and continue
          </button>
        </Card>
      )}

      {step === 2 && staffProfileId && (
        <Card className="space-y-5">
          <p className="text-sm text-ink-muted">
            Staff record created. Upload their KYC documents now, or come back to this from the staff detail page
            later.
          </p>

          <div className="space-y-2">
            <FileInput label="Government ID" file={govIdFile} onChange={setGovIdFile} />
            <button
              type="button"
              onClick={() => handleUpload(govIdFile, "GovernmentId")}
              disabled={!govIdFile || uploadingType === "GovernmentId"}
              className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploadingType === "GovernmentId" ? "Uploading..." : "Upload"}
            </button>
            {uploadedDocs.some((d) => d.documentType === "GovernmentId") && (
              <p className="flex items-center gap-1 text-xs text-emerald-700">
                <CheckCircle2 size={13} /> Uploaded
              </p>
            )}
          </div>

          <div className="space-y-2">
            <FileInput label="Proof of address (optional)" file={proofOfAddressFile} onChange={setProofOfAddressFile} />
            <button
              type="button"
              onClick={() => handleUpload(proofOfAddressFile, "ProofOfAddress")}
              disabled={!proofOfAddressFile || uploadingType === "ProofOfAddress"}
              className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploadingType === "ProofOfAddress" ? "Uploading..." : "Upload"}
            </button>
            {uploadedDocs.some((d) => d.documentType === "ProofOfAddress") && (
              <p className="flex items-center gap-1 text-xs text-emerald-700">
                <CheckCircle2 size={13} /> Uploaded
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate(`/staff/${staffProfileId}`)}
            className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Done - view staff record
          </button>
        </Card>
      )}
    </div>
  );
}
