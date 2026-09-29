import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

/**
 * A branded, on-screen preview of a simulated outbound email — used anywhere the app would, in
 * production, send the client a real message. Every email in the product shares this shell:
 * the indigro logo on a navy header, a short professional greeting, and one clear call to action.
 */
export function EmailPreview({
  to,
  subject,
  heading,
  body,
  ctaLabel,
  onCta,
  fromOrg,
}: {
  to: string;
  subject: string;
  heading: string;
  body: string[];
  ctaLabel?: string;
  onCta?: () => void;
  fromOrg?: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="space-y-0.5 border-b bg-secondary/50 px-5 py-3 text-xs">
        <p>
          <span className="font-medium text-foreground">To:</span>{" "}
          <span className="text-muted-foreground">{to}</span>
        </p>
        <p>
          <span className="font-medium text-foreground">Subject:</span>{" "}
          <span className="text-muted-foreground">{subject}</span>
        </p>
      </div>
      <div className="bg-navy px-8 py-6 text-center">
        <Logo onDark size="lg" className="justify-center" />
      </div>
      <div className="space-y-4 bg-card px-8 py-8">
        <h3 className="text-xl font-semibold text-foreground">{heading}</h3>
        {body.map((p) => (
          <p key={p} className="text-sm leading-6 text-muted-foreground">
            {p}
          </p>
        ))}
        {onCta && ctaLabel && (
          <Button onClick={onCta} className="mt-2">
            {ctaLabel}
          </Button>
        )}
      </div>
      <div className="border-t bg-secondary/30 px-8 py-4 text-center text-[11px] text-muted-foreground">
        <p>
          {BRAND.name} {fromOrg ? `· ${fromOrg}` : ""}
        </p>
        <p className="mt-1">This is a simulated email shown for demonstration purposes.</p>
      </div>
    </div>
  );
}
