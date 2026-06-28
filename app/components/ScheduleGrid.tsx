'use client';

import { DAYS_SHORT, PERIODS, type Grid } from '../../lib/schedule';

interface Props {
  /** grid[day][period] === true 表示有空 */
  free: Grid;
  /** self：綠=有空、灰=有課；common：綠=全員都空、白=不行 */
  mode?: 'self' | 'common';
}

export default function ScheduleGrid({ free, mode = 'self' }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-xs select-none">
        <thead>
          <tr>
            <th className="p-1 text-gray-500 font-medium sticky left-0 bg-white">節次</th>
            {DAYS_SHORT.map((d) => (
              <th key={d} className="p-1 w-10 text-gray-700 font-semibold text-center">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERIODS.map((period) => (
            <tr key={period.idx}>
              <td className="p-1 pr-2 text-right text-gray-400 whitespace-nowrap sticky left-0 bg-white">
                <span className="font-mono">{period.start}</span>
              </td>
              {DAYS_SHORT.map((_, d) => {
                const ok = free[d]?.[period.idx];
                const cls =
                  mode === 'common'
                    ? ok
                      ? 'bg-emerald-400'
                      : 'bg-gray-100'
                    : ok
                      ? 'bg-emerald-200'
                      : 'bg-gray-300';
                return (
                  <td key={d} className="p-0.5">
                    <div className={`h-5 w-full rounded-sm ${cls}`} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
