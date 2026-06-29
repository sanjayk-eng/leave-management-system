import React, { useState, useRef, useCallback } from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  allOptionLabel?: string;
  showAllOption?: boolean;
  // Server-driven mode
  onSearchChange?: (q: string) => void;  // if provided, search is server-driven
  hasMore?: boolean;                      // whether more pages exist
  onLoadMore?: () => void;               // called when user scrolls to bottom
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onValueChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found.',
  className,
  disabled = false,
  loading = false,
  allOptionLabel = 'All',
  showAllOption = true,
  onSearchChange,
  hasMore = false,
  onLoadMore,
}) => {
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel =
    value === 'all' && showAllOption
      ? allOptionLabel
      : selectedOption?.label || placeholder;

  // Infinite scroll: detect when list is scrolled near bottom
  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el || !hasMore || loading || !onLoadMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      onLoadMore();
    }
  }, [hasMore, loading, onLoadMore]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-[200px] justify-between', className)}
          disabled={disabled || loading}
        >
          <span className="truncate">{displayLabel}</span>
          {loading ? (
            <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command shouldFilter={!onSearchChange}>
          <CommandInput
            placeholder={searchPlaceholder}
            onValueChange={onSearchChange}
          />
          <CommandList>
            {!loading && options.length === 0 && (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            )}
            <CommandGroup>
              <div
                ref={listRef}
                className="max-h-[280px] overflow-y-auto"
                onScroll={handleScroll}
              >
                {showAllOption && (
                  <CommandItem
                    value="__all__"
                    onSelect={() => { onValueChange('all'); setOpen(false); }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', value === 'all' ? 'opacity-100' : 'opacity-0')} />
                    <span className="font-medium">{allOptionLabel}</span>
                  </CommandItem>
                )}

                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    keywords={[option.label]}
                    onSelect={() => {
                      // Always use the original option.value — never the cmdk-normalized string
                      const next = option.value === value
                        ? (showAllOption ? 'all' : '')
                        : option.value;
                      onValueChange(next);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', value === option.value ? 'opacity-100' : 'opacity-0')} />
                    {option.label}
                  </CommandItem>
                ))}

                {loading && (
                  <div className="flex items-center justify-center py-2 text-xs text-muted-foreground gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading...
                  </div>
                )}
                {hasMore && !loading && (
                  <div className="py-1 text-center text-xs text-muted-foreground">
                    Scroll for more
                  </div>
                )}
              </div>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
