import { getSessionRole } from "@/lib/auth";
import GalleryClient from "@/components/GalleryClient";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const role = await getSessionRole();
  return <GalleryClient role={role!} />;
}
