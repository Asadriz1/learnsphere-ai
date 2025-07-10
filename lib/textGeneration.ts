/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import {
  FinishReason,
  GoogleGenAI,
  Part,
  GenerateContentResponse,
} from '@google/genai';

// The API key is read from the environment variable `process.env.API_KEY`.
// This variable is assumed to be set in the execution environment.
const API_KEY = process.env.API_KEY;

interface GenerateTextOptions {
  modelName: string;
  prompt: string;
  videoUrl?: string;
  temperature?: number;
  wantsJson?: boolean;
}

/**
 * Generate text content using the Gemini API, optionally including video data.
 *
 * @param options - Configuration options for the generation request.
 * @returns The response from the Gemini API.
 */
export async function generateText(
  options: GenerateTextOptions,
): Promise<string> {
  const {modelName, prompt, videoUrl, temperature = 0.75, wantsJson} = options;

  if (!API_KEY) {
    throw new Error(
      'API key is missing or empty. Make sure to set the API_KEY environment variable.',
    );
  }

  const ai = new GoogleGenAI({apiKey: API_KEY});

  const config = {
    temperature,
    ...(wantsJson && {responseMimeType: 'application/json'}),
  };

  let contents: string | {parts: Part[]};
  if (videoUrl) {
    const textPart = {text: prompt};
    const videoPart = {
      fileData: {
        mimeType: 'video/mp4',
        fileUri: videoUrl,
      },
    };
    contents = {parts: [textPart, videoPart]};
  } else {
    contents = prompt;
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents,
      config,
    });

    // Check for prompt blockage
    if (response.promptFeedback?.blockReason) {
      throw new Error(
        `Content generation failed: Prompt blocked (reason: ${response.promptFeedback.blockReason})`,
      );
    }

    // response.text getter will handle this, but for a better error message, we can check.
    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('Content generation failed: No candidates returned.');
    }

    const firstCandidate = response.candidates[0];

    // Check for finish reasons other than STOP
    if (
      firstCandidate.finishReason &&
      firstCandidate.finishReason !== FinishReason.STOP
    ) {
      if (firstCandidate.finishReason === FinishReason.SAFETY) {
        throw new Error(
          'Content generation failed: Response blocked due to safety settings.',
        );
      } else {
        throw new Error(
          `Content generation failed: Stopped due to ${firstCandidate.finishReason}.`,
        );
      }
    }

    return response.text;
  } catch (error) {
    console.error(
      'An error occurred during Gemini API call or response processing:',
      error,
    );
    throw error;
  }
}