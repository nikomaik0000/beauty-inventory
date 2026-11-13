"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { adjustProductQuantity } from "@/app/actions/products";

export function QuantityStepper({ productId, quantity }: { productId: string; quantity: number }) {
  const router = useRouter();
  const [displayQuantity, setDisplayQuantity] = useState(quantity);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const optimisticRef = useRef(quantity);
  const lastPersistedRef = useRef(quantity);
  const outstandingRef = useRef(0);
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (outstandingRef.current !== 0) return;
    optimisticRef.current = quantity;
    lastPersistedRef.current = quantity;
    setDisplayQuantity(quantity);
  }, [productId, quantity]);

  function enqueue(delta: -1 | 1) {
    const next = optimisticRef.current + delta;
    if (next < 0) return;

    setError(null);
    optimisticRef.current = next;
    setDisplayQuantity(next);
    outstandingRef.current += 1;
    setPendingCount(outstandingRef.current);

    queueRef.current = queueRef.current
      .then(async () => {
        const persisted = await adjustProductQuantity(productId, delta);
        lastPersistedRef.current = persisted;
      })
      .catch((reason) => {
        setError(reason instanceof Error ? reason.message : "庫存更新失敗，請重新整理後再試。");
      })
      .finally(() => {
        outstandingRef.current -= 1;
        setPendingCount(outstandingRef.current);
        if (outstandingRef.current === 0) {
          optimisticRef.current = lastPersistedRef.current;
          setDisplayQuantity(lastPersistedRef.current);
          router.refresh();
        }
      });
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => enqueue(-1)}
          disabled={displayQuantity <= 0}
          aria-label="庫存減一"
          className="flex h-11 w-11 items-center justify-center rounded-button border border-border bg-surface text-textPrimary disabled:opacity-35"
        >
          <Minus size={18} strokeWidth={1.75} />
        </button>
        <span className="min-w-12 text-center text-xl font-semibold tabular-nums text-textHeading" aria-live="polite">
          {displayQuantity}
        </span>
        <button
          type="button"
          onClick={() => enqueue(1)}
          aria-label="庫存加一"
          className="flex h-11 w-11 items-center justify-center rounded-button border border-border bg-surface text-textPrimary"
        >
          <Plus size={18} strokeWidth={1.75} />
        </button>
        {pendingCount > 0 && <span className="text-xs text-textMuted">同步中…</span>}
      </div>
      {error && <p className="mt-2 text-xs text-danger" role="alert">{error}</p>}
    </div>
  );
}
