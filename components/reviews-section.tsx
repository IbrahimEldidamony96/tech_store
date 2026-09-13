type ReviewsData = {
  items: { id: string; rating: number; comment: string | null; user: { name: string } }[];
  total: number;
  average: number;
  breakdown: Record<number, number>;
};

export function ReviewsSection({ reviews }: { reviews: ReviewsData }) {
  return (
    <section className="mt-16 border-t border-steel/15 pt-10">
      <h2 className="font-display text-lg font-bold text-ink">Reviews</h2>

      {reviews.total === 0 ? (
        <p className="mt-3 text-sm text-steel">No reviews yet.</p>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-6">
            <p className="font-mono text-3xl font-semibold text-ink">{reviews.average.toFixed(1)}</p>
            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = reviews.breakdown[star] ?? 0;
                const pct = reviews.total ? (count / reviews.total) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs text-steel">
                    <span className="w-3 font-mono">{star}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-steel/10">
                      <div className="h-full bg-signal" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-6 font-mono">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <ul className="mt-8 space-y-6">
            {reviews.items.map((review) => (
              <li key={review.id} className="border-b border-steel/10 pb-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-ink">{review.user.name}</p>
                  <p className="font-mono text-xs text-steel">★ {review.rating}</p>
                </div>
                {review.comment && <p className="mt-2 text-sm text-steel">{review.comment}</p>}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
