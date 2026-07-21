import { Badge }   from '@/components/ui/badge';
import { Button }  from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDate } from '@/lib/dateUtils';
import { User, Mail, Briefcase, CalendarDays, Users, Edit, Key } from 'lucide-react';

interface ProfileData {
  full_name:         string;
  email:             string;
  role:              string;
  joining_date?:     string | null;
  ending_date?:      string | null;
  birth_date?:       string | null;
  designation_name?: string | null;
  manager_name?:     string | null;
}

interface DashboardProfileCardProps {
  profileData:      ProfileData;
  onEditProfile:    () => void;
  onChangePassword: () => void;
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

const ROLE_COLOUR: Record<string, string> = {
  SUPERADMIN: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  ADMIN:      'bg-blue-100   text-blue-700   dark:bg-blue-950   dark:text-blue-300',
  HR:         'bg-cyan-100   text-cyan-700   dark:bg-cyan-950   dark:text-cyan-300',
  MANAGER:    'bg-amber-100  text-amber-700  dark:bg-amber-950  dark:text-amber-300',
  EMPLOYEE:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  INTERN:     'bg-slate-100  text-slate-600  dark:bg-slate-800  dark:text-slate-400',
};

interface FieldRowProps {
  icon:   React.ReactNode;
  label:  string;
  value:  React.ReactNode;
}
const FieldRow = ({ icon, label, value }: FieldRowProps) => (
  <div className="flex items-start gap-3 py-2.5">
    <div className="mt-0.5 shrink-0 text-muted-foreground">{icon}</div>
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70 mb-0.5">{label}</p>
      <div className="text-sm font-medium text-foreground leading-tight">{value}</div>
    </div>
  </div>
);

export const DashboardProfileCard = ({
  profileData, onEditProfile, onChangePassword,
}: DashboardProfileCardProps) => {
  const roleClass = ROLE_COLOUR[profileData.role?.toUpperCase()] ?? ROLE_COLOUR.EMPLOYEE;

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b bg-muted/30">
        <div className="flex items-center gap-4 min-w-0">
          <Avatar className="h-11 w-11 ring-2 ring-border shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
              {getInitials(profileData.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-base font-semibold leading-tight truncate">{profileData.full_name}</p>
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium mt-0.5 ${roleClass}`}>
              {profileData.role}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={onChangePassword} variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
            <Key className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Password</span>
          </Button>
          <Button onClick={onEditProfile} variant="outline" size="sm" className="gap-1.5">
            <Edit className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
      </div>

      {/* ── Field grid ─────────────────────────────────────────────────────── */}
      <div className="px-6 py-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-6 divide-y sm:divide-y-0 [&>*]:border-b [&>*]:sm:border-b-0 last:[&>*]:border-0">

          {/* Column 1 */}
          <div className="py-2">
            <FieldRow
              icon={<Mail className="h-3.5 w-3.5" />}
              label="Email"
              value={<span className="truncate block">{profileData.email}</span>}
            />
            <Separator className="my-0.5 opacity-50" />
            <FieldRow
              icon={<Briefcase className="h-3.5 w-3.5" />}
              label="Designation"
              value={profileData.designation_name
                ? profileData.designation_name
                : <span className="italic text-muted-foreground">Not assigned</span>}
            />
          </div>

          {/* Column 2 */}
          <div className="py-2 sm:border-l sm:pl-6">
            <FieldRow
              icon={<CalendarDays className="h-3.5 w-3.5" />}
              label="Joining Date"
              value={formatDate(profileData.joining_date)}
            />
            <Separator className="my-0.5 opacity-50" />
            <FieldRow
              icon={<CalendarDays className="h-3.5 w-3.5" />}
              label="Ending Date"
              value={profileData.ending_date
                ? formatDate(profileData.ending_date)
                : <span className="italic text-muted-foreground">—</span>}
            />
          </div>

          {/* Column 3 */}
          <div className="py-2 xl:border-l xl:pl-6">
            <FieldRow
              icon={<CalendarDays className="h-3.5 w-3.5" />}
              label="Birth Date"
              value={profileData.birth_date
                ? formatDate(profileData.birth_date)
                : <span className="italic text-muted-foreground">Not set</span>}
            />
            {profileData.manager_name && (
              <>
                <Separator className="my-0.5 opacity-50" />
                <FieldRow
                  icon={<Users className="h-3.5 w-3.5" />}
                  label="Reports To"
                  value={profileData.manager_name}
                />
              </>
            )}
          </div>

          {/* Column 4 — role badge */}
          <div className="py-2 xl:border-l xl:pl-6 flex items-center justify-start xl:justify-center">
            <div className="py-1 flex sm:flex-col items-center gap-3 sm:gap-1.5">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">Role</p>
              <Badge variant="outline" className={`text-sm px-3 py-1 font-semibold ${roleClass} border-0`}>
                {profileData.role}
              </Badge>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <p className="text-[11px] text-muted-foreground">Active</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
