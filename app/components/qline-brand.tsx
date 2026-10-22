"use client";
import { useState } from "react";
import { brand } from "../../lib/brand";
export function QLineBrand({ compact = false }: { compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={"qline-brand " + (compact ? "qline-brand-compact" : "")}>
      {brand.logoPath && !failed ? (
        <div className="qline-artwork">
          <img
            src={brand.logoPath}
            alt="Q-Line Trucking"
            width={1500}
            height={401}
            onError={() => setFailed(true)}
          />
        </div>
      ) : (
        <div className="qline-text-brand" aria-label="Q-Line Trucking">
          <strong>
            Q<span>-LINE</span>
          </strong>
          <small>TRUCKING</small>
        </div>
      )}
      <span className="qline-product">{brand.product}</span>
    </div>
  );
}
