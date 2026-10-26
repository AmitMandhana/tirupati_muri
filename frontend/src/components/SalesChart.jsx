import { formatINR } from '../utils/format';

const compactMoney = (value) => {
  const amount = Number(value) || 0;

  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)}Cr`;
  }

  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }

  if (amount >= 1000) {
    return `₹${Math.round(amount / 1000)}k`;
  }

  return `₹${Math.round(amount)}`;
};

const WIDTH = 760;
const HEIGHT = 260;
const MARGIN = { top: 14, right: 12, bottom: 32, left: 58 };
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;

const SalesChart = ({ points = [], bucket = 'day' }) => {
  const hasValues = points.some((point) => Number(point.total) > 0);

  if (!points.length || !hasValues) {
    return (
      <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-cream-300 bg-cream-50/60 text-sm text-ink-400">
        No sales recorded in this period.
      </div>
    );
  }

  const max = Math.max(...points.map((point) => Number(point.total) || 0), 1);
  const step = PLOT_WIDTH / points.length;
  const barWidth = Math.min(step * 0.55, 36);
  const labelEvery = Math.max(1, Math.ceil(points.length / 8));
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div>
      <div className="flex items-center gap-4 text-xs text-ink-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-brand-500" aria-hidden="true" />
          Retail
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" aria-hidden="true" />
          Wholesale
        </span>
        <span className="ml-auto text-ink-400">
          {bucket === 'month' ? 'Monthly buckets' : 'Daily totals'}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-2 h-auto w-full"
        role="img"
        aria-label="Sales chart by retail and wholesale"
      >
        {ticks.map((tick) => {
          const y = MARGIN.top + PLOT_HEIGHT - tick * PLOT_HEIGHT;

          return (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={WIDTH - MARGIN.right}
                y1={y}
                y2={y}
                className="stroke-cream-200"
                strokeWidth="1"
                strokeDasharray={tick === 0 ? undefined : '3 4'}
              />
              <text
                x={MARGIN.left - 8}
                y={y + 3.5}
                textAnchor="end"
                className="fill-ink-400"
                fontSize="10"
              >
                {compactMoney(max * tick)}
              </text>
            </g>
          );
        })}

        {points.map((point, index) => {
          const retail = Number(point.retail) || 0;
          const wholesale = Number(point.wholesale) || 0;
          const retailHeight = (retail / max) * PLOT_HEIGHT;
          const wholesaleHeight = (wholesale / max) * PLOT_HEIGHT;
          const center = MARGIN.left + step * index + step / 2;
          const baseY = MARGIN.top + PLOT_HEIGHT;
          const showLabel = index % labelEvery === 0 || index === points.length - 1;

          return (
            <g key={point.key}>
              <title>
                {`${point.label}: ${formatINR(point.total)} (retail ${formatINR(
                  retail,
                )}, wholesale ${formatINR(wholesale)})`}
              </title>
              <rect
                x={center - barWidth / 2}
                y={baseY - wholesaleHeight}
                width={barWidth}
                height={wholesaleHeight}
                rx="2"
                className="fill-amber-400"
              />
              <rect
                x={center - barWidth / 2}
                y={baseY - wholesaleHeight - retailHeight}
                width={barWidth}
                height={retailHeight}
                rx="2"
                className="fill-brand-500"
              />
              {showLabel ? (
                <text
                  x={center}
                  y={HEIGHT - 12}
                  textAnchor="middle"
                  className="fill-ink-400"
                  fontSize="10"
                >
                  {point.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default SalesChart;
