export function Stars({
  rating,
  size = 16,
  onChange,
}: {
  rating: number;
  size?: number;
  onChange?: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(i)}
          className={onChange ? "cursor-pointer" : "cursor-default"}
        >
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={i <= rating ? "#d4a437" : "none"}
            stroke={i <= rating ? "#d4a437" : "#c9bfae"}
            strokeWidth="1.5"
          >
            <path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.3 5.8 20.9l1.6-6.8L2.2 8.9l6.9-.6z" />
          </svg>
        </button>
      ))}
    </div>
  );
}
