import type { Metadata } from "next";
import { DevVisualLab } from "@/components/DevVisualLab";
import Layout from "@/components/Layout";

export const metadata: Metadata = {
  title: "Visual Lab · Dev Mode",
  robots: { index: false, follow: false },
};

export default function DevVisualLabPage() {
  return (
    <Layout>
      <DevVisualLab />
    </Layout>
  );
}
