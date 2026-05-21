import { Star, StarHalf } from "lucide-react";
import { useState } from "react";

type Props = {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  readonly?: boolean;
};

/**
 * Half-star rating from 0.5 to 5 (no zero allowed).
 * Click left half = .5, right half = full.
 */
export const HalfStarRating = ({ value, onChange, size = 28, readonly = false }: Props) => {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;

  return (
    <div className="flex gap-0.5" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((i) => {
        const full = display >= i;
        const half = !full && display >= i - 0.5;
        return (
          <div key={i} className="relative" style={{ width: size, height: size }}>
            <Star
              className="absolute inset-0 text-muted-foreground/40"
              style={{ width: size, height: size }}
            />
            {full && (
              <Star
                className="absolute inset-0 fill-yellow-400 text-yellow-400"
                style={{ width: size, height: size }}
              />
            )}
            {half && (
              <StarHalf
                className="absolute inset-0 fill-yellow-400 text-yellow-400"
                style={{ width: size, height: size }}
              />
            )}
            {!readonly && onChange && (
              <>
                <button
                  type="button"
                  aria-label={`${i - 0.5} yıldız`}
                  className="absolute left-0 top-0 h-full w-1/2 z-10"
                  onMouseEnter={() => setHover(i - 0.5)}
                  onClick={() => onChange(i - 0.5)}
                />
                <button
                  type="button"
                  aria-label={`${i} yıldız`}
                  className="absolute right-0 top-0 h-full w-1/2 z-10"
                  onMouseEnter={() => setHover(i)}
                  onClick={() => onChange(i)}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const maskLastName = (firstName?: string | null, lastName?: string | null, hide?: boolean) => {
  const f = (firstName || "").trim();
  const l = (lastName || "").trim();
  if (!hide || !l) return `${f} ${l}`.trim() || "Anonim";
  return `${f} ${l[0]}${"*".repeat(Math.max(0, l.length - 1))}`;
};
