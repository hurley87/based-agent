"use client";
export default function Mint() {
  const handleMint = async () => {
    const response = await fetch("/api/zora-mint", {
      method: "POST",
      body: JSON.stringify({ }),
    });
    const data = await response.json();
    console.log(data);
  };

  return (
    <div>
      <button onClick={handleMint}>Mint</button>
    </div>
  );
}