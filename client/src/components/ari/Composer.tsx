import { useEffect, useRef, useState } from "react";
import { Paperclip, Send, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { fileToAttachment } from "@/lib/ariApi";
import {
  detectLocationInText,
  useAriStore,
  type AriAttachment,
} from "@/stores/ariStore";
import {
  getCapability,
  type AriCapability,
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
  const attachments = useAriStore((s) => s.attachments);
  const addAttachment = useAriStore((s) => s.addAttachment);
  const removeAttachment = useAriStore((s) => s.removeAttachment);
  const locationProvided = useAriStore((s) => s.locationProvided);
  const setLocationProvided = useAriStore((s) => s.setLocationProvided);
  const measurementConfirmed = useAriStore((s) => s.measurementConfirmed);
  const setMeasurementConfirmed = useAriStore((s) => s.setMeasurementConfirmed);

  const capability = getCapability(capabilityId);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Soften the location gate when the user types something that mentions a
  // location/facility. The flag is sticky once detected for this conversation.
  useEffect(() => {
    if (
      capability.gateRequirement.type === "location" &&
      !locationProvided &&
      detectLocationInText(query)
    ) {
      setLocationProvided(true);
    }
  }, [query, capability.gateRequirement.type, locationProvided, setLocationProvided]);

  const fileAccept = buildAcceptAttribute(capability);
  const attachmentsDisabled =
    mode === "er" || (!capability.acceptsImages && !capability.acceptsPdfs);

  const gate = evaluateGate({
    capability,
    locationProvided,
    measurementConfirmed,
    attachments,
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
    for (const file of Array.from(files)) {
      try {
        if (file.size > 20 * 1024 * 1024) {
          setUploadError(`${file.name} exceeds 20 MB.`);
          continue;
        }
        const attachment = await fileToAttachment(file);
        const allowed =
          (attachment.type === "image" && capability.acceptsImages) ||
          (attachment.type === "pdf" && capability.acceptsPdfs);
        if (!allowed) {
          setUploadError(
            `${capability.displayName} does not accept ${attachment.type} files.`
          );
          continue;
        }
        addAttachment(attachment);
      } catch (err: any) {
        setUploadError(err?.message || `Failed to attach ${file.name}.`);
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

  return (
    <div className="border-t border-border bg-background">
      <div className="mx-auto w-full max-w-4xl px-4 py-4 sm:px-6">
        {/* Gate strip */}
        {capability.gateRequirement.type !== "none" && (
          <GateStrip
            capability={capability}
            locationProvided={locationProvided}
            measurementConfirmed={measurementConfirmed}
            onToggleMeasurement={(v) => setMeasurementConfirmed(v)}
            disabled={mode === "er"}
          />
        )}

        <div
          className={cn(
            "rounded-lg border bg-card",
            gate.ok ? "border-border" : "border-amber-300 dark:border-amber-700"
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
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2">
            <div className="flex items-center gap-2">
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={attachmentsDisabled || disabled}
                        onClick={() => fileInputRef.current?.click()}
                        data-testid="button-ari-attach"
                      >
                        <Paperclip className="mr-1.5 h-4 w-4" />
                        Attach
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {mode === "er" && (
                    <TooltipContent>
                      File uploads are disabled in ER Mode.
                    </TooltipContent>
                  )}
                  {mode !== "er" && attachmentsDisabled && (
                    <TooltipContent>
                      This capability does not accept attachments.
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
                  "text-xs tabular-nums",
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
                <Button
                  type="button"
                  size="sm"
                  onClick={onSend}
                  disabled={!canSend}
                  data-testid="button-ari-send"
                >
                  <Send className="mr-1.5 h-4 w-4" />
                  Send
                </Button>
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

        {!gate.ok && (
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
  if (capability.acceptsPdfs) parts.push("application/pdf");
  return parts.join(",");
}

function evaluateGate(opts: {
  capability: AriCapability;
  locationProvided: boolean;
  measurementConfirmed: boolean;
  attachments: AriAttachment[];
}): { ok: boolean; message?: string } {
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
      if (!hasImage || !measurementConfirmed) {
        return { ok: false, message: capability.gateRequirement.uiHint };
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
  disabled?: boolean;
}) {
  const { capability, locationProvided, measurementConfirmed, onToggleMeasurement } = props;

  if (capability.gateRequirement.type === "location") {
    return (
      <div
        className={cn(
          "mb-2 flex items-center gap-2 rounded-md border px-3 py-2 text-xs",
          locationProvided
            ? "border-border bg-muted text-muted-foreground"
            : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        )}
        data-testid="gate-ari-location"
      >
        <span className="font-medium">
          {locationProvided ? "Location detected" : "Location required:"}
        </span>
        <span>{capability.gateRequirement.uiHint}.</span>
      </div>
    );
  }

  if (capability.gateRequirement.type === "measurement_image") {
    return (
      <label
        className={cn(
          "mb-2 flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs",
          measurementConfirmed
            ? "border-border bg-muted text-muted-foreground"
            : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        )}
        data-testid="gate-ari-measurement"
      >
        <Checkbox
          checked={measurementConfirmed}
          onCheckedChange={(v) => onToggleMeasurement(v === true)}
          aria-label="Photo includes a ruler or known-size reference object"
          data-testid="checkbox-ari-measurement"
        />
        <span>{capability.gateRequirement.uiHint}.</span>
      </label>
    );
  }

  return null;
}

function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: AriAttachment;
  onRemove: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1 text-xs"
      data-testid={`chip-ari-attachment-${attachment.filename}`}
    >
      {attachment.previewUrl ? (
        <img
          src={attachment.previewUrl}
          alt=""
          className="h-6 w-6 rounded object-cover"
        />
      ) : (
        <span className="rounded bg-muted px-1 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
          {attachment.type}
        </span>
      )}
      <span className="max-w-[180px] truncate" title={attachment.filename}>
        {attachment.filename}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded p-0.5 text-muted-foreground hover:text-foreground"
        aria-label={`Remove ${attachment.filename}`}
        data-testid={`button-ari-remove-${attachment.filename}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
