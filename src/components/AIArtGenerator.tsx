"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Wand2, Download, Share2, ShoppingCart } from "lucide-react"

interface GeneratedImage {
  id: string
  url: string
  prompt: string
  style: string
}

export function AIArtGenerator() {
  const [prompt, setPrompt] = useState("")
  const [style, setStyle] = useState("photographic")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null)

  const styles = [
    { value: "photographic", label: "Photographic" },
    { value: "artistic", label: "Artistic" },
    { value: "cartoon", label: "Cartoon" },
    { value: "abstract", label: "Abstract" },
    { value: "vintage", label: "Vintage" },
  ]

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    
    try {
      // TODO: Implement actual AI image generation
      // For now, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      setGeneratedImage({
        id: "demo-1",
        url: "https://via.placeholder.com/512x512/6366f1/ffffff?text=AI+Generated+Art",
        prompt,
        style,
      })
    } catch (error) {
      console.error("Failed to generate image:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          <div>
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-900 mb-2">
              Describe the artwork you want to order framed
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A serene mountain landscape at sunset with golden clouds - order it framed to your house"
              className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-pink-primary focus:border-transparent bg-white text-gray-900 placeholder-gray-muted"
              maxLength={500}
            />
            <div className="text-sm text-gray-muted mt-1">
              {prompt.length}/500 characters
            </div>
          </div>

          <div>
            <label htmlFor="style" className="block text-sm font-medium text-gray-900 mb-2">
              Art Style
            </label>
            <select
              id="style"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-primary focus:border-transparent bg-white text-gray-900"
            >
              {styles.map((styleOption) => (
                <option key={styleOption.value} value={styleOption.value}>
                  {styleOption.label}
                </option>
              ))}
            </select>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="w-full h-12 text-lg bg-pink-primary hover:bg-pink-primary/90 text-dark font-semibold"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-dark mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-5 w-5" />
                Generate Art
              </>
            )}
          </Button>
        </div>

        {/* Output Section */}
        <div className="space-y-4">
          {generatedImage ? (
            <div className="space-y-4">
              <div className="relative group">
                <img
                  src={generatedImage.url}
                  alt={generatedImage.prompt}
                  className="w-full h-96 object-cover rounded-lg shadow-lg"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 rounded-lg flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2">
                    <Button size="sm" variant="secondary">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    <Button size="sm" variant="secondary">
                      <Share2 className="h-4 w-4 mr-1" />
                      Share
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-300">
                <h3 className="font-semibold text-gray-900 mb-2">Generated Artwork</h3>
                <p className="text-sm text-gray-muted mb-3">{generatedImage.prompt}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-muted capitalize">
                    Style: {generatedImage.style}
                  </span>
                  <Button size="sm" className="bg-pink-primary hover:bg-pink-primary/90 text-dark">
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    Order Print
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-96 bg-white rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
              <div className="text-center text-gray-muted">
                <Wand2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Your artwork will appear here</p>
                <p className="text-sm">Enter a prompt and click generate to create your masterpiece</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tips Section */}
      <div className="mt-12 bg-pink-accent/10 p-6 rounded-lg border border-pink-primary/20">
        <h3 className="font-semibold text-pink-primary mb-3">💡 Tips for Better Results</h3>
        <ul className="text-sm text-gray-muted space-y-1">
          <li>• Be specific about colors, lighting, and mood</li>
          <li>• Include details about composition and perspective</li>
          <li>• Mention artistic styles or famous artists for inspiration</li>
          <li>• Use descriptive adjectives to enhance the visual quality</li>
        </ul>
      </div>
    </div>
  )
}

