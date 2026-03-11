"use client";

import Sidebar from "@/components/side-bar";
import React from "react";
import { usePathname } from "next/navigation";


interface InnerPageLayoutProps {
  children: React.ReactNode;
}

const InnerPageLayout: React.FC<InnerPageLayoutProps> = ({ children }) => {
  const pathname = usePathname();
  
  // Pages without sidebar
  const noSidebarPages = ["/innerpage/remove", "/innerpage/trim", "/innerpage/extract"];
  const shouldHideSidebar = noSidebarPages.includes(pathname);
  
  if (shouldHideSidebar) {
    return <>{children}</>;
  }
  
  return <Sidebar>{children}</Sidebar>;
};

export default InnerPageLayout;
