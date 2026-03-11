"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Film, Menu, X, Info } from "lucide-react";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <header className="fixed w-full bg-gray-900/70 backdrop-blur-md z-50 border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo Section */}
            <Link href="/" className="flex items-center space-x-3 animate-fadeIn group">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-pink-500/50 transition-all">
                <Film className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-300 to-purple-300">
                Clipzy Studio
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8 z-50">
              <Link href="/about" className="text-gray-300 font-medium hover:text-pink-300 transition-colors flex items-center gap-2 group">
                <Info size={18} className="group-hover:scale-110 transition-transform" />
                About Us
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-gray-300 hover:text-pink-300"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Implementation */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-gray-900/95 backdrop-blur-md pt-20">
          <div className="p-4">
            <nav className="flex flex-col space-y-4">
              <Link
                href="/about"
                className="text-gray-300 font-medium hover:text-pink-300 transition-colors flex items-center gap-2 py-2 px-4 rounded-lg hover:bg-gray-800"
                onClick={() => setIsMenuOpen(false)}
              >
                <Info size={20} />
                About Us
              </Link>
            </nav>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
