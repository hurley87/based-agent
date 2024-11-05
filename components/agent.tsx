"use client";
export default function Create() {
  const handleCreate = async () => {
    const response = await fetch("/api/zora-mention", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const data = await response.json();
    console.log(data);
  };

  return (
    <div>
      <button onClick={handleCreate}>Test agent</button>
    </div>
  );
}