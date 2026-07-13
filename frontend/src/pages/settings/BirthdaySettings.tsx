import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSettings } from "@/hooks/useSettings";
import { useBirthdayPreview } from "@/hooks/useBirthday";
import { useDebounce } from "@/hooks/useDebounce";
import { ApiError } from "@/lib/api";
import { Loader2, Cake, Eye, ShieldX } from "lucide-react";

export default function BirthdaySettings() {
  const { settings, updateSettings, isUpdating } = useSettings();

  const [birthdayTemplate, setBirthdayTemplate] = useState(
    "Happy Birthday {name}! 🎉 You're turning {age} on {date}. Have a wonderful day!"
  );
  const [previewName, setPreviewName] = useState("John");
  const [previewBirthDate, setPreviewBirthDate] = useState("1995-04-16");
  const [showPreview, setShowPreview] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState("");

  const debouncedPreviewName = useDebounce(previewName, 500);
  const debouncedPreviewBirthDate = useDebounce(previewBirthDate, 500);

  const { preview: birthdayPreview, isLoading: isLoadingPreview, refetch: refetchPreview } =
    useBirthdayPreview(
      showPreview ? debouncedPreviewName : undefined,
      showPreview ? debouncedPreviewBirthDate : undefined
    );

  useEffect(() => {
    if (settings) {
      if (settings.birthday_message_template) setBirthdayTemplate(settings.birthday_message_template);
    }
  }, [settings]);

  const handleSaveSettings = () => {
    if (!settings) return;
    setAccessDenied(false);
    updateSettings(
      {
        working_days_per_month:    settings.working_days_per_month,
        allow_manager_add_leave:   settings.allow_manager_add_leave,
        primary_color:             settings.primary_color   ?? "#2980b9",
        secondary_color:           settings.secondary_color ?? "#ecf0f1",
        company_name:              settings.company_name    ?? "",
        birthday_message_template: birthdayTemplate,
      },
      {
        onError: (error) => {
          // Roll the template back to last saved value
          if (settings?.birthday_message_template) {
            setBirthdayTemplate(settings.birthday_message_template);
          }
          // Show inline banner for 403
          if (error instanceof ApiError && error.status === 403) {
            setAccessDenied(true);
            setAccessDeniedMessage(error.message);
          }
        },
      }
    );
  };

  return (
    <div className="space-y-6">

      {/* ── Access denied banner ── */}
      {accessDenied && (
        <Alert variant="destructive">
          <ShieldX className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>{accessDeniedMessage}</AlertDescription>
        </Alert>
      )}

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
    </div>
  );
}
