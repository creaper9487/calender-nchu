import { Suspense } from "react";
import GroupClient from "./GroupClient";

interface Props {
  params: Promise<{ code: string }>;
}

export default async function GroupPage({ params }: Props) {
  const { code } = await params;
  return (
    <Suspense fallback={null}>
      <GroupClient code={code} />
    </Suspense>
  );
}
