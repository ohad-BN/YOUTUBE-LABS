import { useState } from "react";
import { Play, Plus, Info } from "lucide-react";

interface VideoCardWithActionsProps {
  id?: number;
  title: string;
  thumbnail?: string;
  channelTitle?: string;
  views?: number;
  onAddClick?: () => void;
  onDetailsClick?: () => void;
}

export function VideoCardWithActions({
  title,
  thumbnail,
  channelTitle,
  views,
  onAddClick,
  onDetailsClick,
}: VideoCardWithActionsProps) {
  const [showActions, setShowActions] = useState(false);

  const viewsText = views
    ? views >= 1_000_000
      ? `${(views / 1_000_000).toFixed(1)}M`
      : views >= 1_000
      ? `${Math.round(views / 1_000)}K`
      : `${views}`
    : null;

  return (
    <div
      className="flex-shrink-0 w-56 group cursor-pointer"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="relative overflow-hidden rounded-lg bg-slate-900 aspect-video">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
            <Play className="w-12 h-12 text-slate-600" />
          </div>
        )}

        {/* Overlay with action buttons */}
        <div
          className={`absolute inset-0 bg-black/60 transition-opacity duration-200 flex items-center justify-center gap-3 ${
            showActions ? "opacity-100" : "opacity-0"
          }`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddClick?.();
            }}
            className="p-2 bg-synthwave-magenta/90 hover:bg-synthwave-magenta rounded-full text-white transition-colors"
            title="Add to folder"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDetailsClick?.();
            }}
            className="p-2 bg-synthwave-cyan/90 hover:bg-synthwave-cyan rounded-full text-white transition-colors"
            title="View details"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Info section */}
      <div className="mt-2 space-y-1">
        <p className="font-medium text-sm text-white line-clamp-2 group-hover:text-synthwave-cyan transition-colors">
          {title}
        </p>
        {channelTitle && (
          <p className="text-xs text-slate-400 line-clamp-1">{channelTitle}</p>
        )}
        {viewsText && <p className="text-xs text-slate-500">{viewsText} views</p>}
      </div>
    </div>
  );
}
