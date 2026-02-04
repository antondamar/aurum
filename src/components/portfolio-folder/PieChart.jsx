import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from 'recharts';

export default function PieChartComponent({ 
  data, 
  activeIndex, 
  onPieEnter, 
  onMouseLeave, 
  currency, 
  formatValue 
}) {
  
  // Renders the lines and text outside the pie
  const renderCustomizedLabel = (props) => {
    const { cx, cy, midAngle, outerRadius, fill, name } = props;
    const RADIAN = Math.PI / 180;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + outerRadius * cos;
    const sy = cy + outerRadius * sin;
    const labelRadius = outerRadius + 30;
    const mx = cx + labelRadius * cos;
    const my = cy + labelRadius * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 35;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text 
          x={ex + (cos >= 0 ? 1 : -1) * 12} 
          y={ey} 
          textAnchor={textAnchor} 
          fill="#fff" 
          dominantBaseline="central" 
          style={{ fontSize: '11px' }}
        >
          {name}
        </text>
      </g>
    );
  };

  // The custom tooltip that shows on hover
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const costBasis = data.avgBuy * data.amount;
      const pnl = data.value - costBasis;
      const pnlPercentage = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
      
      return (
        <div className="bg-[#010203] border border-[#D3AC2C] p-4 rounded-xl shadow-2xl min-w-[200px]">
          <p className="text-white text-sm font-bold mb-2">{data.name}</p>
          <div className="space-y-1">
            <p className="text-[#D3AC2C] text-sm tabular-nums">
              <span className="text-zinc-400">Value: </span> {formatValue(data.value, currency)}
            </p>
            <p className="text-[#D3AC2C] text-sm tabular-nums">
              <span className="text-zinc-400">Holdings: </span> 
              {Number(parseFloat(data.amount).toFixed(8))}
            </p>
            <p className={`text-sm tabular-nums font-bold ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              <span className="text-zinc-400">PnL: </span> 
              {formatValue(pnl, currency)} ({pnl >= 0 ? '+' : ''}{pnlPercentage.toFixed(1)}%)
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          activeIndex={activeIndex}
          activeShape={(props) => {
            const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
            return (
              <g>
                <Sector
                  cx={cx}
                  cy={cy}
                  innerRadius={innerRadius}
                  outerRadius={outerRadius + 10} 
                  startAngle={startAngle}
                  endAngle={endAngle}
                  fill={fill}
                />
              </g>
            );
          }}
          onMouseEnter={onPieEnter}
          onMouseLeave={onMouseLeave}
          data={data}
          innerRadius={0} 
          outerRadius={130} 
          dataKey="value"
          label={renderCustomizedLabel}
          labelLine={{ stroke: '#ffffff', strokeWidth: 1 }}
          isAnimationActive={false}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}