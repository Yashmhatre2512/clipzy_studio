import { useState } from "react";
import { Accordion, AccordionItem } from "@nextui-org/accordion";
import { useDisclosure } from "@nextui-org/modal";
import { Input } from "@nextui-org/input";
import { Button } from "@nextui-org/button";
import { Divider } from "@nextui-org/divider";
import { Progress } from "@nextui-org/progress";
import { Code } from "@nextui-org/code";
import { Chip } from "@nextui-org/chip";

import { VideoGenerator } from "./video";

import AdvancedOptions from "@/components/options";
import { subtitle, title } from "@/components/primitives";
import { ConfirmModal } from "@/components/modal";
import { defaultVideoOptions, VideoOptions } from "@/config/options";
import { BACKEND_ENDPOINT } from "@/config/backend";

export default function AIGen() {
  const confirmModal = useDisclosure();

  const [prompt, setPrompt] = useState<string>("");
  const [advancedOptions, setAdvancedOptions] =
    useState<VideoOptions>(defaultVideoOptions);
  const [usedDefaultOptions, setUsedDefaultOptions] = useState(false);

  const [isAIRunning, setIsAIRunning] = useState(false);
  const [aiRepsonse, setAIResponse] = useState<string | null>(null);
  const [aiError, setAIError] = useState<string | null>(null);

  // TODO: Use server-side rendering and fetch AI response from the server

  async function fetchAI() {
    console.log("Fetching AI response...");
    setAIError(null);

    try {
      let json = advancedOptions;

      // Add prompt
      json.aiPrompt = prompt;

      const postData = JSON.stringify(json);

      // POST request to fetch AI JSON
      let res = await fetch(`${BACKEND_ENDPOINT}/generateAIJSON`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: postData,
      });

      let data = await res.json();

      if (!res.ok) {
        setAIError(
          "Failed to fetch AI models: " + (data.error ?? data.toString()),
        );

        return;
      }

      setAIResponse(data.result);
    } catch (e: any) {
      setAIError(
        "Failed to fetch AI models due to internal error: " +
          (e.message ?? e.toString()),
      );
    }
  }

  function openModal() {
    // Check if advanced options are selected, if not, set it to default values
    if (advancedOptions === defaultVideoOptions) setUsedDefaultOptions(true);
    confirmModal.onOpen();
  }

  function renderVideo() {
    setIsAIRunning(true);
    fetchAI();
  }

  const promptSuggestions = [
    "news topic about the world",
    "quiz about country capitals",
    "text message between two friends",
    "rank fast food",
    "would you rather about food",
  ];

  return isAIRunning ? (
    <AIOutput
      aiError={aiError}
      aiRepsonse={aiRepsonse}
      options={advancedOptions}
    />
  ) : (
    <div className="flex flex-col items-center justify-center gap-4 w-full">
      <div className="flex items-center gap-4">

        <p className={title()}>Generate video with AI!</p>
      </div>
      <p className={subtitle({ size: "sm" })}>
        Enter a prompt for the AI to generate a video.
      </p>
      <Input
        isClearable
        placeholder="Enter prompt..."
        size="lg"

        value={prompt}
        variant="faded"
        onChange={(e) => setPrompt(e.target.value)}
      />
      <div className="flex flex-row gap-2 overflow-x-auto max-w-full">
        {promptSuggestions.map((suggestion, _) => (
          <Chip
            key={suggestion}
            className="text-xs cursor-pointer "

            variant="bordered"
            onClick={() => setPrompt(suggestion)}
          >
            {suggestion}
          </Chip>
        ))}
      </div>
      <Divider />
      <Button color="primary" size="lg" variant="shadow" onClick={openModal}>
        Render Video
      </Button>
      <ConfirmModal
        advancedOptions={advancedOptions}
        confirmModal={confirmModal}
        renderVideo={renderVideo}
        usedDefaultOptions={usedDefaultOptions}
      />
    </div>
  );
}

export const AIOutput = ({
  aiRepsonse,
  aiError,
  options,
}: {
  aiRepsonse: string | null;
  aiError: string | null;
  options: VideoOptions;
}) => {
  return aiRepsonse ? (
    <>
      <div className="flex flex-col items-center justify-center gap-4 w-full">
        {/* <p className={subtitle({ size: 'sm' })}>The AI has successfully generated the video script. You can now render the video.</p> */}
        <VideoGenerator isAI={true} json={aiRepsonse} options={options} />
        {/* <Button size="sm" startContent={<FaArrowLeft />} onClick={() => window.location.reload()}>Go Back</Button> */}
      </div>
    </>
  ) : (
    <>
      {aiError ? (
        <div className="flex flex-col items-center justify-center gap-4 w-full">
          <p className={title()}>Error generating video with AI</p>
          <p className={subtitle({ size: "sm" })}>
            An error occurred while generating the video script with AI. Please
            check the error message below.
          </p>
          <Chip color="danger" variant="shadow">
            {aiError}
          </Chip>
          <Button size="sm" onClick={() => window.location.reload()}>
            Go Back
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 w-full">
          <p className={title()}>AI is generating the video script</p>
          <p className={subtitle({ size: "sm" })}>
            Please wait while the AI generates the video script. This may take a
            few minutes.
          </p>
          <Progress
            isIndeterminate
            aria-label="Loading..."
            className="max-w-md"
            size="md"
          />
          <Code>Loading...</Code>
          {/* <Button size="sm" startContent={<FaArrowLeft />} onClick={() => window.location.reload()}>Go Back</Button> */}
        </div>
      )}
    </>
  );
};
