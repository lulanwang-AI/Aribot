import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MapPin } from "lucide-react";

const TEMPLATES: Array<{ label: string; insert: string }> = [
  { label: "Cedars-Sinai LA", insert: "Patient location: Cedars-Sinai Medical Center, Los Angeles, CA. " },
  { label: "UCLA Health", insert: "Patient location: UCLA Health, Los Angeles, CA. " },
  { label: "Kaiser Permanente SoCal", insert: "Patient location: Kaiser Permanente Southern California. " },
  { label: "Huntington Memorial Pasadena", insert: "Patient location: Huntington Memorial Hospital, Pasadena, CA. " },
];

interface LocationTemplatesProps {
  onInsert: (text: string) => void;
}

export function LocationTemplates({ onInsert }: LocationTemplatesProps) {
  const [open, setOpen] = useState(false);

  function handleSelect(text: string) {
    onInsert(text);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-[11px]"
          data-testid="button-location-templates"
        >
          <MapPin className="mr-1 h-3 w-3" />
          Templates
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-64 p-2"
        data-testid="popover-location-templates"
      >
        <div className="mb-2 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Quick-fill location
        </div>
        <div className="flex flex-col gap-1">
          {TEMPLATES.map((t) => (
            <Button
              key={t.label}
              type="button"
              variant="ghost"
              size="sm"
              className="justify-start text-xs"
              onClick={() => handleSelect(t.insert)}
              data-testid={`button-template-${t.label.replace(/\s+/g, "-").toLowerCase()}`}
            >
              {t.label}
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="justify-start text-xs"
            onClick={() =>
              handleSelect(
                "Patient is at [facility name in city]. "
              )
            }
            data-testid="button-template-other"
          >
            Other…
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
