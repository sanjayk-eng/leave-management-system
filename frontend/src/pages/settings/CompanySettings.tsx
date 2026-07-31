import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useSettings } from "@/hooks/useSettings";
import { payrollService } from "@/services/payrollService";
import { toast } from "sonner";
import { Loader2, Eye, Building2, Palette } from "lucide-react";
import { CardSkeleton } from "@/components/skeletons/CardSkeleton";
import { ErrorDisplay } from "@/components/ErrorDisplay";

// ── small helpers ─────────────────────────────────────────────────────────────

/** A single labelled row inside the details grid */
const DetailRow = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-center justify-between py-3 border-b last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <div className="text-sm font-medium">{children}</div>
  </div>
);

/** Section divider with a label */
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 mt-1">
    {children}
  </p>
);

// ── main component ────────────────────────────────────────────────────────────

export default function CompanySettings() {
  const {
    settings,
    isLoading: isLoadingSettings,
    updateSettings,
    isUpdating,
    error,
  } = useSettings();

  const [workingDays, setWorkingDays] = useState(0);
  const [allowManagerAddLeave, setAllowManagerAddLeave] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isPreviewingPayslip, setIsPreviewingPayslip] = useState(false);

  useEffect(() => {
    if (settings) {
      setWorkingDays(settings.working_days_per_month);
      setAllowManagerAddLeave(settings.allow_manager_add_leave);
      setPrimaryColor(settings.primary_color ?? "");
      setSecondaryColor(settings.secondary_color ?? "");
      setCompanyName(settings.company_name ?? "");
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings(
      {
        working_days_per_month: workingDays,
        allow_manager_add_leave: allowManagerAddLeave,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        company_name: companyName,
        logo: logoFile,
      },
      {
        onError: () => {
          if (settings) {
            setWorkingDays(settings.working_days_per_month);
            setAllowManagerAddLeave(settings.allow_manager_add_leave);
            setPrimaryColor(settings.primary_color ?? "");
            setSecondaryColor(settings.secondary_color ?? "");
            setCompanyName(settings.company_name ?? "");
          }
          setLogoFile(null);
        },
      }
    );
  };

  const handlePreviewPayslip = async () => {
    setIsPreviewingPayslip(true);
    try {
      await payrollService.previewPayslipPdf();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load payslip preview";
      toast.error(message);
    } finally {
      setIsPreviewingPayslip(false);
    }
  };

  if (isLoadingSettings) return <CardSkeleton rows={6} />;
  if (error) return <ErrorDisplay error={error} />;

  const initial = companyName.charAt(0).toUpperCase() || "?";

  return (
    <div className="grid gap-6 lg:grid-cols-2">

      {/* ── LEFT — form ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            General
          </CardTitle>
          <CardDescription>Company policies and branding configuration</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">

          {/* Company name */}
          <div className="space-y-1.5">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your Company Name"
            />
          </div>

          {/* Working days */}
          <div className="space-y-1.5">
            <Label htmlFor="workingDays">Working Days Per Month</Label>
            <Input
              id="workingDays"
              type="number"
              value={workingDays}
              onChange={(e) => setWorkingDays(Number(e.target.value))}
              min={20}
              max={31}
            />
            <p className="text-xs text-muted-foreground">
              Used for calculating salary deductions
            </p>
          </div>

          {/* Manager leave toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
            <div className="space-y-0.5">
              <Label className="text-sm">Allow Managers to Add Leave</Label>
              <p className="text-xs text-muted-foreground">
                Permit managers to add leave on behalf of their team
              </p>
            </div>
            <Switch
              checked={allowManagerAddLeave}
              onCheckedChange={setAllowManagerAddLeave}
            />
          </div>

          <Separator />

          {/* Branding */}
          <SectionLabel>Branding</SectionLabel>

          {/* Primary color */}
          <div className="space-y-1.5">
            <Label htmlFor="primaryColor">Primary Color</Label>
            <div className="flex items-center gap-2">
              <div className="relative shrink-0">
                <input
                  id="primaryColor"
                  type="color"
                  value={primaryColor || "#000000"}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  aria-label="Pick primary color"
                />
                <div
                  className="w-9 h-9 rounded-md border-2 border-border"
                  style={{ backgroundColor: primaryColor || "#000000" }}
                />
              </div>
              <Input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#2980b9"
                className="flex-1 font-mono text-sm"
              />
            </div>
          </div>

          {/* Secondary color */}
          <div className="space-y-1.5">
            <Label htmlFor="secondaryColor">Secondary Color</Label>
            <div className="flex items-center gap-2">
              <div className="relative shrink-0">
                <input
                  id="secondaryColor"
                  type="color"
                  value={secondaryColor || "#000000"}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  aria-label="Pick secondary color"
                />
                <div
                  className="w-9 h-9 rounded-md border-2 border-border"
                  style={{ backgroundColor: secondaryColor || "#000000" }}
                />
              </div>
              <Input
                type="text"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                placeholder="#ecf0f1"
                className="flex-1 font-mono text-sm"
              />
            </div>
          </div>

          {/* Logo upload */}
          <div className="space-y-1.5">
            <Label htmlFor="logo">Company Logo</Label>
            <Input
              id="logo"
              type="file"
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">PNG or JPG — used on payslips</p>
          </div>

          {/* Payslip preview */}
          <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
            <div>
              <p className="text-sm font-medium">Payslip PDF Preview</p>
              <p className="text-xs text-muted-foreground">
                Sample payslip with your branding — no data saved
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={handlePreviewPayslip}
              disabled={isPreviewingPayslip}
            >
              {isPreviewingPayslip ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
              {isPreviewingPayslip ? "Loading…" : "Preview PDF"}
            </Button>
          </div>

          <Button onClick={handleSave} className="w-full" disabled={isUpdating}>
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ── RIGHT — branding preview ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4 text-muted-foreground" />
            Branding Preview
          </CardTitle>
          <CardDescription>Live preview of your brand colors and identity</CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">

          {/* Color chips */}
          <div>
            <SectionLabel>Colors</SectionLabel>
            <div className="flex gap-3">
              {[
                { label: "Primary", color: primaryColor },
                { label: "Secondary", color: secondaryColor },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div
                    className="w-8 h-8 rounded-md border border-border shrink-0"
                    style={{ backgroundColor: color || "transparent" }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-xs font-mono truncate">{color || "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Navbar strip */}
          <div>
            <SectionLabel>Navbar</SectionLabel>
            <div
              className="rounded-lg px-3 py-2.5 flex items-center gap-2.5 transition-colors duration-200"
              style={{ backgroundColor: primaryColor || "hsl(var(--muted))" }}
            >
              <div
                className="h-7 w-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  backgroundColor: "rgba(255,255,255,0.2)",
                  color: "#fff",
                }}
              >
                {initial}
              </div>
              <span
                className="text-sm font-semibold truncate"
                style={{ color: primaryColor ? "#fff" : "hsl(var(--foreground))" }}
              >
                {companyName || "Company Name"}
              </span>
            </div>
          </div>

          <Separator />

          {/* Button row */}
          <div>
            <SectionLabel>Buttons</SectionLabel>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                className="px-3.5 py-1.5 rounded-md text-sm font-medium text-white transition-opacity"
                style={{ backgroundColor: primaryColor || "hsl(var(--primary))" }}
              >
                Primary
              </button>
              <button
                className="px-3.5 py-1.5 rounded-md text-sm font-medium border transition-opacity"
                style={{
                  backgroundColor: secondaryColor || "transparent",
                  color: primaryColor || "hsl(var(--foreground))",
                  borderColor: primaryColor || "hsl(var(--border))",
                }}
              >
                Secondary
              </button>
            </div>
          </div>

          <Separator />

          {/* Badge row */}
          <div>
            <SectionLabel>Badges</SectionLabel>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: primaryColor || "hsl(var(--primary))" }}
              >
                Active
              </span>
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
                style={{
                  backgroundColor: secondaryColor || "transparent",
                  color: primaryColor || "hsl(var(--foreground))",
                  borderColor: primaryColor || "hsl(var(--border))",
                }}
              >
                Pending
              </span>
            </div>
          </div>

          {/* Logo preview — only when a file is chosen */}
          {logoFile && (
            <>
              <Separator />
              <div>
                <SectionLabel>Logo</SectionLabel>
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                  <img
                    src={URL.createObjectURL(logoFile)}
                    alt="Company logo preview"
                    className="h-10 w-10 object-contain rounded"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{companyName}</p>
                    <p className="text-xs text-muted-foreground truncate">{logoFile.name}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
