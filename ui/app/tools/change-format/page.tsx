import React from "react";
import Navbar from "@/components/navbar";
import ChangeFormatTool from "@/components/tools/ChangeFormatTool";

const ChangeFormatPage = () => {
  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      <ChangeFormatTool />
    </div>
  );
};

export default ChangeFormatPage;
