import { useStore } from "../lib/store";

export default function ComparePanel({ onClose }: { onClose: () => void }) {
  const { products, compareIds, toggleCompare } = useStore();
  const items = products.filter((p) => compareIds.includes(p.id));

  const allKeys = ["Kategori", "Durum", "Fiyat", "Stok", "İndirim"] as const;
  const getVal = (p: typeof items[number], key: typeof allKeys[number]) => {
    switch (key) {
      case "Kategori": return p.category;
      case "Durum": return p.condition === "new" ? "Sıfır" : "İkinci El";
      case "Fiyat": return `${p.priceNum.toLocaleString("tr-TR")} ₺`;
      case "Stok": return String(p.stock);
      case "İndirim": return p.hasDiscount ? `%${p.discount ?? 0}` : "-";
    }
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
      <div className="fixed inset-x-4 top-1/2 z-[60] mx-auto max-w-3xl -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-800">Karşılaştır ({items.length}/4)</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100">✕</button>
        </div>
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-stone-400">Karşılaştırmak için ürün ekleyin.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="w-24 p-2 text-xs font-semibold text-stone-500" />
                  {items.map((p) => (
                    <th key={p.id} className="min-w-32 p-2">
                      <div className="text-center">
                        <div className="mx-auto mb-2 h-32 w-24 overflow-hidden rounded-lg bg-stone-100">
                          <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                        </div>
                        <p className="truncate text-xs font-medium text-stone-700">{p.name}</p>
                        <button
                          onClick={() => toggleCompare(p.id)}
                          className="mt-1 rounded-md border border-red-200 px-2 py-0.5 text-[10px] text-red-600 hover:bg-red-50"
                        >
                          Kaldır
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allKeys.map((key) => (
                  <tr key={key} className="border-t border-stone-100">
                    <td className="p-2 text-xs font-semibold text-stone-500">{key}</td>
                    {items.map((p) => (
                      <td key={p.id} className="p-2 text-center text-xs text-stone-700">{getVal(p, key)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
