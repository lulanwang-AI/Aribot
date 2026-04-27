import { useEffect } from "react";
import { recordEvent } from "@/lib/analytics";
import { AriChat } from "@/components/ari-chat";

export default function Aribot() {
  useEffect(() => {
    recordEvent("page_view", { section: "aribot" });
    recordEvent("chat_opened", { specialty: undefined });
  }, []);

  return (
    <div className="h-full flex flex-col" data-testid="page-aribot">
      <AriChat variant="full" />
    </div>
  );
}
