import type { Metadata } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { FolioProvider } from "@/gl/react";
import { App } from "@/components/App";

export const metadata: Metadata = {
  title: "Website Templates | Paper Stish",
  description: "Choose a website template, customize it, and publish a shareable website with Paper Stish.",
  robots: { index: false, follow: false },
};

export default function WebsiteTemplatesPage() {
  return (
    <AuthProvider>
      <FolioProvider>
        <App initialView="website-templates" />
      </FolioProvider>
    </AuthProvider>
  );
}
