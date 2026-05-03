import { useEffect, useState } from "react";
import { AriMessage } from "@/components/ari/AriMessage";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import sampleResponseUrl from "@/components/ari/__fixtures__/sample-response.txt?url";

const ER_FIXTURE = `{"ari_section": "er_triage", "mode": "er"}

ER MODE ACTIVE — RESPONSE NOT VERIFIED AGAINST LIVE SOURCES. CONFIRM BEFORE CLINICAL USE.

For chest pain in a 56-year-old: ESI Level 2 if vital signs are abnormal or pain is ongoing; immediate ECG within 10 minutes per AHA/ACC consensus.

If high suspicion for ACS — aspirin 324 mg chewed, oxygen only if SpO2 <94%, nitroglycerin SL if BP >100 systolic and no recent PDE5 inhibitor.
`;

export default function AribotDevBlocks() {
  const [text, setText] = useState<string>("Loading fixture…");
  const [mode, setMode] = useState<"ari" | "er">("ari");
  const [streaming, setStreaming] = useState(false);

  useEffect(() => {
    fetch(sampleResponseUrl)
      .then((r) => r.text())
      .then(setText)
      .catch(() => setText("(fixture failed to load)"));
  }, []);

  async function simulateStream() {
    const original = text;
    setStreaming(true);
    setText("");
    for (let i = 0; i < original.length; i += 8) {
      setText(original.slice(0, i + 8));
      await new Promise((r) => setTimeout(r, 16));
    }
    setStreaming(false);
  }

  return (
    <div
      className="mx-auto max-w-4xl space-y-6 px-4 py-8"
      data-testid="page-ari-dev-blocks"
    >
      <header>
        <h1 className="text-xl font-semibold">Ari blocks — dev fixture</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Iterate on AriMessage rendering without burning API calls. Switch
          mode to verify ER-mode rules (no claim/citation/step blocks should
          render normally; section pill is hidden).
        </p>
      </header>

      <Tabs value={mode} onValueChange={(v) => setMode(v as "ari" | "er")}>
        <TabsList>
          <TabsTrigger value="ari" data-testid="tab-dev-mode-ari">
            Ari mode fixture
          </TabsTrigger>
          <TabsTrigger value="er" data-testid="tab-dev-mode-er">
            ER mode fixture
          </TabsTrigger>
        </TabsList>
        <TabsContent value="ari" />
        <TabsContent value="er" />
      </Tabs>

      <div className="flex gap-2">
        <Button onClick={simulateStream} data-testid="button-simulate-stream">
          Simulate stream
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            if (mode === "er") setText(ER_FIXTURE);
            else
              fetch(sampleResponseUrl)
                .then((r) => r.text())
                .then(setText);
          }}
          data-testid="button-reset-fixture"
        >
          Reset fixture
        </Button>
      </div>

      <Textarea
        value={mode === "er" ? ER_FIXTURE : text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        className="font-mono text-xs"
        data-testid="textarea-dev-raw"
      />

      <div className="rounded-lg border border-border bg-card p-4">
        <AriMessage
          text={mode === "er" ? ER_FIXTURE : text}
          mode={mode}
          streaming={streaming}
        />
      </div>
    </div>
  );
}
