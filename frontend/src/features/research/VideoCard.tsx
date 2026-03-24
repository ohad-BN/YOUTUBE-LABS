import { Play } from "lucide-react";

interface VideoCardProps {
  id?: number;
  youtubeVideoId?: string;
  title: string;
  thumbnail?: string;
  channelTitle?: string;
  views?: number;
}

export function VideoCard({ title, thumbnail, channelTitle, views }: VideoCardProps) {
  const viewsText = views ? (
    views >= 1_000_000
      ? `${(views / 1_000_000).toFixed(1)}M views`
      : views >= 1_000
      ? `${Math.round(views / 1_000)}K views`
      : `${views} views`
  ) : null;

  return (
    <div className="flex-shrink-0 w-56 group cursor-pointer">
      <div className="relative overflow-hidden rounded-lg bg-slate-900 aspect-video">
        {thumbnail && (
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        )}
        {!thumbnail && (
          <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
            <Play className="w-12 h-12 text-slate-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
          <Play className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      <div className="mt-2 space-y-1">
        <p className="font-medium text-sm text-white line-clamp-2 group-hover:text-synthwave-cyan transition-colors">
          {title}
        </p>
        {channelTitle && (
          <p className="text-xs text-slate-400 line-clamp-1">{channelTitle}</p>
        )}
        {viewsText && (
          <p className="text-xs text-slate-500">{viewsText}</p>
        )}
      </div>
    </div>
  );
}
