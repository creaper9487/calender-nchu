"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function NewGroupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const studentId =
      typeof window !== "undefined"
        ? window.localStorage.getItem("studentId") || ""
        : "";

    fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: studentId || undefined }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        router.replace(`/group/${encodeURIComponent(data.code)}`);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        {error ? (
          <div className="text-red-700">建立群組失敗：{error}</div>
        ) : (
          <div className="text-gray-600 animate-pulse">建立群組中...</div>
        )}
      </div>
    </div>
  );
}
