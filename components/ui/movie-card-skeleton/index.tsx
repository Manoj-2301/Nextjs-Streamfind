export default function MovieCardSkeleton() {
  return (
    <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden bg-[#111] border border-[#1a1a1a] flex-shrink-0 animate-pulse">
      {/* Full Area Pulse */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#1a1a1a] to-[#222]" />
      
      {/* Dark Gradient bottom 60% */}
      <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/80 to-transparent pointer-events-none" />

      {/* Content Blocks */}
      <div className="absolute bottom-0 inset-x-0 p-3 z-10 flex flex-col justify-end">
        {/* Title bar (70% width) */}
        <div className="h-4 bg-[#222] rounded w-[70%] mb-2" />
        
        {/* Meta bar (40% width) */}
        <div className="h-3 bg-[#222] rounded w-[40%]" />
      </div>
    </div>
  );
}
