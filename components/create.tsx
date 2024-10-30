"use client";
export default function Create() {
  const handleCreate = async () => {
    const response = await fetch("/api/agent", {
      method: "POST",
      body: JSON.stringify({ address: "0xbD78783a26252bAf756e22f0DE764dfDcDa7733c" }),
    });
    const data = await response.json();
    console.log(data);
  };

  return (
    <div>
      <button onClick={handleCreate}>Create</button>
    </div>
  );
}