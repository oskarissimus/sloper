interface CostEstimateProps {
  label: string;
  amount: number | null;
  detail?: string;
  note?: string;
}

export function CostEstimate({ label, amount, note, detail }: CostEstimateProps) {
  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-gray-500">{label}</span>
        {amount !== null ? (
          <span className="text-xs font-medium text-gray-700">
            ~${amount < 0.01 ? amount.toFixed(4) : amount.toFixed(2)}
          </span>
        ) : (
          <span className="text-xs text-gray-400">varies</span>
        )}
      </div>
      {detail && (
        <p className="text-xs text-gray-400 mt-0.5">{detail}</p>
      )}
      {note && (
        <p className="text-xs text-gray-400 mt-0.5 italic">{note}</p>
      )}
    </div>
  );
}
