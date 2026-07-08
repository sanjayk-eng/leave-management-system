import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettings } from "@/hooks/useSettings";
import { useLeavePolicies } from "@/hooks/useLeaves";
import { useBirthdayPreview } from "@/hooks/useBirthday";
import { useDebounce } from "@/hooks/useDebounce";
import { useApprovalFlow } from "@/hooks/useApprovalFlow";
import { payrollService } from "@/services/payrollService";
import { toast } from "sonner";
import {
  Settings as SettingsIcon,
  Trash2,
  Plus,
  Loader2,
  FileText,
  Edit,
  Cake,
  Eye,
  Building2,
  Clock,
  GitMerge,
  Shield,
} from "lucide-react";
import { RolePermissionsPanel } from "@/components/RolePermissionsPanel";
import { LeaveTimingSettings } from "@/components/LeaveTimingSettings";
import { ApprovalFlowSettings } from "@/components/ApprovalFlowSettings";
import { PolicyFormDialog, PolicyFormValues, POLICY_FORM_DEFAULTS } from "@/components/leave/PolicyFormDialog";
import { CardSkeleton } from "@/components/skeletons/CardSkeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Settings = () => {
  const { settings, isLoading: isLoadingSettings, updateSettings, isUpdating } = useSettings();
  const {
    policies = [],
    isLoading: isLoadingPolicies,
    addPolicy,
    isAdding: isAddingPolicy,
    updatePolicy,
    isUpdating: isUpdatingPolicy,
    deletePolicy,
    isDeleting: isDeletingPolicy,
  } = useLeavePolicies();
  const { flows = [] } = useApprovalFlow();

  // Company settings state
  const [workingDays, setWorkingDays] = useState(22);
  const [allowManagerAddLeave, setAllowManagerAddLeave] = useState(true);
  const [primaryColor, setPrimaryColor] = useState("#2980b9");
  const [secondaryColor, setSecondaryColor] = useState("#ecf0f1");
  const [companyName, setCompanyName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isPreviewingPayslip, setIsPreviewingPayslip] = useState(false);

  // Birthday template state
  const [birthdayTemplate, setBirthdayTemplate] = useState(
    "Happy Birthday {name}! 🎉 You're turning {age} on {date}. Have a wonderful day!"
  );
  const [previewName, setPreviewName] = useState("John");
  const [previewBirthDate, setPreviewBirthDate] = useState("1995-04-16");
  const [showPreview, setShowPreview] = useState(false);

  const debouncedPreviewName = useDebounce(previewName, 500);
  const debouncedPreviewBirthDate = useDebounce(previewBirthDate, 500);

  const { preview: birthdayPreview, isLoading: isLoadingPreview, refetch: refetchPreview } =
    useBirthdayPreview(showPreview ? debouncedPreviewName : undefined, showPreview ? debouncedPreviewBirthDate : undefined);

  // Leave policy dialog state
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [editPolicyDialogOpen, setEditPolicyDialogOpen] = useState(false);
  const [deletePolicyDialogOpen, setDeletePolicyDialogOpen] = useState(false);
  const [selectedPolicyId, setSelectedPolicyId] = useState<number | null>(null);
  const [editPolicyInitial, setEditPolicyInitial] = useState<Partial<PolicyFormValues>>(POLICY_FORM_DEFAULTS);

  const handleAddPolicy = (values: PolicyFormValues) => {
    addPolicy({
      name:                values.name,
      is_paid:             values.is_paid,
      is_early:            values.is_early,
      is_work_from_home:   values.is_work_from_home,
      default_entitlement: parseInt(values.default_entitlement),
      intern_entitlement:  values.intern_entitlement ? parseInt(values.intern_entitlement) : undefined,
      approval_flow_id:    values.approval_flow_id || undefined,
    });
    setPolicyDialogOpen(false);
  };

  const handleEditPolicyClick = (policy: (typeof policies)[number]) => {
    setSelectedPolicyId(policy.id);
    setEditPolicyInitial({
      name:                policy.name,
      is_paid:             policy.is_paid,
      is_early:            policy.is_early        || false,
      is_work_from_home:   policy.is_work_from_home || false,
      default_entitlement: policy.default_entitlement.toString(),
      intern_entitlement:  policy.intern_entitlement ? policy.intern_entitlement.toString() : '',
      approval_flow_id:    policy.approval_flow_id || '',
    });
    setEditPolicyDialogOpen(true);
  };

  const handleUpdatePolicy = (values: PolicyFormValues) => {
    if (!selectedPolicyId) return;
    updatePolicy({
      id: selectedPolicyId,
      data: {
        name:                values.name,
        is_paid:             values.is_paid,
        is_early:            values.is_early,
        is_work_from_home:   values.is_work_from_home,
        default_entitlement: parseInt(values.default_entitlement),
        intern_entitlement:  values.intern_entitlement ? parseInt(values.intern_entitlement) : undefined,
        approval_flow_id:    values.approval_flow_id || undefined,
      },
    });
    setEditPolicyDialogOpen(false);
    setSelectedPolicyId(null);
  };

  const handleDeletePolicyClick = (id: number) => {
    setSelectedPolicyId(id);
    setDeletePolicyDialogOpen(true);
  };

  useEffect(() => {
    if (settings) {
      setWorkingDays(settings.working_days_per_month);
      setAllowManagerAddLeave(settings.allow_manager_add_leave);
      // @ts-expect-error - primary_color not yet in Settings type
      if (settings.primary_color) setPrimaryColor(settings.primary_color);
      // @ts-expect-error - secondary_color not yet in Settings type
      if (settings.secondary_color) setSecondaryColor(settings.secondary_color);
      // @ts-expect-error - company_name not yet in Settings type
      if (settings.company_name) setCompanyName(settings.company_name);
      // @ts-expect-error - birthday_message_template not yet in Settings type
      if (settings.birthday_message_template) setBirthdayTemplate(settings.birthday_message_template);
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
      birthday_message_template: birthdayTemplate,
    });
  };

  const confirmDeletePolicy = () => {
    if (selectedPolicyId) deletePolicy(selectedPolicyId);
    setDeletePolicyDialogOpen(false);
    setSelectedPolicyId(null);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage company settings and configurations</p>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Company</span>
          </TabsTrigger>
          <TabsTrigger value="leave-policies" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Leave Policies</span>
          </TabsTrigger>
          <TabsTrigger value="leave-timing" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Leave Timing</span>
          </TabsTrigger>
          <TabsTrigger value="approval-flow" className="flex items-center gap-2">
            <GitMerge className="h-4 w-4" />
            <span className="hidden sm:inline">Approval Flow</span>
          </TabsTrigger>
          <TabsTrigger value="birthday" className="flex items-center gap-2">
            <Cake className="h-4 w-4" />
            <span className="hidden sm:inline">Birthday</span>
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Permissions</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Company Tab ── */}
        <TabsContent value="company">
          {isLoadingSettings ? (
            <CardSkeleton rows={6} />
          ) : (
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
          )}
        </TabsContent>

        {/* ── Leave Policies Tab ── */}
        <TabsContent value="leave-policies">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Leave Policies
                  </CardTitle>
                  <CardDescription>Configure leave types and entitlements</CardDescription>
                </div>
                <Button size="sm" onClick={() => setPolicyDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Policy
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingPolicies ? (
                <CardSkeleton showHeader={false} rows={4} />
              ) : (
                <div className="space-y-4">
                  {!policies || policies.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No leave policies configured. Click "Add Policy" to create one.
                    </p>
                  ) : (
                    policies.map((policy) => (
                      <div key={policy.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">{policy.name}</p>
                          <div className="flex items-center gap-2">
                            <Badge className={policy.is_paid ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}>
                              {policy.is_paid ? "Paid" : "Unpaid"}
                            </Badge>
                            {policy.is_early && <Badge className="bg-blue-500 text-white">Early</Badge>}
                            {policy.is_work_from_home && <Badge className="bg-purple-500 text-white">WFH</Badge>}
                            {policy.approval_flow_id && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <GitMerge className="h-3 w-3" />
                                {flows.find(f => f.id === policy.approval_flow_id)?.name ?? "Flow"}
                              </Badge>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => handleEditPolicyClick(policy)} disabled={isUpdatingPolicy}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeletePolicyClick(policy.id)} disabled={isDeletingPolicy}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{policy.default_entitlement} days per year</p>
                        {policy.intern_entitlement != null && (
                          <p className="text-xs text-muted-foreground">Intern: {policy.intern_entitlement} days per year</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Leave Timing Tab ── */}
        <TabsContent value="leave-timing">
          <LeaveTimingSettings />
        </TabsContent>

        {/* ── Approval Flow Tab ── */}
        <TabsContent value="approval-flow">
          <ApprovalFlowSettings />
        </TabsContent>

        {/* ── Birthday Tab ── */}
        <TabsContent value="birthday">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cake className="h-5 w-5 text-pink-500" />
                Birthday Message Template
              </CardTitle>
              <CardDescription>
                Customize the message sent via email and Slack on employee birthdays. Supported placeholders:{" "}
                <code className="text-xs bg-muted px-1 rounded">{"{name}"}</code>{" "}
                <code className="text-xs bg-muted px-1 rounded">{"{age}"}</code>{" "}
                <code className="text-xs bg-muted px-1 rounded">{"{date}"}</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="birthdayTemplate">Message Template</Label>
                <Textarea
                  id="birthdayTemplate"
                  value={birthdayTemplate}
                  onChange={(e) => setBirthdayTemplate(e.target.value)}
                  rows={3}
                  placeholder="Happy Birthday {name}! 🎉 You're turning {age} on {date}."
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Placeholders: <span className="font-mono">{"{name}"}</span> ·{" "}
                  <span className="font-mono">{"{age}"}</span> ·{" "}
                  <span className="font-mono">{"{date}"}</span>
                </p>
              </div>

              {/* Preview */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label>Preview Message</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => { setShowPreview(true); refetchPreview(); }}
                  >
                    <Eye className="h-4 w-4" />
                    Preview
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="previewName" className="text-xs text-muted-foreground">Name</Label>
                    <Input id="previewName" value={previewName} onChange={(e) => setPreviewName(e.target.value)} placeholder="John" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="previewBirthDate" className="text-xs text-muted-foreground">Birth Date</Label>
                    <Input id="previewBirthDate" type="date" value={previewBirthDate} onChange={(e) => setPreviewBirthDate(e.target.value)} />
                  </div>
                </div>
                {showPreview && (
                  <div className="rounded-lg border bg-pink-50 dark:bg-pink-950/20 p-3">
                    {isLoadingPreview ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading preview...
                      </div>
                    ) : birthdayPreview ? (
                      <p className="text-sm text-pink-800 dark:text-pink-200">{birthdayPreview.rendered}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Could not load preview.</p>
                    )}
                  </div>
                )}
              </div>

              <Button onClick={handleSaveSettings} className="w-full" disabled={isUpdating}>
                {isUpdating ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                ) : (
                  "Save Birthday Template"
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Permissions Tab ── */}
        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-slate-500" />
                Role Permissions
              </CardTitle>
              <CardDescription>
                Control what each role can do. Toggle individual permissions on or off.
                Scope and seniority rules are system-defined and cannot be changed here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RolePermissionsPanel />
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* ── Add Policy Dialog ── */}
      <PolicyFormDialog
        mode="add"
        open={policyDialogOpen}
        onOpenChange={setPolicyDialogOpen}
        flows={flows}
        onSubmit={handleAddPolicy}
        isSubmitting={isAddingPolicy}
      />

      {/* ── Edit Policy Dialog ── */}
      <PolicyFormDialog
        mode="edit"
        open={editPolicyDialogOpen}
        onOpenChange={setEditPolicyDialogOpen}
        initial={editPolicyInitial}
        flows={flows}
        onSubmit={handleUpdatePolicy}
        isSubmitting={isUpdatingPolicy}
      />

      {/* ── Delete Policy Confirm ── */}
      <AlertDialog open={deletePolicyDialogOpen} onOpenChange={setDeletePolicyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Leave Policy</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this leave policy? This action cannot be undone and may affect existing leave applications.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePolicy} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Policy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Settings;