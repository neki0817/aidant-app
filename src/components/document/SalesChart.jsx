import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

/**
 * 売上・利益推移グラフ
 */
export const SalesChart = ({ salesData }) => {
  const data = {
    labels: salesData.map(d => d.year),
    datasets: [
      {
        label: '売上（万円）',
        data: salesData.map(d => d.sales),
        borderColor: 'rgb(102, 126, 234)',
        backgroundColor: 'rgba(102, 126, 234, 0.5)',
        yAxisID: 'y',
      },
      {
        label: '経常利益（万円）',
        data: salesData.map(d => d.profit),
        borderColor: 'rgb(118, 75, 162)',
        backgroundColor: 'rgba(118, 75, 162, 0.5)',
        yAxisID: 'y',
      }
    ]
  };

  const options = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: '売上・経常利益推移'
      }
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: '金額（万円）'
        }
      }
    }
  };

  return <Line data={data} options={options} />;
};

/**
 * 目標達成度グラフ
 */
export const GoalChart = ({ currentSales, targetSales, currentProfit, targetProfit }) => {
  const data = {
    labels: ['売上', '経常利益'],
    datasets: [
      {
        label: '現状',
        data: [currentSales, currentProfit],
        backgroundColor: 'rgba(102, 126, 234, 0.5)',
      },
      {
        label: '目標',
        data: [targetSales, targetProfit],
        backgroundColor: 'rgba(118, 75, 162, 0.5)',
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: '現状と目標の比較'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: '金額（万円）'
        }
      }
    }
  };

  return <Bar data={data} options={options} />;
};

/**
 * 効果予測グラフ
 */
export const EffectChart = ({ effects }) => {
  const data = {
    labels: effects.map(e => e.category),
    datasets: [
      {
        label: '効果金額（万円/年）',
        data: effects.map(e => e.amount),
        backgroundColor: [
          'rgba(102, 126, 234, 0.5)',
          'rgba(118, 75, 162, 0.5)',
          'rgba(76, 209, 176, 0.5)',
          'rgba(245, 176, 65, 0.5)',
        ],
      }
    ]
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: '補助事業による効果内訳'
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        title: {
          display: true,
          text: '金額（万円/年）'
        }
      }
    }
  };

  return <Bar data={data} options={options} />;
};
