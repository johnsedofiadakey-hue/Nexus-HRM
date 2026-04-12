import React from 'react';
import {
  Radar, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  Legend
} from 'recharts';

interface CompetencyRadarProps {
  selfScores: Record<string, number>;
  managerScores: Record<string, number>;
  categories: { id: string; name: string }[];
}

const CompetencyRadar: React.FC<CompetencyRadarProps> = ({ selfScores, managerScores, categories }) => {
  const data = categories.map(cat => ({
    subject: cat.name,
    self: (selfScores[cat.id] || 0) * 20, // Convert 1-5 to 0-100
    manager: (managerScores[cat.id] || 0) * 20,
    fullMark: 100,
  }));

  return (
    <div className="w-full h-[300px] flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="var(--border-subtle)" strokeOpacity={0.1} />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 'bold' }} 
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 100]} 
            tick={{ fill: 'var(--text-muted)', fontSize: 8 }}
          />
          <Radar
            name="Self-Assessment"
            dataKey="self"
            stroke="var(--primary)"
            fill="var(--primary)"
            fillOpacity={0.4}
          />
          <Radar
            name="Manager Assessment"
            dataKey="manager"
            stroke="#f59e0b"
            fill="#f59e0b"
            fillOpacity={0.4}
          />
          <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', paddingLeft: '20px' }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CompetencyRadar;
