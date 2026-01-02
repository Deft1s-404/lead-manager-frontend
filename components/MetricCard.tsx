'use client';

interface MetricCardProps {
  label: string;
  value: string | number;
  helper?: string;
  accent?: 'green' | 'gray';
}

export const MetricCard = ({ label, value, helper, accent = 'green' }: MetricCardProps) => {
  const accentClasses =
    accent === 'green'
      ? 'bg-primary/10 text-primary border-primary/30'
      : 'bg-gray-100 text-gray-700 border-gray-200';

  return (
    <div className={`rounded-2xl border p-6 shadow-sm ${accentClasses}`}>
      <p className="text-sm uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
      {helper && <p className="mt-2 text-xs text-gray-500">{helper}</p>}
    </div>
  );
};
