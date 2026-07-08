import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/hooks/useSettings";
import { payrollService } from "@/services/payrollService";
import { toast } from "sonner";
import { Loader2, Eye, Building2 } from "lucide-react";
import { CardSkeleton } from "@/components/skeletons/CardSkeleton";

export default function CompanySettings() {
  const { settings, isLoading: isLoadingSettings, updateSettings, isUpdating } = useSettings();

  // Company settings state
  const [workingDays, setWorkingDays] = useState(22);
  const [allowManagerAddLeave, setAllowManagerAddLeave] = useState(true);
  const [primaryColor, setPrimaryColor] = useState("#2980b9");
  const [secondaryColor, setSecondaryColor] = useState("#ecf0f1");
  const [companyName, setCompanyName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isPreviewingPayslip, setIsPreviewingPayslip] = useState(false);

  useEffect(() => {
    if (settings) {
      setWorkingDays(settings.working_days_per_month);
      setAllowManagerAddLeave(settings.allow_manager_add_leave);
      if (settings.primary_color)   setPrimaryColor(settings.primary_color);
      if (settings.secondary_color) setSecondaryColor(settings.secondary_color);
      if (settings.company_name)    setCompanyName(settings.company_name);
    }
  }, [settings]);

  const handleSaveSettings = () => {
    updateSettings({
      working_days_per_month: workingDays,
      allow_manager_add_leave: allowManagerAddLeave,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      company_name: companyName,
      logo: logoFile,
    });
  };

  const handlePreviewPayslip = async () => {
    setIsPreviewingPayslip(true);
    try {
      await payrollService.previewPayslipPdf();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load payslip preview";
      toast.error(message);
    } finally {
      setIsPreviewingPayslip(false);
    }
  };

  if (isLoadingSettings) {
    return <CardSkeleton rows={6} />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* LEFT — General + Branding fields */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              General
            </CardTitle>
            <CardDescription>Company policies and branding configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Company name */}
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your Company Name"
              />
            </div>

            {/* Working days */}
            <div className="space-y-2">
              <Label htmlFor="workingDays">Working Days Per Month</Label>
              <Input
                id="workingDays"
                type="number"
                value={workingDays}
                onChange={(e) => setWorkingDays(Number(e.target.value))}
                min={20}
                max={31}
              />
              <p className="text-xs text-muted-foreground">Used for calculating salary deductions</p>
            </div>

            {/* Manager leave toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label>Allow Managers to Add Leave</Label>
                <p className="text-xs text-muted-foreground">
                  Permit managers to add leave on behalf of their team
                </p>
              </div>
              <Switch checked={allowManagerAddLeave} onCheckedChange={setAllowManagerAddLeave} />
            </div>

            <div className="border-t pt-4 space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Branding</p>

              {/* Primary color */}
              <div className="space-y-2">
                <Label htmlFor="brandColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="brandColor"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer shrink-0"
                  />
                  <Input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#2980b9"
                    className="flex-1 font-mono"
                  />
                </div>
              </div>

              {/* Secondary color */}
              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondaryColor"
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer shrink-0"
                  />
                  <Input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    placeholder="#ecf0f1"
                    className="flex-1 font-mono"
                  />
                </div>
              </div>

              {/* Logo upload */}
              <div className="space-y-2">
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

              {/* Payslip PDF preview */}
              <div className="rounded-lg border p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Payslip PDF Preview</p>
                  <p className="text-xs text-muted-foreground">
                    Opens a sample payslip with your real branding — no data saved
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-2"
                  onClick={handlePreviewPayslip}
                  disabled={isPreviewingPayslip}
                >
                  {isPreviewingPayslip ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Loading...</>
                  ) : (
                    <><Eye className="h-4 w-4" />Preview PDF</>
                  )}
                </Button>
              </div>
            </div>

            <Button onClick={handleSaveSettings} className="w-full" disabled={isUpdating}>
              {isUpdating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
              ) : (
                "Save Settings"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* RIGHT — Live Branding Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Branding Preview
            </CardTitle>
            <CardDescription>Live preview of your brand colors and identity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Color swatches */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Primary</p>
                <div
                  className="h-16 w-full rounded-lg border shadow-sm transition-all duration-300"
                  style={{ backgroundColor: primaryColor }}
                />
                <p className="text-xs font-mono text-center text-muted-foreground">{primaryColor}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Secondary</p>
                <div
                  className="h-16 w-full rounded-lg border shadow-sm transition-all duration-300"
                  style={{ backgroundColor: secondaryColor }}
                />
                <p className="text-xs font-mono text-center text-muted-foreground">{secondaryColor}</p>
              </div>
            </div>

            {/* Mock navbar preview */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Navbar Preview</p>
              <div
                className="rounded-lg p-3 flex items-center gap-3 shadow-sm transition-all duration-300"
                style={{ backgroundColor: primaryColor }}
              >
                <div className="h-8 w-8 rounded-md bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                  {companyName.charAt(0).toUpperCase()}
                </div>
                <span className="text-white font-semibold text-sm truncate">{companyName || "Company Name"}</span>
              </div>
            </div>

            {/* Mock button preview */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Button Preview</p>
              <div className="flex gap-2 flex-wrap">
                <button
                  className="px-4 py-2 rounded-md text-sm font-medium text-white shadow-sm transition-all duration-300"
                  style={{ backgroundColor: primaryColor }}
                >
                  Primary Action
                </button>
                <button
                  className="px-4 py-2 rounded-md text-sm font-medium shadow-sm border transition-all duration-300"
                  style={{ backgroundColor: secondaryColor, color: primaryColor, borderColor: primaryColor }}
                >
                  Secondary
                </button>
              </div>
            </div>

            {/* Mock badge / tag */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Badge Preview</p>
              <div className="flex gap-2 flex-wrap">
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold text-white transition-all duration-300"
                  style={{ backgroundColor: primaryColor }}
                >
                  Active
                </span>
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all duration-300"
                  style={{ backgroundColor: secondaryColor, color: primaryColor, borderColor: primaryColor }}
                >
                  Pending
                </span>
              </div>
            </div>

            {/* Logo preview */}
            {logoFile && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Logo Preview</p>
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <img
                    src={URL.createObjectURL(logoFile)}
                    alt="Company logo preview"
                    className="h-12 w-12 object-contain rounded"
                  />
                  <div>
                    <p className="text-sm font-semibold">{companyName}</p>
                    <p className="text-xs text-muted-foreground">{logoFile.name}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
