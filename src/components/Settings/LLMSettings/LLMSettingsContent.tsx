import React, { useState, useEffect } from "react";

import { Button } from "@material-tailwind/react";

import DefaultLLMSelector from "./DefaultLLMSelector";
import useLLMConfigs from "./hooks/useLLMConfigs";
import useModals from "./hooks/useModals";

import CustomSelect from "@/components/Common/Select";

interface LLMSettingsContentProps {
  userHasCompleted?: (completed: boolean) => void;
  userTriedToSubmit?: boolean;
  isInitialSetup: boolean;
}

const LLMSettingsContent: React.FC<LLMSettingsContentProps> = ({
  userHasCompleted,
  userTriedToSubmit,
  isInitialSetup,
}) => {
  const { llmConfigs, defaultLLM, setDefaultLLM, fetchAndUpdateModelConfigs } =
    useLLMConfigs();
  const { modals, openModal, closeModal } = useModals();

  const [userMadeChanges, setUserMadeChanges] = useState<boolean>(false);
  const [currentError, setCurrentError] = useState<string>("");

  useEffect(() => {
    if (defaultLLM) {
      setCurrentError("");
      userHasCompleted?.(true);
    } else {
      setCurrentError("No model selected");
      userHasCompleted?.(false);
    }
  }, [defaultLLM, userHasCompleted]);

  const handleModelChange = (model: string) => {
    setUserMadeChanges(true);
    userHasCompleted?.(!!model);
  };

  const modalOptions = [
    { label: "OpenAI Setup", value: "openai" },
    { label: "Anthropic Setup", value: "anthropic" },
  ];

  return (
    <div className="w-[500px] p-5">
      <h2 className="mb-4 font-semibold text-white">LLM</h2>
      {llmConfigs.length > 0 && (
        <div className="flex w-full items-center justify-between gap-5 border-0 border-b-2 border-solid border-neutral-700 pb-2">
          {/* <h4 className="text-gray-200 text-center font-normal">Default LLM</h4> */}
          <div className="flex-col">
            <p className="mt-5 text-gray-100">Default LLM</p>
          </div>
          <div className="mb-1 w-[140px]">
            <DefaultLLMSelector
              onModelChange={handleModelChange}
              llmConfigs={llmConfigs}
              defaultLLM={defaultLLM}
              setDefaultLLM={setDefaultLLM}
            />
          </div>
        </div>
      )}
      <LLMOptionRow
        title="Local LLM"
        buttonText="Add New Local LLM"
        description="Attach a local LLM. Reor will download the model for you."
        onClick={() => {
          openModal("newLocalModel");
        }}
      />
      <LLMOptionRow
        title="Setup OpenAI/Anthropic"
        description="Add your API key"
      >
        <CustomSelect
          options={modalOptions}
          selectedValue="Attach Cloud LLM"
          onChange={(value) => {
            openModal(value as "openai" | "anthropic");
          }}
          centerText={true}
        />
      </LLMOptionRow>
      <LLMOptionRow
        title="Setup remote LLMs"
        description="Non-OpenAI/Anthropic LLMs"
        buttonText="Remote LLM Setup"
        onClick={() => {
          openModal("remoteLLM");
        }}
      />
      {!isInitialSetup && userMadeChanges && (
        <p className="mt-1 text-xs text-slate-100">
          Note: You&apos;ll need to refresh the chat window to apply these
          changes.
        </p>
      )}
      {userTriedToSubmit && !defaultLLM && (
        <p className="mt-1 text-sm text-red-500">{currentError}</p>
      )}
      {/* Render modals */}
      {Object.entries(modals).map(([key, { isOpen, Component }]) => (
        <Component
          key={key}
          isOpen={isOpen}
          onClose={() => {
            closeModal(key as keyof typeof modals);
            fetchAndUpdateModelConfigs();
          }}
          //   refreshLLMs={fetchAndUpdateModelConfigs}
        />
      ))}
    </div>
  );
};

const LLMOptionRow: React.FC<{
  title: string;
  description?: string;
  buttonText?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}> = ({ title, description, buttonText, onClick, children }) => (
  <div className="flex w-full items-center justify-between gap-5 border-0 border-b-2 border-solid border-neutral-700 pb-2">
    <div className="flex-col">
      <p className="mt-5 text-gray-100">
        {title}
        {description && (
          <p className="m-0 pt-1 text-xs text-gray-100 opacity-40">
            {description}
          </p>
        )}
      </p>
    </div>
    <div className="flex">
      {buttonText && (
        <Button
          className="flex min-w-[192px] cursor-pointer items-center justify-between rounded-md border border-none border-gray-300 bg-dark-gray-c-eight py-2 font-normal hover:bg-dark-gray-c-ten"
          onClick={onClick}
          placeholder=""
        >
          {buttonText}
        </Button>
      )}
      {children}
    </div>
  </div>
);

export default LLMSettingsContent;
