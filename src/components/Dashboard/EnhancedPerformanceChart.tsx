import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Area,
  AreaChart,
  ComposedChart,
} from 'recharts';
import { Trade } from '../../types';
import { formatCurrency } from '../../utils/calculations';
import { TrendingUp, BarChart3, PieChart as PieChartIcon, Activity } from 'lucide-react';

interface EnhancedPerformanceChartProps {
  trades: Trade[];
  initialCapital: number;
}

const EnhancedPerformanceChart: React.FC<EnhancedPerformanceChartProps> = ({ 
  trades, 
  initialCapital 
}) => {
  const [activeChart, setActiveChart] = useState<'capital' | 'distribution' | 'performance' | 'timeline'>('capital');

  // Prepare capital growth data
  const capitalData = trades.reduce((acc, trade, index) => {
    const runningCapital = acc.length > 0 
      ? acc[acc.length - 1].capital + trade.profit_loss
      : initialCapital + trade.profit_loss;
    
    acc.push({
      trade: index + 1,
      capital: runningCapital,
      profit_loss: trade.profit_loss,
      date: new Date(trade.created_at).toLocaleDateString(),
      roi: trade.roi,
      margin: trade.margin,
      side: trade.entry_side,
    });
    
    return acc;
  }, [] as any[]);

  // Prepare P/L distribution data
  const profitTrades = trades.filter(trade => trade.profit_loss > 0);
  const lossTrades = trades.filter(trade => trade.profit_loss < 0);
  
  const totalProfit = profitTrades.reduce((sum, trade) => sum + trade.profit_loss, 0);
  const totalLoss = Math.abs(lossTrades.reduce((sum, trade) => sum + trade.profit_loss, 0));
  
  const pieData = [
    { name: 'Profits', value: totalProfit, count: profitTrades.length, color: '#10B981' },
    { name: 'Losses', value: totalLoss, count: lossTrades.length, color: '#EF4444' },
  ].filter(item => item.value > 0);

  // Prepare performance by day data
  const performanceByDay = trades.reduce((acc, trade) => {
    const date = new Date(trade.created_at).toLocaleDateString();
    const existing = acc.find(item => item.date === date);
    
    if (existing) {
      existing.profit_loss += trade.profit_loss;
      existing.trades += 1;
      existing.volume += trade.margin;
    } else {
      acc.push({
        date,
        profit_loss: trade.profit_loss,
        trades: 1,
        volume: trade.margin,
      });
    }
    
    return acc;
  }, [] as any[]);

  // Prepare timeline data with cumulative metrics
  const timelineData = trades.map((trade, index) => {
    const cumulativeProfit = trades.slice(0, index + 1).reduce((sum, t) => sum + t.profit_loss, 0);
    const winRate = trades.slice(0, index + 1).filter(t => t.profit_loss > 0).length / (index + 1) * 100;
    
    return {
      trade: index + 1,
      profit_loss: trade.profit_loss,
      cumulative_profit: cumulativeProfit,
      win_rate: winRate,
      date: new Date(trade.created_at).toLocaleDateString(),
      roi: trade.roi,
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-800 border border-slate-600 rounded-lg p-4 shadow-xl"
        >
          <p className="text-slate-300 text-sm font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between space-x-4">
              <div className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-slate-400 text-sm">{entry.name}:</span>
              </div>
              <span className="text-white font-semibold">
                {entry.name.includes('Rate') || entry.name.includes('ROI') 
                  ? `${entry.value.toFixed(1)}%`
                  : formatCurrency(entry.value)
                }
              </span>
            </div>
          ))}
        </motion.div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl"
        >
          <p className="text-slate-300 text-sm font-medium">{data.name}</p>
          <p className="text-white font-semibold">{formatCurrency(data.value)}</p>
          <p className="text-slate-400 text-xs">{data.count} trades</p>
        </motion.div>
      );
    }
    return null;
  };

  if (trades.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 text-center">
        <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">No trades data to display charts</p>
      </div>
    );
  }

  const chartTabs = [
    { id: 'capital', label: 'Capital Growth', icon: TrendingUp },
    { id: 'distribution', label: 'P/L Distribution', icon: PieChartIcon },
    { id: 'performance', label: 'Daily Performance', icon: BarChart3 },
    { id: 'timeline', label: 'Trading Timeline', icon: Activity },
  ];

  return (
    <div className="space-y-6">
      {/* Chart Navigation */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex flex-wrap gap-2 mb-6">
          {chartTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveChart(tab.id as any)}
                className={`flex items-center px-4 py-2 rounded-lg transition-all ${
                  activeChart === tab.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </motion.button>
            );
          })}
        </div>

        <motion.div
          key={activeChart}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="h-80"
        >
          <ResponsiveContainer width="100%" height="100%">
            {activeChart === 'capital' && (
              <AreaChart data={capitalData}>
                <defs>
                  <linearGradient id="capitalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="trade" 
                  stroke="#9CA3AF"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="capital"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  fill="url(#capitalGradient)"
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#3B82F6', stroke: '#1E40AF', strokeWidth: 2 }}
                />
              </AreaChart>
            )}

            {activeChart === 'distribution' && (
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={800}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            )}

            {activeChart === 'performance' && (
              <BarChart data={performanceByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9CA3AF"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="profit_loss" 
                  fill="#3B82F6"
                  radius={[4, 4, 0, 0]}
                  animationDuration={800}
                />
              </BarChart>
            )}

            {activeChart === 'timeline' && (
              <ComposedChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="trade" 
                  stroke="#9CA3AF"
                  fontSize={12}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickFormatter={(value) => `${value.toFixed(0)}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  yAxisId="left"
                  dataKey="profit_loss" 
                  fill="#3B82F6"
                  radius={[2, 2, 0, 0]}
                  opacity={0.7}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="win_rate"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </motion.div>

        {/* Chart Legend */}
        <div className="mt-4 flex flex-wrap justify-center gap-6 text-sm">
          {activeChart === 'capital' && (
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2" />
              <span className="text-slate-300">Capital Growth</span>
            </div>
          )}
          
          {activeChart === 'distribution' && pieData.map((entry) => (
            <div key={entry.name} className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-300">
                {entry.name}: {formatCurrency(entry.value)} ({entry.count} trades)
              </span>
            </div>
          ))}
          
          {activeChart === 'performance' && (
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2" />
              <span className="text-slate-300">Daily P/L</span>
            </div>
          )}
          
          {activeChart === 'timeline' && (
            <>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2" />
                <span className="text-slate-300">Trade P/L</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
                <span className="text-slate-300">Win Rate</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedPerformanceChart;