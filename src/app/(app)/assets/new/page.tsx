import dynamic from "next/dynamic";

const NewAssetPageClient = dynamic(() => import("./page-client"), { ssr: false });

export default function NewAssetPage() {
  return <NewAssetPageClient />;
}
