import { FileText, X, ImageIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AriAttachment } from "@/stores/ariStore";

interface AttachmentChipProps {
  attachment: AriAttachment;
  onRemove: () => void;
}

export function AttachmentChip({ attachment, onRemove }: AttachmentChipProps) {
  const isImage = attachment.type === "image";
  const sizeKb = attachment.sizeBytes
    ? Math.max(1, Math.round(attachment.sizeBytes / 1024))
    : null;

  return (
    <div
      className="group flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs"
      data-testid={`chip-attachment-${attachment.filename}`}
    >
      {isImage ? (
        attachment.previewUrl ? (
          <img
            src={attachment.previewUrl}
            alt={attachment.filename}
            className="h-10 w-10 rounded object-cover"
            data-testid={`thumb-attachment-${attachment.filename}`}
          />
        ) : (
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
        )
      ) : (
        <FileText className="h-4 w-4 text-muted-foreground" />
      )}
      <div className="min-w-0">
        <div className="max-w-[180px] truncate font-medium" title={attachment.filename}>
          {attachment.filename}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {sizeKb ? `${sizeKb} KB` : attachment.type}
          {attachment.pageCount ? ` · ${attachment.pageCount}p` : ""}
        </div>
      </div>
      {attachment.textPreview && (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-[10px] text-muted-foreground underline-offset-2 hover:underline"
                data-testid={`button-preview-attachment-${attachment.filename}`}
              >
                preview
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-sm whitespace-pre-wrap break-words font-mono text-[10px]"
            >
              {attachment.textPreview.slice(0, 600)}
              {attachment.textPreview.length > 600 ? "…" : ""}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="ml-1 rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
        aria-label={`Remove ${attachment.filename}`}
        data-testid={`button-remove-attachment-${attachment.filename}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
