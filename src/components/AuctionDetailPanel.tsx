import { useEffect, useState } from "react";
import { useStore, type Auction, type Bid } from "../lib/store";

function Countdown({ endTime }: { endTime: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, endTime - now);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (diff <= 0) return <span className="text-red-600 font-semibold">Süre doldu</span>;
  return (
    <span className="font-mono tabular-nums">
      {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}

export function AuctionDetailPanel({
  auction,
  onClose,
  onContact,
}: {
  auction: Auction;
  onClose: () => void;
  onContact?: (userId: string, userName: string) => void;
}) {
  const { currentUser, placeBid, getAuctionBids, bids: allBids, conversations, ensureConversation, sendMessage } = useStore();
  const [bidAmount, setBidAmount] = useState(auction.currentPrice + auction.minIncrement);
  const [showBids, setShowBids] = useState(false);
  const bids = getAuctionBids(auction.id);
  const isExpired = Date.now() > auction.endTime;

  const handleBid = () => {
    if (!currentUser) return;
    placeBid(auction.id, bidAmount);
    setBidAmount((prev) => prev + auction.minIncrement);
  };

  const handleContact = () => {
    if (!auction.winnerId || !onContact) return;
    const convoId = auction.winnerId;
    ensureConversation(convoId, auction.winnerName || "Müşteri");
    sendMessage(convoId, "admin", `${auction.productName} — açık artırma teklifi kabul edildi. İletişime geçmek için yazın.`);
    onContact(auction.winnerId, auction.winnerName || "Müşteri");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-[#f7f1e7] p-5 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <h3 className="font-elegant text-lg font-semibold text-stone-800">
            {auction.productName}
          </h3>
          <button onClick={onClose} className="rounded-full p-1 text-stone-400 hover:bg-stone-200">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {auction.productImage && (
          <img src={auction.productImage} alt="" className="mb-4 h-48 w-full rounded-xl object-cover" />
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl bg-white p-3 text-center">
            <p className="text-xs text-stone-400">Güncel Fiyat</p>
            <p className="text-xl font-bold text-stone-800">₺{auction.currentPrice}</p>
          </div>
          <div className="rounded-xl bg-white p-3 text-center">
            <p className="text-xs text-stone-400">Başlangıç</p>
            <p className="text-xl font-bold text-stone-500">₺{auction.startPrice}</p>
          </div>
          <div className="rounded-xl bg-white p-3 text-center">
            <p className="text-xs text-stone-400">Teklifler</p>
            <p className="text-xl font-bold text-amber-700">{auction.bidCount}</p>
          </div>
          <div className="rounded-xl bg-white p-3 text-center">
            <p className="text-xs text-stone-400">Kalan Süre</p>
            <p className="text-xl font-bold text-stone-800"><Countdown endTime={auction.endTime} /></p>
          </div>
        </div>

        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold mb-4 ${
          auction.status === "active" ? "bg-emerald-100 text-emerald-700" :
          auction.status === "sold" ? "bg-blue-100 text-blue-700" :
          auction.status === "expired" ? "bg-stone-200 text-stone-500" :
          "bg-red-100 text-red-700"
        }`}>
          {auction.status === "active" ? "Aktif" :
           auction.status === "sold" ? `Satıldı — ${auction.winnerName}` :
           auction.status === "expired" ? "Süresi Doldu" :
           "İptal Edildi"}
        </span>

        {auction.status === "sold" && onContact && (
          <button
            onClick={handleContact}
            className="w-full rounded-lg bg-amber-600 py-2.5 text-sm font-medium text-white hover:bg-amber-700 mb-4"
          >
            Kazananla İletişime Geç
          </button>
        )}

        {auction.status === "active" && !isExpired && currentUser && (
          <div className="rounded-xl bg-white p-4 mb-4">
            <p className="text-xs text-stone-400 mb-2">Min. teklif: ₺{auction.currentPrice + auction.minIncrement}</p>
            <div className="flex gap-2">
              <input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(Math.max(auction.currentPrice + auction.minIncrement, Number(e.target.value) || 0))}
                className="inp flex-1"
                min={auction.currentPrice + auction.minIncrement}
              />
              <button
                onClick={handleBid}
                className="rounded-lg bg-stone-800 px-5 py-2 text-sm font-medium text-white hover:bg-stone-700"
              >
                Teklif Ver
              </button>
            </div>
          </div>
        )}

        {auction.status === "active" && !currentUser && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 mb-4 text-center">
            Teklif vermek için giriş yapın
          </div>
        )}

        <button
          onClick={() => setShowBids(!showBids)}
          className="flex items-center justify-between w-full rounded-xl bg-white p-3 text-sm font-medium text-stone-700"
        >
          <span>Tüm Teklifler ({bids.length})</span>
          <span>{showBids ? "▲" : "▼"}</span>
        </button>

        {showBids && (
          <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
            {bids.length === 0 ? (
              <p className="rounded-xl bg-white p-3 text-sm text-stone-400 text-center">Henüz teklif yok</p>
            ) : (
              bids.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-xl bg-white p-3 text-sm">
                  <div>
                    <span className="font-medium text-stone-800">{b.userName}</span>
                    <span className={"ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold " + (
                      b.status === "active" ? "bg-amber-100 text-amber-700" :
                      b.status === "accepted" ? "bg-emerald-100 text-emerald-700" :
                      "bg-red-100 text-red-700"
                    )}>
                      {b.status === "active" ? "Bekliyor" : b.status === "accepted" ? "Kabul" : "Red"}
                    </span>
                  </div>
                  <span className="font-bold text-stone-800">₺{b.amount}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
