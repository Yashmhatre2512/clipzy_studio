import React from "react";

interface FeaturesLayoutProps {
  children: React.ReactNode;
}

const FeaturesLayout: React.FC<FeaturesLayoutProps> = ({ children }) => {
  return <>{children}</>;
};

export default FeaturesLayout;
