interface LeaveReasonSectionProps {
  reason?: string;
}

export const LeaveReasonSection = ({ reason }: LeaveReasonSectionProps) => {
  if (!reason) return null;

  return (
    <div className="mt-3 pt-3 border-t-2 border-dashed border-muted-foreground/20">
      <div className="p-4 bg-gradient-to-br from-blue-50 via-blue-50 to-indigo-50 dark:from-blue-950/40 dark:via-blue-950/30 dark:to-indigo-950/40 rounded-xl border-2 border-blue-200 dark:border-blue-800 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md flex-shrink-0">
            <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Leave Reason</p>
              <div className="h-px flex-1 bg-gradient-to-r from-blue-200 to-transparent dark:from-blue-800"></div>
            </div>
            <div className="p-3 bg-white/60 dark:bg-black/20 rounded-lg border border-blue-100 dark:border-blue-900/50">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words whitespace-pre-wrap font-medium">
                {reason}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
