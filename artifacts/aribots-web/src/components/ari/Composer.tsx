import { useEffect, useRef, useState } from "react";
import {
  Check,
  HelpCircle,
  Loader2,
  Mic,
  MicOff,
  Paperclip,
  Plus,
  Send,
  Square,
} from "lucide-react";
import { getCapabilityIcon } from "@/lib/capabilityIcons";
import { VoiceRecorder, LiveTranscriber, transcribeAudio } from "@/lib/ariVoice";
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

  // Capability is optional. When null, Ari will auto-infer from the query
  // and we fall back to permissive defaults (no gates, all attachment types
  // allowed, generic placeholder).
  const capability = capabilityId ? getCapability(capabilityId) : null;
  const inputHint = capability
    ? capability.inputHint
    : mode === "er"
      ? "Describe the case — ER mode is unverified, confirm before clinical use."
      : "Ask Ari anything — pick a capability with + or let Ari choose.";

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [capabilityMenuOpen, setCapabilityMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  // Live interim transcript surfaced inside the composer while the user
  // is speaking. Authoritative final text still comes from the server.
  const [liveTranscript, setLiveTranscript] = useState("");
  // Elapsed time for the recording banner. Bumped every 250ms so the
  // displayed mm:ss is smooth without thrashing renders.
  const [recordElapsedMs, setRecordElapsedMs] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const dragDepthRef = useRef(0);
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const liveTranscriberRef = useRef<LiveTranscriber | null>(null);
  const recordTickRef = useRef<number | null>(null);
  // Guards against rapid double-clicks of the mic button starting two
  // overlapping recorder/transcriber sessions while `await rec.start()`
  // is still pending and `setRecording(true)` has not yet committed.
  const voiceBusyRef = useRef(false);
  const voiceSupported = VoiceRecorder.isSupported();
  const liveSupported = LiveTranscriber.isSupported();

  // Stop any in-flight recording if the composer unmounts or the user
  // switches tabs away mid-record.
  useEffect(() => {
    return () => {
      recorderRef.current?.cancel();
      recorderRef.current = null;
      liveTranscriberRef.current?.stop();
      liveTranscriberRef.current = null;
      if (recordTickRef.current !== null) {
        window.clearInterval(recordTickRef.current);
        recordTickRef.current = null;
      }
    };
  }, []);

  function startRecordingTimer() {
    const startedAt = Date.now();
    setRecordElapsedMs(0);
    if (recordTickRef.current !== null) {
      window.clearInterval(recordTickRef.current);
    }
    recordTickRef.current = window.setInterval(() => {
      setRecordElapsedMs(Date.now() - startedAt);
    }, 250);
  }

  function stopRecordingTimer() {
    if (recordTickRef.current !== null) {
      window.clearInterval(recordTickRef.current);
      recordTickRef.current = null;
    }
  }

  async function handleVoiceClick() {
    if (transcribing) return;
    // Reentrancy guard: prevents a fast double-click from starting two
    // recorders before `setRecording(true)` commits.
    if (voiceBusyRef.current) return;
    voiceBusyRef.current = true;
    try {
      await runVoiceClick();
    } finally {
      voiceBusyRef.current = false;
    }
  }

  async function runVoiceClick() {
    if (recording) {
      // Stop & transcribe.
      const rec = recorderRef.current;
      const live = liveTranscriberRef.current;
      live?.stop();
      liveTranscriberRef.current = null;
      stopRecordingTimer();
      if (!rec) {
        setRecording(false);
        setLiveTranscript("");
        return;
      }
      setTranscribing(true);
      setRecording(false);
      try {
        const blob = await rec.stop();
        const text = await transcribeAudio(blob);
        if (text) {
          // Append to existing draft so users can dictate multiple snippets.
          const next = query
            ? `${query.replace(/\s+$/, "")} ${text}`
            : text;
          setQuery(next.slice(0, MAX_QUERY));
          textareaRef.current?.focus();
        } else {
          toast({
            title: "No speech detected",
            description: "Try recording again — speak a bit closer to the mic.",
          });
        }
      } catch (err: any) {
        toast({
          title: "Voice input failed",
          description: err?.message || "Unable to transcribe audio.",
          variant: "destructive",
        });
      } finally {
        recorderRef.current = null;
        setTranscribing(false);
        setLiveTranscript("");
      }
      return;
    }

    // Start recording.
    const rec = new VoiceRecorder();
    try {
      await rec.start();
      recorderRef.current = rec;
      setRecording(true);
      startRecordingTimer();
      // Tell the user we're recording with a quick non-blocking toast so
      // the action is unmistakable, even if the banner is below the fold.
      toast({
        title: "Recording — speak now",
        description:
          "Click the mic again to stop and transcribe. Your audio goes only to the transcription provider.",
      });
      // Best-effort live preview via the Web Speech API. If the browser
      // doesn't support it, we just skip the live transcript and rely on
      // the final ElevenLabs transcription.
      if (liveSupported) {
        const live = new LiveTranscriber();
        const ok = live.start({
          onInterim: (text) => setLiveTranscript(text),
          onError: () => {
            // Fail silently — the final transcription still works.
            setLiveTranscript("");
          },
        });
        if (ok) liveTranscriberRef.current = live;
      }
    } catch (err: any) {
      stopRecordingTimer();
      toast({
        title: "Microphone unavailable",
        description:
          err?.message ||
          "Allow microphone access in your browser to dictate questions.",
        variant: "destructive",
      });
    }
  }

  // Soften the location gate when the user types something that mentions a
  // location/facility. Sticky once detected.
  useEffect(() => {
    if (
      capability?.gateRequirement.type === "location" &&
      !locationProvided &&
      detectLocationInText(query)
    ) {
      setLocationProvided(true);
    }
  }, [query, capability?.gateRequirement.type, locationProvided, setLocationProvided]);

  // Clear attachments when capability changes to one that doesn't accept them.
  useEffect(() => {
    if (attachments.length === 0 || !capability) return;
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

  const fileAccept = capability
    ? buildAcceptAttribute(capability)
    : "image/*,application/pdf,text/plain";
  const attachmentsDisabled = capability
    ? !capability.acceptsImages && !capability.acceptsPdfs
    : false;

  const gate = capability
    ? evaluateGate({
        capability,
        locationProvided,
        measurementConfirmed,
        attachments,
        mode,
      })
    : { ok: true as const };

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
        // When no capability is selected, accept everything — Ari will
        // infer how to handle the attachment from the query.
        const allowed =
          !capability ||
          (attachment.type === "image" && capability.acceptsImages) ||
          (attachment.type === "pdf" && capability.acceptsPdfs) ||
          (attachment.type === "document" && capability.acceptsPdfs);
        if (!allowed && capability) {
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
    if (attachmentsDisabled && capability) {
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
        "border-t backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-500",
        mode === "er"
          ? "border-rose-400/70 shadow-[0_-6px_24px_-12px_rgba(244,63,94,0.35)] dark:border-rose-500/50"
          : ""
      )}
      style={mode !== "er" ? {
        backgroundColor: "rgba(255,255,255,0.55)",
        borderColor: "rgba(255,255,255,0.72)",
      } : undefined}
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
        {capability && capability.gateRequirement.type !== "none" && mode !== "er" && (
          <GateStrip
            capability={capability}
            locationProvided={locationProvided}
            measurementConfirmed={measurementConfirmed}
            onToggleMeasurement={(v) => setMeasurementConfirmed(v)}
            onInsertLocation={handleLocationInsert}
            attachments={attachments}
          />
        )}

        {recording && (
          <RecordingBanner
            elapsedMs={recordElapsedMs}
            liveText={liveTranscript}
            liveSupported={liveSupported}
            onStop={handleVoiceClick}
          />
        )}
        {transcribing && !recording && (
          <div
            className="mb-2 flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
            data-testid="banner-ari-transcribing"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Transcribing your recording…</span>
          </div>
        )}

        <div
          className={cn(
            "rounded-2xl border backdrop-blur-sm",
            mode === "er"
              ? "border-red-500 bg-card"
              : gate.ok
                ? ""
                : "border-amber-300 dark:border-amber-700"
          )}
          style={mode !== "er" && gate.ok ? {
            backgroundColor: "rgba(255,255,255,0.72)",
            borderColor: "rgba(255,255,255,0.90)",
            boxShadow: "0 4px 32px rgba(42,123,255,0.08)",
          } : undefined}
        >
          <Textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value.slice(0, MAX_QUERY))}
            onKeyDown={handleKeyDown}
            placeholder={inputHint}
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

          <div className="flex items-center justify-between gap-3 border-t px-3 py-2" style={{ borderColor: "rgba(255,255,255,0.72)" }}>
            <div className="flex items-center gap-1">
              {/* Plus button — opens an inline picker for any capability so
                  users don't need the sidebar to switch context.
                  Hidden in ER mode: ER bypasses capability gating entirely. */}
              {mode !== "er" && (
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
                  sideOffset={8}
                  className="w-80 p-1 duration-200 data-[state=open]:zoom-in-90 data-[side=top]:slide-in-from-bottom-3"
                  data-testid="popover-ari-capability-menu"
                >
                  <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Choose capabilities
                  </div>
                  <div className="px-2 pb-1.5 text-[11px] text-muted-foreground">
                    Pick one or more to focus the answer.
                  </div>
                  <ul className="max-h-72 overflow-y-auto">
                    {ARI_CAPABILITIES.map((cap, idx) => {
                      const isPrimary = cap.id === capabilityId;
                      const isAdditional = additionalCapabilities.includes(
                        cap.id as AriCapabilityId
                      );
                      const selected = isPrimary || isAdditional;
                      const Icon = getCapabilityIcon(cap.id as AriCapabilityId);
                      return (
                        <li
                          key={cap.id}
                          className="animate-in fade-in-0 slide-in-from-top-1 fill-mode-both"
                          style={{ animationDelay: `${idx * 25}ms`, animationDuration: "260ms" }}
                        >
                          <button
                            type="button"
                            className={cn(
                              "group flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left text-xs transition-all duration-150 hover:bg-accent hover:translate-x-0.5 focus-visible:bg-accent focus-visible:outline-none",
                              selected && "bg-accent/60"
                            )}
                            onClick={() =>
                              toggleCapability(cap.id as AriCapabilityId)
                            }
                            data-testid={`button-pick-capability-${cap.id}`}
                          >
                            <span
                              className={cn(
                                "mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors",
                                selected
                                  ? "border-primary/40 bg-primary/10 text-primary"
                                  : "border-border bg-muted/40 text-muted-foreground group-hover:border-primary/30 group-hover:text-primary"
                              )}
                              data-testid={`icon-capability-${cap.id}`}
                            >
                              {Icon ? (
                                <Icon className="h-3.5 w-3.5" />
                              ) : (
                                <Plus className="h-3.5 w-3.5" />
                              )}
                            </span>
                            <span className="flex-1">
                              <span className="font-medium text-foreground">
                                {cap.displayName}
                              </span>
                              <span className="block text-[11px] text-muted-foreground">
                                {cap.shortDescription}
                              </span>
                            </span>
                            <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center">
                              {selected && (
                                <Check
                                  className="h-3.5 w-3.5 text-primary animate-in zoom-in-50 fade-in-0 duration-150"
                                  aria-label="Selected"
                                />
                              )}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </PopoverContent>
              </Popover>
              )}

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
              {voiceSupported && (
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          type="button"
                          variant={recording ? "destructive" : "outline"}
                          size="sm"
                          disabled={disabled || transcribing || streaming}
                          onClick={handleVoiceClick}
                          data-testid="button-ari-voice"
                          aria-pressed={recording}
                          aria-label={
                            recording
                              ? "Stop recording and transcribe"
                              : "Dictate with voice"
                          }
                          className={cn(recording && "animate-pulse")}
                        >
                          {transcribing ? (
                            <>
                              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                              Transcribing…
                            </>
                          ) : recording ? (
                            <>
                              <MicOff className="mr-1.5 h-4 w-4" />
                              Stop
                            </>
                          ) : (
                            <>
                              <Mic className="mr-1.5 h-4 w-4" />
                              Speak
                            </>
                          )}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {recording
                        ? "Click again to stop and transcribe."
                        : transcribing
                          ? "Sending audio to transcription…"
                          : "Dictate your question — voice is converted to text via ElevenLabs."}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
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
                        {mode === "er" ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={onSend}
                            disabled={!canSend}
                            variant="destructive"
                            data-testid="button-ari-send"
                          >
                            <Send className="mr-1.5 h-4 w-4" />
                            Send (ER, unverified)
                          </Button>
                        ) : (
                          <button
                            type="button"
                            onClick={onSend}
                            disabled={!canSend}
                            data-testid="button-ari-send"
                            className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-sm font-medium text-white shadow-md transition-opacity disabled:opacity-40"
                            style={{
                              background: "linear-gradient(135deg, #2a7bff 0%, #12b5c9 100%)",
                              boxShadow: "0 4px 16px rgba(42,123,255,0.35)",
                            }}
                          >
                            <Send className="h-4 w-4" />
                            Send
                          </button>
                        )}
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

interface RecordingBannerProps {
  elapsedMs: number;
  liveText: string;
  liveSupported: boolean;
  onStop: () => void;
}

function RecordingBanner({
  elapsedMs,
  liveText,
  liveSupported,
  onStop,
}: RecordingBannerProps) {
  const seconds = Math.floor(elapsedMs / 1000);
  const mm = Math.floor(seconds / 60).toString().padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");
  return (
    <div
      className="mb-2 flex items-start gap-3 rounded-md border border-rose-300 bg-rose-50/80 px-3 py-2 text-rose-900 dark:border-rose-700/60 dark:bg-rose-950/30 dark:text-rose-100"
      data-testid="banner-ari-recording"
    >
      {/* Single, one-shot screen-reader announcement when recording starts.
          The visible timer and interim transcript update many times per
          second, so we keep them aria-hidden to avoid noisy announcements,
          and announce just the coarse state change here. */}
      <span className="sr-only" role="status" aria-live="polite">
        Recording in progress. Click stop and transcribe when finished.
      </span>
      <div className="mt-0.5 flex shrink-0 items-center gap-2" aria-hidden>
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-600" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide">
          Recording
        </span>
        <span
          className="text-xs font-medium tabular-nums opacity-80"
          data-testid="text-ari-record-elapsed"
        >
          {mm}:{ss}
        </span>
      </div>
      <div className="min-w-0 flex-1" aria-hidden>
        {liveSupported ? (
          liveText ? (
            <p
              className="line-clamp-2 text-xs leading-relaxed"
              data-testid="text-ari-live-transcript"
              title="Live preview — final transcript may differ"
            >
              <span className="mr-1 rounded bg-rose-200/70 px-1 py-px text-[10px] font-semibold uppercase tracking-wide text-rose-800 dark:bg-rose-900/60 dark:text-rose-100">
                Preview
              </span>
              <span className="opacity-90">{liveText}</span>
              <span className="ml-0.5 inline-block w-px animate-pulse">|</span>
            </p>
          ) : (
            <p className="text-xs italic opacity-70">
              Listening… speak now. Click the mic again to stop and transcribe.
            </p>
          )
        ) : (
          <p className="text-xs italic opacity-70">
            Speak now. Click the mic again to stop and transcribe.
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onStop}
        className="shrink-0 rounded-md border border-rose-300 bg-white/80 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-white dark:border-rose-700/60 dark:bg-rose-950/50 dark:text-rose-100 dark:hover:bg-rose-950/70"
        data-testid="button-ari-record-stop"
        aria-label="Stop recording and transcribe"
      >
        Stop & transcribe
      </button>
    </div>
  );
}
