"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Zap, Sparkles, Film, Wrench, ArrowRight } from "lucide-react";
import Link from "next/link";

const FeaturesPage = () => {
  const router = useRouter();

  const features = [
    {
      id: "highlight",
      title: "Highlight",
      subtitle: "Smart Extraction",
      description: "Extract the most impactful moments from your videos automatically",
      icon: Zap,
      href: "/innerpage/aigen",
      color: "from-pink-500 to-red-500",
      accentColor: "pink",
      stats: "Fastest"
    },
    {
      id: "zoom",
      title: "Zoom",
      subtitle: "Focus Effect",
      description: "Apply cinematic zoom effects to make your videos pop",
      icon: Film,
      href: "/innerpage/zoom",
      color: "from-blue-500 to-cyan-500",
      accentColor: "blue",
      stats: "Professional"
    },
    {
      id: "videogen",
      title: "AI Video Gen",
      subtitle: "Creation",
      description: "Generate unique videos from text prompts using AI",
      icon: Sparkles,
      href: "/innerpage/aigen",
      color: "from-purple-500 to-pink-500",
      accentColor: "purple",
      stats: "Instant"
    },
    {
      id: "tools",
      title: "Tools",
      subtitle: "Utilities",
      description: "Advanced editing tools for fine-grained control",
      icon: Wrench,
      href: "#",
      color: "from-orange-500 to-yellow-500",
      accentColor: "orange",
      stats: "Coming soon",
      disabled: true,
    },
  ];

  return (
    <div className="font-inter bg-gray-950 min-h-screen overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950" />
        <div className="absolute top-0 -right-40 w-80 h-80 bg-pink-600/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-600/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
        <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-purple-600/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-gray-950/70 border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-300 font-medium group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            Back
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-purple-400">
              Choose Your Tool
            </h1>
          </div>
          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        {/* Hero Section */}
        <div className="text-center mb-16 space-y-6 animate-fadeIn">
          <div className="space-y-3">
            <h2 className="text-5xl md:text-6xl font-bold text-white">
              Create Professional
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400">
                Videos in Minutes
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Choose your AI-powered tool and start transforming your content
            </p>
          </div>
        </div>

        {/* Features Grid - 4 Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature) => {
            const Icon = feature.icon;
            const isDisabled = feature.disabled;

            return (
              <Link
                key={feature.id}
                href={feature.href}
                onClick={(e) => {
                  if (isDisabled) {
                    e.preventDefault();
                  }
                }}
                className={isDisabled ? "pointer-events-none" : ""}
              >
                <div
                  className={`group relative h-full rounded-2xl overflow-hidden transition-all duration-500 ${
                    isDisabled ? "opacity-50" : "hover:shadow-2xl hover:-translate-y-2 cursor-pointer"
                  }`}
                >
                  {/* Gradient Border */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-30 transition-opacity duration-500 rounded-2xl`}
                  />

                  {/* Glass Effect Background */}
                  <div className="absolute inset-0 bg-gray-800/40 backdrop-blur-xl rounded-2xl border border-gray-700/50" />

                  {/* Border Glow */}
                  <div
                    className={`absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-br ${feature.color} bg-clip-border opacity-0 group-hover:opacity-40 transition-opacity duration-500`}
                  />

                  {/* Content */}
                  <div className="relative p-6 flex flex-col h-full">
                    {/* Icon Circle */}
                    <div
                      className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 bg-gradient-to-br ${feature.color} shadow-lg mb-4`}
                    >
                      <Icon size={28} className="text-white" />
                    </div>

                    {/* Title & Subtitle */}
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                        {feature.subtitle}
                      </p>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>

                    {/* Bottom Section */}
                    <div className="flex items-end justify-between mt-4 pt-4 border-t border-gray-700/30">
                      <span
                        className={`text-xs font-bold ${
                          isDisabled
                            ? "text-gray-500"
                            : `bg-clip-text text-transparent bg-gradient-to-r ${feature.color}`
                        }`}
                      >
                        {feature.stats}
                      </span>

                      {!isDisabled && (
                        <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-700/40 backdrop-blur-sm border border-gray-600/50 group-hover:bg-gray-700/60 transition-all duration-300 font-medium text-xs text-gray-200">
                          Start
                          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      )}

                      {isDisabled && (
                        <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-700/20 backdrop-blur-sm border border-gray-600/30 font-medium text-xs text-gray-500">
                          Soon
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hover Glow */}
                  {!isDisabled && (
                    <div
                      className={`absolute -inset-0.5 bg-gradient-to-br ${feature.color} rounded-2xl opacity-0 group-hover:opacity-20 blur-2xl transition-opacity duration-500 -z-10`}
                    />
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Features Overview */}
        <div className="grid md:grid-cols-3 gap-4 mb-16">
          {[
            { icon: "🚀", label: "Lightning Fast", text: "Minutes, not hours" },
            { icon: "🎯", label: "AI Powered", text: "Intelligent detection" },
            { icon: "✨", label: "Studio Quality", text: "Professional results" },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-xl bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 hover:bg-gray-800/60 transition-all duration-300 text-center group cursor-pointer"
            >
              <div className="text-3xl mb-2 group-hover:scale-125 transition-transform duration-300">
                {item.icon}
              </div>
              <h4 className="font-bold text-gray-100 mb-1 text-sm">{item.label}</h4>
              <p className="text-xs text-gray-400">{item.text}</p>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-pink-600/20 via-purple-600/20 to-blue-600/20 backdrop-blur-sm rounded-3xl border border-gray-700/50 p-8 md:p-10 text-center">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Ready to Transform Your Videos?
          </h3>
          <p className="text-gray-300 text-base">
            Select any tool above and start creating amazing content right now.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 bg-gray-900/50 backdrop-blur-sm mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <p className="text-gray-400 text-sm">
            Need help?{" "}
            <a href="#" className="font-semibold text-pink-400 hover:text-pink-300 transition-colors">
              Docs
            </a>
            {" • "}
            <a href="#" className="font-semibold text-pink-400 hover:text-pink-300 transition-colors">
              Support
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default FeaturesPage;
