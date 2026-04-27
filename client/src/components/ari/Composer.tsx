import { useEffect, useRef, useState } from "react";
import { Check, HelpCircle, Paperclip, Plus, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { uploadAriFile } from "@/lib/ariApi";
import { AttachmentChip } from "@/components/ari/AttachmentChip";
import { LocationTemplates } from "@/components/ari/LocationTemplates";
import {
  detectLocationInText,
  useAriStore,
  type AriAttachment,
} from "@/stores/ariStore";
import {
  ARI_CAPABILITIES,
  getCapability,
  type AriCapability,
  type AriCapabilityId,
} from "@shared/ari/capabilities";

interface ComposerProps {
  query: string;
  setQuery: (v: string) => void;
  onSend: () => void;
  onAbort: () => void;
  streaming: boolean;
  disabled?: boolean;
}

const MAX_QUERY = 8000;
const MAX_ATTACHMENTS = 4;

export function Composer({
  query,
  setQuery,
  onSend,
  onAbort,
  streaming,
  disabled,
}: ComposerProps) {
  const mode = useAriStore((s) => s.mode);
  const capabilityId = useAriStore((s) => s.capability);
  const setCapability = useAriStore((s) => s.setCapability);
  const additionalCapabilities = useAriStore((s) => s.additionalCapabilities);
  const toggleCapability = useAriStore((s) => s.toggleCapability);
  const attachments = useAriStore((s) => s.attachments);
  const addAttachment = useAriStore((s) => s.addAttachment);
  const removeAttachment = useAriStore((s) => s.removeAttachment);
  const clearAttachments = useAriStore((s) => s.clearAttachments);
  const locationProvided = useAriStore((s) => s.locationProvided);
  const setLocationProvided = useAriStore((s) => s.setLocationProvided);
  const measurementConfirmed = useAriStore((s) => s.measurementConfirmed);
  const setMeasurementConfirmed = useAriStore((s) => s.setMeasurementConfirmed);
  const { toast } = useToast();

  const capability = getCapability(capabilityId);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [capabilityMenuOpen, setCapabilityMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const dragDepthRef = useRef(0);

  // Soften the location gate when the user types something that mentions a
  // location/facility. Sticky once detected.
  useEffect(() => {
    if (
      capability.gateRequirement.type === "location" &&
      !locationProvided &&
      detectLocationInText(query)
    ) {
      setLocationProvided(true);
    }
  }, [query, capability.gateRequirement.type, locationProvided, setLocationProvided]);

  // Clear attachments when capability changes to one that doesn't accept them.
  useEffect(() => {
    if (attachments.length === 0) return;
    const incompatible = attachments.filter(
      (a) =>
        (a.type === "image" && !capability.acceptsImages) ||
        (a.type === "pdf" && !capability.acceptsPdfs) ||
        (a.type === "document" && !capability.acceptsPdfs)
    );
    if (incompatible.length > 0) {
      incompatible.forEach((a) => removeAttachment(a.filename));
      toast({
        title: "Attachments cleared",
        description: `${capability.displayName} does not accept the attached files.`,
      });
    }
    // Intentionally only triggers on capability changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capabilityId]);

  const fileAccept = buildAcceptAttribute(capability);
  const attachmentsDisabled =
    !capability.acceptsImages && !capability.acceptsPdfs;

  const gate = evaluateGate({
    capability,
    locationProvided,
    measurementConfirmed,
    attachments,
    mode,
  });

  const canSend =
    !streaming &&
    !disabled &&
    query.trim().length > 0 &&
    query.length <= MAX_QUERY &&
    gate.ok;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError(null);
    const remaining = MAX_ATTACHMENTS - attachments.length;
    const list = Array.from(files).slice(0, remaining);
    if (files.length > remaining) {
      setUploadError(
        `Only ${MAX_ATTACHMENTS} attachments allowed. ${files.length - remaining} skipped.`
      );
    }
    for (const file of list) {
      try {
        if (file.size > 10 * 1024 * 1024) {
          setUploadError(`${file.name} exceeds 10 MB.`);
          continue;
        }
        setUploadingName(file.name);
        const attachment = await uploadAriFile(file);
        const allowed =
          (attachment.type === "image" && capability.acceptsImages) ||
          (attachment.type === "pdf" && capability.acceptsPdfs) ||
          (attachment.type === "document" && capability.acceptsPdfs);
        if (!allowed) {
          setUploadError(
            `${capability.displayName} does not accept ${attachment.type} files.`
          );
          continue;
        }
        addAttachment(attachment);
      } catch (err: any) {
        setUploadError(err?.message || `Failed to attach ${file.name}.`);
      } finally {
        setUploadingName(null);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (canSend) onSend();
    }
  }

  function handleLocationInsert(text: string) {
    setQuery(text + query);
    setLocationProvided(true);
    textareaRef.current?.focus();
  }

  function hasFiles(e: React.DragEvent) {
    return Array.from(e.dataTransfer?.types || []).includes("Files");
  }

  function handleDragEnter(e: React.DragEvent) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepthRef.current += 1;
    setIsDragging(true);
  }

  function handleDragOver(e: React.DragEvent) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepthRef.current = 0;
    setIsDragging(false);
    if (attachmentsDisabled) {
      setUploadError(
        `${capability.displayName} does not accept attachments.`
      );
      return;
    }
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div
      className={cn(
        "border-t border-border bg-background",
        mode === "er" && "border-red-500"
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="relative mx-auto w-full max-w-4xl px-4 py-4 sm:px-6">
        {isDragging && (
          <div
            className="pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-primary/60 bg-primary/5 text-sm font-medium text-primary"
            data-testid="overlay-ari-dropzone"
          >
            Drop files to attach (images, PDFs, text — up to 4 × 10 MB)
          </div>
        )}
        {/* Gate strip */}
        {capability.gateRequirement.type !== "none" && mode !== "er" && (
          <GateStrip
            capability={capability}
            locationProvided={locationProvided}
            measurementConfirmed={measurementConfirmed}
            onToggleMeasurement={(v) => setMeasurementConfirmed(v)}
            onInsertLocation={handleLocationInsert}
            attachments={attachments}
          />
        )}

        <div
          className={cn(
            "rounded-lg border bg-card transition-shadow focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0",
            mode === "er"
              ? "border-red-500 focus-within:ring-red-400"
              : gate.ok
                ? "border-border"
                : "border-amber-300 dark:border-amber-700"
          )}
        >
          <Textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value.slice(0, MAX_QUERY))}
            onKeyDown={handleKeyDown}
            placeholder={capability.inputHint}
            disabled={disabled}
            rows={3}
            className="resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
            data-testid="input-ari-query"
          />

          {attachments.length > 0 && (
            <div
              className="flex flex-wrap gap-2 border-t border-border px-3 py-2"
              data-testid="list-ari-attachments"
            >
              {attachments.map((a) => (
                <AttachmentChip
                  key={a.filename}
                  attachment={a}
                  onRemove={() => removeAttachment(a.filename)}
                />
              ))}
              {attachments.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={clearAttachments}
                  data-testid="button-clear-attachments"
                >
                  Clear all
                </Button>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2">
            <div className="flex items-center gap-1">
              {/* Plus button — opens an inline picker for any capability so
                  users don't need the sidebar to switch context. */}
              <Popover open={capabilityMenuOpen} onOpenChange={setCapabilityMenuOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    data-testid="button-ari-capability-menu"
                    aria-label="Switch capability"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-72 p-1"
                  data-testid="popover-ari-capability-menu"
                >
                  <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Choose capabilities
                  </div>
                  <div className="px-2 pb-1 text-[11px] text-muted-foreground">
                    Pick one or more. The first stays primary; extras add
                    perspective to each answer.
                  </div>
                  <ul className="max-h-72 overflow-y-auto">
                    {ARI_CAPABILITIES.map((cap) => {
                      const isPrimary = cap.id === capabilityId;
                      const isAdditional = additionalCapabilities.includes(
                        cap.id as AriCapabilityId
                      );
                      const selected = isPrimary || isAdditional;
                      return (
                        <li key={cap.id}>
                          <button
                            type="button"
                            className={cn(
                              "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs transition hover:bg-accent",
                              selected && "bg-accent/60"
                            )}
                            onClick={() => {
                              if (isPrimary || isAdditional) {
                                toggleCapability(cap.id as AriCapabilityId);
                              } else {
                                // Adding a brand-new selection: if none was the
                                // primary before, just promote it. Otherwise
                                // append as additional.
                                toggleCapability(cap.id as AriCapabilityId);
                              }
                            }}
                            data-testid={`button-pick-capability-${cap.id}`}
                          >
                            <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center">
                              {selected ? (
                                <Check className="h-3.5 w-3.5 text-primary" />
                              ) : null}
                            </span>
                            <span className="flex-1">
                              <span className="flex items-center gap-1.5">
                                <span className="font-medium text-foreground">
                                  {cap.displayName}
                                </span>
                                {isPrimary && (
                                  <span className="rounded bg-primary/10 px-1 py-px text-[9px] font-semibold uppercase tracking-wider text-primary">
                                    Primary
                                  </span>
                                )}
                              </span>
                              <span className="block text-[11px] text-muted-foreground">
                                {cap.shortDescription}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </PopoverContent>
              </Popover>

              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={
                          attachmentsDisabled ||
                          disabled ||
                          attachments.length >= MAX_ATTACHMENTS ||
                          uploadingName !== null
                        }
                        onClick={() => fileInputRef.current?.click()}
                        data-testid="button-ari-attach"
                      >
                        <Paperclip className="mr-1.5 h-4 w-4" />
                        {uploadingName ? "Uploading…" : "Attach"}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {attachmentsDisabled ? (
                    <TooltipContent>
                      This capability does not accept attachments.
                    </TooltipContent>
                  ) : (
                    <TooltipContent>
                      Attach images, PDFs, or text (drag & drop also supported).
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={fileAccept}
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
                data-testid="input-ari-file"
              />
              <span
                className={cn(
                  "ml-1 text-xs tabular-nums",
                  query.length > MAX_QUERY * 0.9
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
                )}
              >
                {query.length} / {MAX_QUERY}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-muted-foreground sm:inline">
                ⌘+Enter to send
              </span>
              {streaming ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onAbort}
                  data-testid="button-ari-stop"
                >
                  <Square className="mr-1.5 h-4 w-4" />
                  Stop
                </Button>
              ) : (
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          type="button"
                          size="sm"
                          onClick={onSend}
                          disabled={!canSend}
                          variant={mode === "er" ? "destructive" : "default"}
                          data-testid="button-ari-send"
                        >
                          <Send className="mr-1.5 h-4 w-4" />
                          {mode === "er" ? "Send (ER, unverified)" : "Send"}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!gate.ok && (
                      <TooltipContent side="top">{gate.message}</TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </div>

        {uploadError && (
          <p
            className="mt-2 text-xs text-destructive"
            role="alert"
            data-testid="text-ari-upload-error"
          >
            {uploadError}
          </p>
        )}

        {!gate.ok && mode !== "er" && (
          <p
            className="mt-2 text-xs text-amber-700 dark:text-amber-400"
            data-testid="text-ari-gate-warning"
          >
            {gate.message}
          </p>
        )}
      </div>
    </div>
  );
}

function buildAcceptAttribute(capability: AriCapability): string {
  const parts: string[] = [];
  if (capability.acceptsImages) parts.push("image/*");
  if (capability.acceptsPdfs) parts.push("application/pdf", "text/plain");
  return parts.join(",");
}

function evaluateGate(opts: {
  capability: AriCapability;
  locationProvided: boolean;
  measurementConfirmed: boolean;
  attachments: AriAttachment[];
  mode: "ari" | "er";
}): { ok: boolean; message?: string } {
  // ER mode bypasses gates entirely.
  if (opts.mode === "er") return { ok: true };

  const { capability, locationProvided, measurementConfirmed, attachments } =
    opts;
  switch (capability.gateRequirement.type) {
    case "location":
      if (!locationProvided) {
        return { ok: false, message: capability.gateRequirement.uiHint };
      }
      return { ok: true };
    case "measurement_image": {
      const hasImage = attachments.some((a) => a.type === "image");
      if (!hasImage) {
        return {
          ok: false,
          message: "Attach a wound photo with a reference object before sending.",
        };
      }
      if (!measurementConfirmed) {
        return {
          ok: false,
          message:
            "Confirm a reference object is visible — required for accurate wound measurement.",
        };
      }
      return { ok: true };
    }
    default:
      return { ok: true };
  }
}

function GateStrip(props: {
  capability: AriCapability;
  locationProvided: boolean;
  measurementConfirmed: boolean;
  onToggleMeasurement: (v: boolean) => void;
  onInsertLocation: (text: string) => void;
  attachments: AriAttachment[];
}) {
  const {
    capability,
    locationProvided,
    measurementConfirmed,
    onToggleMeasurement,
    onInsertLocation,
    attachments,
  } = props;

  if (capability.gateRequirement.type === "location") {
    return (
      <div
        className={cn(
          "mb-2 flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-xs",
          locationProvided
            ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
            : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        )}
        data-testid="gate-ari-location"
      >
        <span
          className={cn(
            "inline-block h-2 w-2 rounded-full",
            locationProvided ? "bg-emerald-500" : "bg-amber-400"
          )}
        />
        <span className="font-medium">
          {locationProvided ? "Location detected" : "Location required"}
        </span>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="text-current/70 hover:text-current"
              aria-label="Why is location required?"
              data-testid="button-gate-location-help"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 text-xs">
            Antibiotic resistance patterns vary by region. Local data is
            required for evidence-based empiric therapy.
          </PopoverContent>
        </Popover>
        <LocationTemplates onInsert={onInsertLocation} />
      </div>
    );
  }

  if (capability.gateRequirement.type === "measurement_image") {
    const hasImage = attachments.some((a) => a.type === "image");
    return (
      <div
        className={cn(
          "mb-2 flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 text-xs",
          hasImage && measurementConfirmed
            ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
            : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        )}
        data-testid="gate-ari-measurement"
      >
        <label className="flex cursor-pointer items-center gap-2">
          <Checkbox
            checked={measurementConfirmed}
            onCheckedChange={(v) => onToggleMeasurement(v === true)}
            data-testid="checkbox-ari-measurement"
          />
          <span className="font-medium">
            Reference object visible (ruler, tape, coin, etc.)
          </span>
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="text-current/70 hover:text-current"
              aria-label="Why is a reference object required?"
              data-testid="button-gate-measurement-help"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 text-xs">
            NPUAP wound staging requires accurate dimensions. Reference objects
            let the AI estimate size from the photo.
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return null;
}
