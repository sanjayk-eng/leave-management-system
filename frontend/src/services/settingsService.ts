import { api } from '@/lib/api';

export interface BirthdayEmployee {
  id: string;
  name: string;
  email: string;
  message: string;
}

export interface TodayBirthdaysResponse {
  message: string;
  date: string;
  total: number;
  data: BirthdayEmployee[];
}

// Upcoming birthdays — matches backend BirthdayEmployee struct
export interface UpcomingBirthdayEmployee {
  id: string;
  name: string;
  email: string;
  birth_date?: string;
  status: 'today' | 'upcoming' | 'past';
  remaining_days: number;
  remaining_hours?: number;
  remaining_minutes?: number;
}

export interface UpcomingBirthdaysResponse {
  success: boolean;
  data: UpcomingBirthdayEmployee[];
}

export interface BirthdayPreviewResponse {
  template: string;
  rendered: string;
  placeholders: string[];
}

  export interface CompanySettings {
    id: string;
    working_days_per_month: number;
    allow_manager_add_leave: boolean;
    primary_color: string;
    secondary_color: string;
    company_name: string;
    logo_path?: string;
    birthday_message_template?: string;
    created_at: string;
    updated_at: string;
  }

  export interface UpdateSettingsRequest {
    working_days_per_month: number;
    allow_manager_add_leave: boolean;
    
    primary_color: string; // New
    secondary_color?: string; // New
    company_name?: string; // New
    logo?: File | null;
    birthday_message_template?: string;
  }

export interface Holiday {
  id: string;
  name: string;
  date: string;
  day: string;
  type: string;
  created_at: string;
  updated_at: string;
}

export interface AddHolidayRequest {
  name: string;
  date: string;
  type: string;
}

export const settingsService = {
  get: async () => {
    return api.get<{ settings: CompanySettings }>('/settings');
  },

  update: async (data: UpdateSettingsRequest) => {

    const formData = new FormData();
  formData.append('WorkingDaysPerMonth', String(data.working_days_per_month || 22));
  formData.append('AllowManagerAddLeave', String(data.allow_manager_add_leave ?? true));
  formData.append('PrimaryColor', data.primary_color);

  formData.append('SecondaryColor', data.secondary_color || "#ffffff"); 
  formData.append('CompanyName', data.company_name || "DemoCompany");
  
  if (data.logo) {
    formData.append('Logo', data.logo);
  }
  if (data.birthday_message_template !== undefined) {
    formData.append('BirthdayMessageTemplate', data.birthday_message_template);
  }
    return api.put<{ message: string }>('/settings', formData);
  },

  // Birthday
  getTodayBirthdays: async () => {
    return api.get<TodayBirthdaysResponse>('/employee/birthdays/today');
  },

  getUpcomingBirthdays: async (filterType?: string) => {
    const query = filterType ? `?filter_type=${filterType}` : '';
    return api.get<UpcomingBirthdaysResponse>(`/employee/birthdays/upcomming${query}`);
  },

  getCalendarBirthdays: async (month: number, year: number) => {
    return api.get<UpcomingBirthdaysResponse>(`/employee/birthdays/upcomming?month=${month}&year=${year}`);
  },

  getBirthdayPreview: async (name?: string, birth_date?: string) => {
    const params = new URLSearchParams();
    if (name) params.append('name', name);
    if (birth_date) params.append('birth_date', birth_date);
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<BirthdayPreviewResponse>(`/settings/birthday-preview${query}`);
  },

  // Holidays
  getHolidays: async () => {
    const response = await api.get<Holiday[]>('/settings/holidays');
    return response || [];
  },

  addHoliday: async (data: AddHolidayRequest) => {
    return api.post<{ message: string; id: string }>('/settings/holidays', data);
  },

  deleteHoliday: async (id: string) => {
    return api.delete<{ message: string }>(`/settings/holidays/${id}`);
  },
};
