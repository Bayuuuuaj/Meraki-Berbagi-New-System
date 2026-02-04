import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-200", className)}
      {...props}
    />
  )
}

export const VolunteerSkeleton = () => (
  <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden h-full flex flex-col animate-pulse">
    {/* Image Skeleton */}
    <div className="aspect-video bg-slate-200" />
    {/* Content Skeleton */}
    <div className="p-8 flex-1 space-y-4">
      <div className="h-6 bg-slate-200 rounded-full w-3/4" />
      <div className="space-y-2">
        <div className="h-3 bg-slate-200 rounded-full w-full" />
        <div className="h-3 bg-slate-200 rounded-full w-5/6" />
      </div>
      <div className="pt-6 border-t border-slate-50 flex justify-between items-center">
        <div className="h-3 bg-slate-200 rounded-full w-24" />
        <div className="h-4 bg-slate-200 rounded-full w-20" />
      </div>
    </div>
  </div>
);

export const NewsSkeleton = () => (
  <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden h-full flex flex-col animate-pulse">
    {/* Image Skeleton */}
    <div className="aspect-[4/5] bg-slate-200" />
    {/* Content Skeleton */}
    <div className="p-6 flex-1 space-y-4">
      <div className="flex gap-2">
        <div className="h-4 bg-slate-200 rounded-lg w-12" />
        <div className="h-4 bg-slate-200 rounded-lg w-12" />
      </div>
      <div className="h-6 bg-slate-200 rounded-full w-full" />
      <div className="space-y-2">
        <div className="h-3 bg-slate-200 rounded-full w-full" />
        <div className="h-3 bg-slate-200 rounded-full w-full" />
        <div className="h-3 bg-slate-200 rounded-full w-2/3" />
      </div>
      <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
        <div className="h-3 bg-slate-200 rounded-full w-20" />
        <div className="h-4 bg-slate-200 rounded-full w-24" />
      </div>
    </div>
  </div>
);

export { Skeleton }
