import { Suspense } from "react";
import { getBookmarkletSource } from "@/lib/bookmarklet";
import StartupClient from "./StartupClient";

export default function StartupPage() {
  const bookmarklet = getBookmarkletSource();
  return (
    <Suspense fallback={null}>
      <StartupClient bookmarklet={bookmarklet} />
    </Suspense>
  );
}
