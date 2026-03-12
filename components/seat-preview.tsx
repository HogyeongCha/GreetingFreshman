import { CSSProperties } from "react";
import { REAL_SEAT_BLOCKS } from "@/lib/seat-layout";

const BLOCK_LAYOUT_CLASSNAME: Record<string, string> = {
  A: "layout-zone-a",
  B: "layout-zone-b",
  C: "layout-zone-c",
  D: "layout-zone-d",
  E: "layout-zone-e",
};

function zoneGridStyle(columns: number): CSSProperties {
  return { ["--zone-columns" as string]: String(columns) } as CSSProperties;
}

function getPreviewSeatLabel(zone: string, index: number) {
  return `${zone}${String(index + 1).padStart(2, "0")}`;
}

export function SeatPreview() {
  return (
    <section className="seat-preview-page">
      <div className="legend-row seat-preview-legend" aria-label="좌석 상태 범례">
        <span className="legend-item">
          <i className="legend-swatch legend-available" />
          선택 가능
        </span>
        <span className="legend-item">
          <i className="legend-swatch legend-hold" />
          홀드 중
        </span>
        <span className="legend-item">
          <i className="legend-swatch legend-confirmed" />
          확정
        </span>
        <span className="legend-item">
          <i className="legend-swatch legend-blocked" />
          차단
        </span>
      </div>
      <div className="venue-layout-scroll">
        <div className="venue-layout venue-layout-map">
          {REAL_SEAT_BLOCKS.map((block) => (
            <section key={block.zone} className={`zone-card stack ${BLOCK_LAYOUT_CLASSNAME[block.zone] ?? ""}`}>
              <div className="zone-heading">
                <strong>{block.zone} 구역</strong>
                <span className="muted">총 {block.rows.flat().length}석</span>
              </div>
              <div className="zone-grid zone-grid-compact" style={zoneGridStyle(block.rows[0].length)}>
                {block.rows.flat().map((seatCode, index) => {
                  const previewLabel = getPreviewSeatLabel(block.zone, index);
                  return (
                    <div key={seatCode} className="seat-cell seat-AVAILABLE seat-preview-cell" aria-label={`${previewLabel} 선택 가능`}>
                      <span>{previewLabel}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
