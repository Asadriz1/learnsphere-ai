/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import ContentContainer from '@/components/ContentContainer';
import ExampleGallery from '@/components/ExampleGallery';
import {DataContext} from '@/context';
import {Example} from '@/lib/types';
import {
  getYoutubeEmbedUrl,
  getYouTubeVideoTitle,
  validateYoutubeUrl,
} from '@/lib/youtube';
import {useContext, useEffect, useRef, useState} from 'react';

// Whether to validate the input URL before attempting to generate content
const VALIDATE_INPUT_URL = true;

// Whether to pre-seed with example content
const PRESEED_CONTENT = false;

// Helper function to load a shared state by ID
export default function App() {
  const {defaultExample, examples, setExamples, isLoading} =
    useContext(DataContext);

  const [videoUrl, setVideoUrl] = useState(
    PRESEED_CONTENT ? defaultExample?.url : '',
  );

  const [urlValidating, setUrlValidating] = useState(false); // State to track URL validation
  const [contentLoading, setContentLoading] = useState(false); // State to track content loading

  // Reference to ContentContainer component for accessing its state
  const contentContainerRef = useRef<{
    getSpec: () => string;
    getCode: () => string;
  } | null>(null);

  // Counter to force ContentContainer re-mount even if the video URL hasn't changed
  const [reloadCounter, setReloadCounter] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedExample, setSelectedExample] = useState<Example | null>(
    PRESEED_CONTENT ? defaultExample : null,
  );

  // Handle 'Enter' key press in the input field
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !urlValidating && !contentLoading) {
      handleSubmit();
    }
  };

  const handleExampleSelect = (example: Example) => {
    if (inputRef.current) {
      inputRef.current.value = example.url;
    }
    setVideoUrl(example.url);
    setSelectedExample(example);
    setReloadCounter((c) => c + 1);
  };

  const handleSubmit = async () => {
    const inputValue = inputRef.current?.value.trim() || '';

    if (!inputValue) {
      inputRef.current?.focus();
      return;
    }

    // Prevent multiple clicks while validating
    if (urlValidating) return;

    setUrlValidating(true);
    setVideoUrl(''); // Clear previous video URL immediately
    setContentLoading(false); // Reset content loading state
    setSelectedExample(null); // Clear the selected example to force new generation

    // Check if the URL matches any of our examples
    const isPreSeededExample = [defaultExample, ...examples].some(
      (example) => example.url === inputValue,
    );

    // No need to validate the URL if it's a pre-seeded example
    if (isPreSeededExample) {
      proceedWithVideo(inputValue);
      return;
    }

    if (VALIDATE_INPUT_URL) {
      // Validate video URL
      const validationResult = await validateYoutubeUrl(inputValue);

      if (validationResult.isValid) {
        proceedWithVideo(inputValue);
      } else {
        alert(validationResult.error || 'Invalid YouTube URL');
        setUrlValidating(false);
      }
    } else {
      // If URL validation is disabled, proceed directly
      proceedWithVideo(inputValue);
    }
  };

  // Helper function to handle common operations after URL validation
  const proceedWithVideo = (url: string) => {
    setVideoUrl(url);
    // Incrementing the counter changes the 'key' prop on ContentContainer,
    // forcing it to re-mount and re-generate content
    setReloadCounter((c) => c + 1);
    setUrlValidating(false);
  };

  // Callback function to handle loading state changes from ContentContainer
  const handleContentLoadingStateChange = (isLoading: boolean) => {
    setContentLoading(isLoading);
  };

  const exampleGallery = (
    <ExampleGallery
      title={PRESEED_CONTENT ? 'More examples' : 'Try an Example'}
      onSelectExample={handleExampleSelect}
      selectedExample={selectedExample}
    />
  );

  return (
    <>
      <main className="main-container">
        <div className="left-side">
          <h1 className="headline">
            LearnSphere
            <span className="headline-gradient"> AI</span>
          </h1>
          <p className="subtitle">
            Generate interactive learning apps from YouTube content
          </p>
          <div className="input-container">
            <label htmlFor="youtube-url" className="input-label">
              Paste a YouTube URL
            </label>
            <input
              ref={inputRef}
              id="youtube-url"
              className="youtube-input"
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              defaultValue={PRESEED_CONTENT ? defaultExample?.url : ''}
              disabled={urlValidating || contentLoading} // Disable input while validating or loading
              onKeyDown={handleKeyDown} // Add keydown handler
              onChange={() => {
                // Clear all content upon input change
                setVideoUrl('');
                setSelectedExample(null);
              }}
            />
          </div>

          <div className="button-container">
            <button
              onClick={handleSubmit}
              className="button-primary submit-button"
              disabled={urlValidating || contentLoading} // Disable button during validation or content loading
            >
              {urlValidating
                ? 'Validating...'
                : contentLoading
                  ? 'Generating...'
                  : 'Generate App'}
            </button>
          </div>

          <div className="video-container glass-container">
            {videoUrl ? (
              <iframe
                className="video-iframe"
                src={getYoutubeEmbedUrl(videoUrl)}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen></iframe>
            ) : (
              <div className="video-placeholder">
                Your video will appear here
              </div>
            )}
          </div>

          <div className="gallery-container desktop-gallery-container">
            {exampleGallery}
          </div>
        </div>

        <div className="right-side">
          <div className="content-area">
            {videoUrl ? (
              <ContentContainer
                key={reloadCounter}
                contentBasis={videoUrl}
                onLoadingStateChange={handleContentLoadingStateChange}
                preSeededSpec={selectedExample?.spec}
                preSeededCode={selectedExample?.code}
                ref={contentContainerRef}
              />
            ) : (
              <div className="content-placeholder glass-container">
                <div className="placeholder-content">
                  <span className="placeholder-icon">auto_awesome</span>
                  <p>
                    {urlValidating
                      ? 'Validating URL...'
                      : 'Paste a YouTube URL or select an example to begin'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="gallery-container mobile-gallery-container">
            {exampleGallery}
          </div>
        </div>
      </main>

      <style>{`
        .main-container {
          padding: 2rem 4rem;
          display: flex;
          gap: 2rem;
          height: 100vh;
          box-sizing: border-box;
          overflow: hidden;

          @media (max-width: 1200px) {
            padding: 2rem;
          }

          @media (max-width: 768px) {
            flex-direction: column;
            padding: 2rem 1.5rem;
            gap: 1.5rem;
            height: auto;
            overflow: visible;
          }
        }

        .left-side {
          width: 40%;
          max-width: 600px;
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          overflow-y: auto;
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE and Edge */
          padding-right: 1rem;

          @media (max-width: 768px) {
            width: 100%;
            height: auto;
            overflow: visible;
            padding-right: 0;
            max-width: none;
          }
        }

        .left-side::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }

        .right-side {
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: 1.5rem;
          height: 100%;
          min-width: 0; /* Prevents flexbox overflow issues */

          @media (max-width: 768px) {
            height: auto;
          }
        }


        .headline {
          color: var(--color-headline);
          font-family: var(--font-display);
          font-size: 3.5rem;
          font-weight: 600;
          letter-spacing: -0.02em;
          margin: 0;
          text-align: left;
          
          @media (max-width: 768px) {
            font-size: 2.5rem;
            text-align: center;
          }
        }

        .headline-gradient {
          background: var(--gradient-accent);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .subtitle {
          color: var(--color-subtitle);
          font-size: 1.125rem;
          margin-top: -1rem;
          margin-bottom: 0;
          text-align: left;
          max-width: 450px;

          @media (max-width: 768px) {
            font-size: 1rem;
            text-align: center;
            margin-top: -0.5rem;
            max-width: none;
          }
        }

        .input-container {
          width: 100%;
        }

        .input-label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: var(--color-text-secondary);
        }

        .youtube-input {
          width: 100%;
        }

        .button-container {
          width: 100%;
          display: flex;
          gap: 0.5rem;
        }

        .submit-button {
          flex: 1;
          font-size: 1rem;
          font-weight: 600;
        }

        .video-container {
          position: relative;
          width: 100%;
          padding-top: 56.25%; /* 16:9 aspect ratio */
          border-radius: var(--border-radius-lg);
          overflow: hidden; /* Ensures iframe corners are rounded */
        }

        .video-iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
        }

        .video-placeholder {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-placeholder);
          font-size: 0.9rem;
        }

        .content-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0; /* Prevents flexbox overflow */
          max-height: 100%;

          @media (max-width: 768px) {
            height: 600px;
            max-height: 70vh;
          }
        }

        .content-placeholder {
          height: 100%;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--border-radius-lg);
        }
        
        .placeholder-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          color: var(--color-text-placeholder);
          font-size: 1rem;
        }

        .placeholder-icon {
          font-family: var(--font-symbols);
          font-size: 3rem;
          background: var(--gradient-accent);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .gallery-container {
          width: 100%;
        }

        .desktop-gallery-container {
          display: block;

          @media (max-width: 768px) {
            display: none; /* Hide on mobile */
          }
        }

        .mobile-gallery-container {
          display: none; /* Hide on desktop */

          @media (max-width: 768px) {
            display: block;
          }
        }
      `}</style>
    </>
  );
}
