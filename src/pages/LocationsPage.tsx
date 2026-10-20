import { useState } from "react";
import { ChevronDown, ChevronRight, MapPin, Plus, Trash2 } from "lucide-react";
import { useApiQuery } from "../lib/useApiQuery";
import { ApiError } from "../lib/apiClient";
import {
  createCity,
  createState,
  deleteCity,
  deleteState,
  getCitiesByState,
  getStates,
  updateCity,
  updateState,
} from "../services/geo";
import type { NigeriaCity, NigeriaState } from "../types/api";
import { Card } from "../components/Card";
import { Spinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { Modal } from "../components/Modal";

function CityList({ stateId }: { stateId: string }) {
  const { data: cities, isLoading, refetch } = useApiQuery(() => getCitiesByState(stateId), [stateId]);
  const [modalCity, setModalCity] = useState<NigeriaCity | "new" | null>(null);
  const [name, setName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function openCreate() {
    setFormError(null);
    setName("");
    setLatitude("");
    setLongitude("");
    setModalCity("new");
  }

  function openEdit(city: NigeriaCity) {
    setFormError(null);
    setName(city.name);
    setLatitude(city.latitude?.toString() ?? "");
    setLongitude(city.longitude?.toString() ?? "");
    setModalCity(city);
  }

  // Coordinates are optional, but both or neither, and must be numbers.
  const lat = latitude.trim() === "" ? null : Number(latitude);
  const lng = longitude.trim() === "" ? null : Number(longitude);
  const coordsError =
    (lat === null) !== (lng === null)
      ? "Enter both latitude and longitude, or leave both empty."
      : (lat !== null && (Number.isNaN(lat) || lat < -90 || lat > 90)) ||
          (lng !== null && (Number.isNaN(lng) || lng < -180 || lng > 180))
        ? "Latitude must be between -90 and 90, longitude between -180 and 180."
        : null;

  async function save() {
    if (!name.trim() || coordsError) return;
    setIsSaving(true);
    setFormError(null);
    const coords = { latitude: lat, longitude: lng };
    try {
      if (modalCity === "new") {
        await createCity(stateId, name.trim(), coords);
      } else if (modalCity) {
        await updateCity(modalCity.id, name.trim(), coords);
      }
      setModalCity(null);
      refetch();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not save this city.");
    } finally {
      setIsSaving(false);
    }
  }

  async function remove(cityId: string) {
    try {
      await deleteCity(cityId);
      refetch();
    } catch {
      // Best-effort - the list simply won't update if this fails; no dedicated error UI for a delete button.
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner size={18} />
      </div>
    );
  }

  return (
    <div className="border-t border-black/5 pt-3">
      <ul className="space-y-1.5">
        {(cities ?? []).map((city) => (
          <li key={city.id} className="flex items-center justify-between text-sm">
            <span className="text-ink">
              {city.name}
              {city.latitude === null && (
                <span className="ml-2 text-xs text-ink-muted" title="Not offered by 'use my current location' until it has coordinates">
                  no coordinates
                </span>
              )}
            </span>
            <div className="flex gap-3">
              <button type="button" onClick={() => openEdit(city)} className="text-xs font-medium text-ink-muted hover:text-brand-600">
                Edit
              </button>
              <button type="button" onClick={() => remove(city.id)} className="text-ink-muted hover:text-rose-600">
                <Trash2 size={14} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={openCreate}
        className="mt-2 flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
      >
        <Plus size={13} /> Add city
      </button>

      <Modal open={!!modalCity} onClose={() => setModalCity(null)} title={modalCity === "new" ? "New city" : "Edit city"}>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Name</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["Latitude", latitude, setLatitude, "e.g. 6.6018"],
                ["Longitude", longitude, setLongitude, "e.g. 3.3515"],
              ] as const
            ).map(([label, value, setValue, placeholder]) => (
              <div key={label}>
                <label className="mb-1.5 block text-sm font-medium text-ink">
                  {label} <span className="font-normal text-ink-muted">(optional)</span>
                </label>
                <input
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  inputMode="decimal"
                  placeholder={placeholder}
                  className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
            ))}
          </div>
          <p className="-mt-2 text-xs text-ink-muted">
            The apps use these to fill in a seller's city from "Use my current location".
          </p>
          {(coordsError || formError) && <ErrorBanner message={coordsError ?? formError!} />}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setModalCity(null)}
              className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-ink-muted hover:bg-black/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!name.trim() || !!coordsError || isSaving}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {isSaving && <Spinner size={14} />}
              Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export function LocationsPage() {
  const { data: states, isLoading, error, refetch } = useApiQuery(() => getStates());
  const [expanded, setExpanded] = useState<string | null>(null);

  const [modalState, setModalState] = useState<NigeriaState | "new" | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function openCreate() {
    setFormError(null);
    setName("");
    setCode("");
    setModalState("new");
  }

  function openEdit(state: NigeriaState) {
    setFormError(null);
    setName(state.name);
    setCode(state.code);
    setModalState(state);
  }

  async function save() {
    if (!name.trim() || !code.trim()) return;
    setIsSaving(true);
    setFormError(null);
    try {
      if (modalState === "new") {
        await createState(name.trim(), code.trim());
      } else if (modalState) {
        await updateState(modalState.id, name.trim(), code.trim());
      }
      setModalState(null);
      refetch();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not save this state.");
    } finally {
      setIsSaving(false);
    }
  }

  async function remove(stateId: string) {
    try {
      await deleteState(stateId);
      refetch();
    } catch {
      // Best-effort, same as city delete above.
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <ErrorBanner message={error} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ink">Nigeria states &amp; cities</h2>
          <p className="text-xs text-ink-muted">Reference data used across the platform - seeded, and editable here.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <Plus size={15} /> New state
        </button>
      </div>

      <Card className="!p-0">
        <ul className="divide-y divide-black/5">
          {(states ?? []).map((state) => (
            <li key={state.id} className="px-5 py-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === state.id ? null : state.id)}
                  className="flex items-center gap-2 text-sm font-medium text-ink"
                >
                  {expanded === state.id ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  {state.name}
                  <span className="text-xs font-normal text-ink-muted">({state.code})</span>
                </button>
                <div className="flex gap-3">
                  <button type="button" onClick={() => openEdit(state)} className="text-xs font-medium text-ink-muted hover:text-brand-600">
                    Edit
                  </button>
                  <button type="button" onClick={() => remove(state.id)} className="text-ink-muted hover:text-rose-600">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {expanded === state.id && (
                <div className="mt-3 pl-6">
                  <CityList stateId={state.id} />
                </div>
              )}
            </li>
          ))}
        </ul>
        {(!states || states.length === 0) && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <MapPin size={24} className="text-ink-muted" />
            <p className="text-sm text-ink-muted">No states yet.</p>
          </div>
        )}
      </Card>

      <Modal open={!!modalState} onClose={() => setModalState(null)} title={modalState === "new" ? "New state" : "Edit state"}>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Name</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Code</label>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              maxLength={10}
              className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          {formError && <ErrorBanner message={formError} />}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setModalState(null)}
              className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-ink-muted hover:bg-black/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!name.trim() || !code.trim() || isSaving}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {isSaving && <Spinner size={14} />}
              Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
