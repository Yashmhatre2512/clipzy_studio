"use client";

import Navbar from "@/components/navbar";
import React from "react";

interface InnerPageLayoutProps {
  children: React.ReactNode;
}

const InnerPageLayout: React.FC<InnerPageLayoutProps> = ({ children }) => {
  return (
    <>
      <Navbar />
      <div className="pt-16">{children}</div>
    </>
  );
};

export default InnerPageLayout;
