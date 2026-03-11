import React from "react";
import Navbar from "@/components/navbar";
import ChangeResolutionTool from "@/components/tools/ChangeResolutionTool";

const ChangeResolutionPage = () => {
  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      <ChangeResolutionTool />
    </div>
  );
};

export default ChangeResolutionPage;
