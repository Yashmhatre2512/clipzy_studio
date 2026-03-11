"use client"

import { useState } from "react"
import { Divider } from "@nextui-org/divider"
import { Progress } from "@nextui-org/progress"
import { Chip } from "@nextui-org/chip"
import { Card, CardHeader, CardBody, CardFooter } from "@nextui-org/card"
import { Button } from "@nextui-org/button"
import { Input } from "@nextui-org/input"
import { Slider } from "@nextui-org/slider"
import { Play, Sparkles, Clock, RefreshCw, AlertCircle, CheckCircle2, Wand2, Download, Share2 } from "lucide-react"

export default function AIGen() {
  const [topic, setTopic] = useState("")
  const [duration, setDuration] = useState(60)
  const [loading, setLoading] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const suggestions = [
    "news topic about the world",
    "quiz about country capitals",
    "text message between two friends",
    "rank fast food",
    "would you rather about food",
  ]

  async function generateVideo() {
    setError(null)
    setVideoUrl(null)

    if (!topic.trim()) {
      setError("Please enter a topic.")
      return
    }

    if (duration <= 0) {
      setError("Duration must be > 0.")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("http://localhost:8000/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, duration }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Server error")
      }

      if (!data.video_url) {
        throw new Error("No video URL returned")
      }

      setVideoUrl(`http://localhost:8000/${data.video_url}`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 px-4">
        <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm shadow-2xl border border-pink-100">
          <CardBody className="py-12 px-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                <Wand2 className="w-16 h-16 text-pink-500 animate-pulse" />
                <Sparkles className="w-6 h-6 text-purple-400 absolute -top-1 -right-1 animate-bounce" />
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-pink-600">Creating Magic</h2>
              <p className="text-gray-600">AI is crafting your video...</p>
              <Progress
                isIndeterminate
                size="md"
                color="secondary"
                className="max-w-xs mx-auto"
                classNames={{
                  indicator: "bg-gradient-to-r from-pink-500 to-purple-500",
                }}
              />
            </div>
          </CardBody>
        </Card>
      </div>
    )
  }

  // Success state
  if (videoUrl) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 px-4">
        <Card className="w-full max-w-4xl bg-white/90 backdrop-blur-sm shadow-2xl border border-pink-100">
          <CardHeader className="text-center py-8">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              Your Video Is Ready!
            </h2>
            <p className="text-gray-600 mt-2">Your AI-generated video is ready to watch</p>
          </CardHeader>
          <CardBody className="px-8">
            <video controls className="w-full rounded-xl shadow-lg border border-pink-100" src={videoUrl} />
          </CardBody>
          <CardFooter className="flex justify-center gap-4 py-8">
            <Button
              color="secondary"
              variant="flat"
              startContent={<Download className="w-4 h-4" />}
              onClick={() => {
                const a = document.createElement("a")
                a.href = videoUrl
                a.download = "ai-video.mp4"
                a.click()
              }}
            >
              Download
            </Button>
            <Button color="secondary" variant="flat" startContent={<Share2 className="w-4 h-4" />}>
              Share
            </Button>
            <Button
              color="secondary"
              startContent={<RefreshCw className="w-4 h-4" />}
              onClick={() => window.location.reload()}
            >
              Generate Another
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 px-4">
        <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm shadow-2xl border border-red-100">
          <CardBody className="py-12 px-8 text-center space-y-6">
            <div className="flex justify-center">
              <AlertCircle className="w-16 h-16 text-red-500" />
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-red-600">Oops! Something went wrong</h2>
              <p className="text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">{error}</p>
              <Button
                color="danger"
                variant="flat"
                startContent={<RefreshCw className="w-4 h-4" />}
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    )
  }

  // Default form
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 py-8 px-4">
      <div className="flex flex-col items-center max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Play className="w-20 h-20 text-pink-500" />
              <Sparkles className="w-8 h-8 text-purple-400 absolute -top-2 -right-2 animate-pulse" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
            AI Video Generator
          </h1>
          <p className="text-gray-600 text-lg">Transform your ideas into engaging videos with AI magic</p>
        </div>

        {/* Main Card */}
        <Card className="w-full bg-white/90 backdrop-blur-sm shadow-2xl border border-pink-100">
          <CardHeader className="text-center py-6">
            <Divider className="bg-gradient-to-r from-pink-300 to-purple-300 h-0.5" />
          </CardHeader>

          <CardBody className="space-y-8 px-8 py-6">
            {/* Topic Input */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 font-semibold text-gray-700">
                <Wand2 className="w-5 h-5 text-pink-500" />
                What's your video about?
              </label>
              <Input
                placeholder="Enter your creative topic..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                variant="bordered"
                size="lg"
                classNames={{
                  input: "text-gray-700",
                  inputWrapper: "border-pink-200 hover:border-pink-400 focus-within:border-pink-500",
                }}
              />
            </div>

            {/* Duration Slider */}
            <div className="space-y-4">
              <label className="flex items-center gap-2 font-semibold text-gray-700">
                <Clock className="w-5 h-5 text-pink-500" />
                Duration: {duration} seconds
              </label>
              <Slider
                size="lg"
                step={10}
                minValue={10}
                maxValue={300}
                value={duration}
                onChange={(value) => setDuration(Array.isArray(value) ? value[0] : value)}
                className="max-w-full"
                classNames={{
                  track: "bg-pink-100",
                  filler: "bg-gradient-to-r from-pink-500 to-purple-500",
                  thumb: "bg-white border-2 border-pink-500 shadow-lg",
                }}
              />
              <div className="flex justify-between text-sm text-gray-500">
                <span>10s</span>
                <span>5 min</span>
              </div>
            </div>

            {/* Suggestions */}
            <div className="space-y-4">
              <label className="flex items-center gap-2 font-semibold text-gray-700">
                <Sparkles className="w-5 h-5 text-pink-500" />
                Quick Ideas
              </label>
              <div className="flex flex-wrap gap-3">
                {suggestions.map((suggestion) => (
                  <Chip
                    key={suggestion}
                    variant="bordered"
                    className="cursor-pointer text-pink-600 border-pink-300 hover:bg-pink-100 hover:border-pink-400 transition-all duration-200 hover:scale-105"
                    onClick={() => setTopic(suggestion)}
                  >
                    {suggestion}
                  </Chip>
                ))}
              </div>
            </div>
          </CardBody>

          <CardFooter className="px-8 py-6">
            <Button
              color="secondary"
              size="lg"
              className={`w-full font-semibold text-white bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 transition-all duration-200 ${
                !topic.trim() ? "opacity-70 cursor-not-allowed" : "hover:scale-[1.02] shadow-lg"
              }`}
              startContent={<Play className="w-5 h-5" />}
              onClick={generateVideo}
              disabled={!topic.trim()}
            >
              {topic.trim() ? "Generate Video" : "Enter a topic first"}
            </Button>
          </CardFooter>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>Powered by AI • Create unlimited videos</p>
        </div>
      </div>
    </div>
  )
}
