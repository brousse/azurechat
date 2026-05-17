import type { AzureOpenAI } from "openai";
import { register, resolve, has, SERVICE_KEYS } from "./service-container";
import {
  createProductionOpenAIChat,
  createProductionOpenAIV1,
  createProductionOpenAIMini,
  createProductionOpenAIEmbedding,
  createProductionOpenAIVision,
  createProductionOpenAIReasoning,
  createProductionOpenAIV1Reasoning,
  createProductionOpenAIV1Image,
} from "./openai.production";

const productionBindings: Array<[string, () => AzureOpenAI]> = [
  [SERVICE_KEYS.openaiChat, createProductionOpenAIChat],
  [SERVICE_KEYS.openaiV1, createProductionOpenAIV1],
  [SERVICE_KEYS.openaiMini, createProductionOpenAIMini],
  [SERVICE_KEYS.openaiEmbedding, createProductionOpenAIEmbedding],
  [SERVICE_KEYS.openaiVision, createProductionOpenAIVision],
  [SERVICE_KEYS.openaiReasoning, createProductionOpenAIReasoning],
  [SERVICE_KEYS.openaiV1Reasoning, createProductionOpenAIV1Reasoning],
  [SERVICE_KEYS.openaiV1Image, createProductionOpenAIV1Image],
];

for (const [key, factory] of productionBindings) {
  if (!has(key)) register(key, factory);
}

export const OpenAIInstance = () => resolve<AzureOpenAI>(SERVICE_KEYS.openaiChat);
export const OpenAIV1Instance = () => resolve<AzureOpenAI>(SERVICE_KEYS.openaiV1);
export const OpenAIMiniInstance = () => resolve<AzureOpenAI>(SERVICE_KEYS.openaiMini);
export const OpenAIEmbeddingInstance = () => resolve<AzureOpenAI>(SERVICE_KEYS.openaiEmbedding);
export const OpenAIVisionInstance = () => resolve<AzureOpenAI>(SERVICE_KEYS.openaiVision);
export const OpenAIReasoningInstance = () => resolve<AzureOpenAI>(SERVICE_KEYS.openaiReasoning);
export const OpenAIV1ReasoningInstance = () => resolve<AzureOpenAI>(SERVICE_KEYS.openaiV1Reasoning);
export const OpenAIV1ImageInstance = () => resolve<AzureOpenAI>(SERVICE_KEYS.openaiV1Image);
