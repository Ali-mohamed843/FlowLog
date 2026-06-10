import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const FILE_COLORS = ['#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#F97316', '#F59E0B', '#10B981'];
const HOUR_COLORS = ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE', '#EFF6FF', '#DBEAFE', '#BFDBFE', '#93C5FD', '#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF', '#1E3A8A', '#1E40AF', '#1D4ED8', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE', '#EFF6FF'];

function CustomTooltip({ active, payload, label, valueUnit }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--card-border)',
      borderRadius: 8,
      padding: '8px 12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      fontSize: 13,
      color: 'var(--text-primary)'
    }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ color: 'var(--text-secondary)' }}>
        {payload[0].value} {valueUnit || ''}
      </div>
    </div>
  );
}

function formatHour(h) {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function shortFileLabel(name) {
  if (!name) return '';
  const parts = name.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || name;
}

function Activity({ dbConnected }) {
  const [fileData, setFileData] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [commitData, setCommitData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (dbConnected) loadData();
  }, [dbConnected]);

  const loadData = async () => {
    setLoading(true);
    const [files, hours, commits] = await Promise.all([
      window.electronAPI.getFileActivity(),
      window.electronAPI.getHourlyActivity(),
      window.electronAPI.getDailyCommits()
    ]);
    setFileData((files || []).map(d => ({ ...d, shortName: shortFileLabel(d.most_active_file) })));
    setHourlyData((hours || []).map(d => ({ ...d, hourLabel: formatHour(d.hour) })));
    setCommitData(commits || []);
    setLoading(false);
  };

  if (!dbConnected) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Connect a database in Settings to view activity.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading activity data...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px 0' }}>Most-edited files</h3>
        {fileData.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No file data yet. Start coding and snapshots will accumulate.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={fileData} margin={{ top: 8, right: 16, bottom: 60, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
              <XAxis
                dataKey="shortName"
                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
                axisLine={{ stroke: 'var(--card-border)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip valueUnit="snapshots" />} cursor={{ fill: 'var(--bg-panel)' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={36}>
                {fileData.map((_, i) => (
                  <Cell key={i} fill={FILE_COLORS[i % FILE_COLORS.length]} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Active hours</h3>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>Snapshot count by hour (local time)</p>
        {hourlyData.every(d => d.count === 0) ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No activity data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={hourlyData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
              <XAxis
                dataKey="hourLabel"
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                interval={1}
                axisLine={{ stroke: 'var(--card-border)' }}
                tickLine={false}
                height={20}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip valueUnit="snapshots" />} cursor={{ fill: 'var(--bg-panel)' }} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={20}>
                {hourlyData.map((d, i) => (
                  <Cell key={i} fill={HOUR_COLORS[i % HOUR_COLORS.length]} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px 0' }}>Git commits (last 14 days)</h3>
        {commitData.length === 0 || commitData.every(d => d.count === 0) ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No git repo detected or no commits in the last 14 days.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={commitData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                interval={0}
                axisLine={{ stroke: 'var(--card-border)' }}
                tickLine={false}
                height={20}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip valueUnit="commits" />} cursor={{ fill: 'var(--bg-panel)' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={28} fill="var(--accent)" fillOpacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default Activity;
