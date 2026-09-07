export function ServiceCardSkeleton() {
  return (
    <div className="card-base flex flex-col gap-3 animate-pulse">
      <div className="skeleton w-12 h-12 rounded-xl" />
      <div className="skeleton h-5 w-2/3 rounded" />
      <div className="skeleton h-3 w-full rounded" />
      <div className="skeleton h-3 w-4/5 rounded" />
      <div className="skeleton h-3 w-3/4 rounded" />
      <div className="skeleton h-4 w-24 rounded mt-2" />
    </div>
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="card-base overflow-hidden animate-pulse">
      <div className="skeleton w-full h-52 rounded-xl mb-4" />
      <div className="skeleton h-5 w-3/4 rounded mb-2" />
      <div className="skeleton h-3 w-full rounded mb-1.5" />
      <div className="skeleton h-3 w-5/6 rounded mb-4" />
      <div className="flex gap-2">
        <div className="skeleton h-6 w-16 rounded-full" />
        <div className="skeleton h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function PackageCardSkeleton() {
  return (
    <div className="card-base animate-pulse">
      <div className="skeleton w-10 h-10 rounded-lg mb-4" />
      <div className="skeleton h-6 w-1/2 rounded mb-2" />
      <div className="skeleton h-8 w-1/3 rounded mb-4" />
      <div className="space-y-2 mb-6">
        {Array(4).fill(0).map((_, i) => <div key={i} className="skeleton h-3 rounded" />)}
      </div>
      <div className="skeleton h-11 rounded-xl" />
    </div>
  );
}

export function TestimonialCardSkeleton() {
  return (
    <div className="card-base animate-pulse">
      <div className="skeleton h-3 w-20 rounded mb-4" />
      <div className="space-y-2 mb-6">
        <div className="skeleton h-3 w-full rounded" />
        <div className="skeleton h-3 w-full rounded" />
        <div className="skeleton h-3 w-3/4 rounded" />
      </div>
      <div className="flex items-center gap-3">
        <div className="skeleton w-10 h-10 rounded-full" />
        <div>
          <div className="skeleton h-4 w-24 rounded mb-1" />
          <div className="skeleton h-3 w-20 rounded" />
        </div>
      </div>
    </div>
  );
}

export function TechBadgeSkeleton() {
  return <div className="skeleton h-10 w-24 rounded-xl" />;
}

export function FeatureCardSkeleton() {
  return (
    <div className="card-base animate-pulse">
      <div className="skeleton w-full h-40 rounded-xl mb-4" />

      <div className="skeleton h-5 w-2/3 rounded mb-3" />

      <div className="skeleton h-3 w-full rounded mb-2" />
      <div className="skeleton h-3 w-5/6 rounded mb-2" />
      <div className="skeleton h-3 w-4/6 rounded mb-4" />

      <div className="skeleton h-8 w-24 rounded-full" />
    </div>
  );
}