/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import Editor from '@monaco-editor/react';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import {Tab, TabList, TabPanel, Tabs} from 'react-tabs';

import {parseHTML, parseJSON} from '@/lib/parse';
import {
  CODE_REGION_CLOSER,
  CODE_REGION_OPENER,
  SPEC_ADDENDUM,
  SPEC_FROM_VIDEO_PROMPT,
} from '@/lib/prompts';
import {generateText} from '@/lib/textGeneration';

interface ContentContainerProps {
  contentBasis: string;
  preSeededSpec?: string;
  preSeededCode?: string;
  onLoadingStateChange?: (isLoading: boolean) => void;
}

type LoadingState = 'loading-spec' | 'loading-code' | 'ready' | 'error';

// Export the ContentContainer component as a forwardRef component
export default forwardRef(function ContentContainer(
  {
    contentBasis,
    preSeededSpec,
    preSeededCode,
    onLoadingStateChange,
  }: ContentContainerProps,
  ref,
) {
  const [spec, setSpec] = useState<string>(preSeededSpec || '');
  const [code, setCode] = useState<string>(preSeededCode || '');
  const [iframeKey, setIframeKey] = useState(0);
  const [saveMessage, setSaveMessage] = useState('');
  const [loadingState, setLoadingState] = useState<LoadingState>(
    preSeededSpec && preSeededCode ? 'ready' : 'loading-spec',
  );
  const [error, setError] = useState<string | null>(null);
  const [isEditingSpec, setIsEditingSpec] = useState(false);
  const [editedSpec, setEditedSpec] = useState('');
  const [activeTabIndex, setActiveTabIndex] = useState(0); // 0: Render, 1: Code, 2: Spec

  // Expose methods to the parent component through ref
  useImperativeHandle(ref, () => ({
    getSpec: () => spec,
    getCode: () => code,
  }));

  // Helper function to generate content spec from video
  const generateSpecFromVideo = async (videoUrl: string): Promise<string> => {
    const specResponse = await generateText({
      modelName: 'gemini-2.5-flash',
      prompt: SPEC_FROM_VIDEO_PROMPT,
      videoUrl: videoUrl,
      wantsJson: true,
    });

    let spec = parseJSON(specResponse).spec;

    spec += SPEC_ADDENDUM;

    return spec;
  };

  // Helper function to generate code from content spec
  const generateCodeFromSpec = async (spec: string): Promise<string> => {
    const codeResponse = await generateText({
      modelName: 'gemini-2.5-flash',
      prompt: spec,
    });

    const code = parseHTML(
      codeResponse,
      CODE_REGION_OPENER,
      CODE_REGION_CLOSER,
    );
    return code;
  };

  // Propagate loading state changes as a boolean
  useEffect(() => {
    if (onLoadingStateChange) {
      const isLoading =
        loadingState === 'loading-spec' || loadingState === 'loading-code';
      onLoadingStateChange(isLoading);
    }
  }, [loadingState, onLoadingStateChange]);

  // On mount (or when contentBasis changes), generate a content spec and then use that spec to generate code
  useEffect(() => {
    async function generateContent() {
      // If we have pre-seeded content, skip generation
      if (preSeededSpec && preSeededCode) {
        setSpec(preSeededSpec);
        setCode(preSeededCode);
        setLoadingState('ready');
        return;
      }

      try {
        // Reset states
        setLoadingState('loading-spec');
        setError(null);
        setSpec('');
        setCode('');

        // Generate a content spec based on video content
        const generatedSpec = await generateSpecFromVideo(contentBasis);
        setSpec(generatedSpec);
        setLoadingState('loading-code');

        // Generate code using the generated content spec
        const generatedCode = await generateCodeFromSpec(generatedSpec);
        setCode(generatedCode);
        setLoadingState('ready');
      } catch (err) {
        console.error(
          'An error occurred while attempting to generate content:',
          err,
        );
        setError(
          err instanceof Error ? err.message : 'An unknown error occurred',
        );
        setLoadingState('error');
      }
    }

    generateContent();
  }, [contentBasis, preSeededSpec, preSeededCode]);

  // Re-render iframe when code changes
  useEffect(() => {
    if (code) {
      setIframeKey((prev) => prev + 1);
    }
  }, [code]);

  // Show save message when code changes manually (not during initial load)
  useEffect(() => {
    if (saveMessage) {
      const timer = setTimeout(() => {
        setSaveMessage('');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [saveMessage]);

  const handleCodeChange = (value: string | undefined) => {
    setCode(value || '');
    setSaveMessage('HTML updated. Changes will appear in the Render tab.');
  };

  const handleSpecEdit = () => {
    setEditedSpec(spec);
    setIsEditingSpec(true);
  };

  const handleSpecSave = async () => {
    const trimmedEditedSpec = editedSpec.trim();

    // Only regenerate if the spec has actually changed
    if (trimmedEditedSpec === spec) {
      setIsEditingSpec(false); // Close the editor
      setEditedSpec(''); // Reset edited spec state
      return;
    }

    try {
      setLoadingState('loading-code');
      setError(null);
      setSpec(trimmedEditedSpec); // Update spec state with trimmed version
      setIsEditingSpec(false);
      setActiveTabIndex(1); // Switch to code tab

      // Generate code using the edited content spec
      const generatedCode = await generateCodeFromSpec(trimmedEditedSpec);
      setCode(generatedCode);
      setLoadingState('ready');
    } catch (err) {
      console.error(
        'An error occurred while attempting to generate code:',
        err,
      );
      setError(
        err instanceof Error ? err.message : 'An unknown error occurred',
      );
      setLoadingState('error');
    }
  };

  const handleSpecCancel = () => {
    setIsEditingSpec(false);
    setEditedSpec('');
  };

  const renderLoadingSpinner = () => (
    <div className="loading-container">
      <div className="loading-spinner">
        <div className="loading-spinner-inner"></div>
      </div>
      <p className="loading-text">
        {loadingState === 'loading-spec'
          ? 'Generating content spec from video...'
          : 'Generating code from content spec...'}
      </p>
    </div>
  );

  const renderErrorState = () => (
    <div className="error-container">
      <div className="error-icon">error</div>
      <h3 className="error-title">Error</h3>
      <p>{error || 'Something went wrong'}</p>
      {!contentBasis.startsWith('http://') &&
      !contentBasis.startsWith('https://') ? (
        <p style={{marginTop: '0.5rem'}}>
          (<strong>NOTE:</strong> URL must begin with http:// or https://)
        </p>
      ) : null}
    </div>
  );

  const renderSpecContent = () => {
    if (loadingState === 'error') {
      return spec ? (
        <div className="spec-display-container">
          <div className="spec-text">{spec}</div>
        </div>
      ) : (
        renderErrorState()
      );
    }

    if (loadingState === 'loading-spec') {
      return renderLoadingSpinner();
    }

    if (isEditingSpec) {
      return (
        <div className="spec-editor-container">
          <Editor
            height="100%"
            defaultLanguage="text"
            value={editedSpec}
            onChange={(value) => setEditedSpec(value || '')}
            theme="vs-dark"
            options={{
              minimap: {enabled: false},
              fontSize: 14,
              wordWrap: 'on',
              lineNumbers: 'off',
              padding: {top: 16},
              scrollbar: {
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
              },
            }}
          />
          <div className="spec-editor-buttons">
            <button onClick={handleSpecSave} className="button-primary">
              Save & Regenerate
            </button>
            <button onClick={handleSpecCancel} className="button-secondary">
              Cancel
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="spec-display-container">
        <div className="spec-text">{spec}</div>
        <div className="spec-display-buttons">
          <button onClick={handleSpecEdit} className="button-primary">
            Edit Spec
            <span className="icon">edit</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="content-container glass-container">
      <Tabs
        className="tabs-container"
        selectedIndex={activeTabIndex}
        onSelect={(index) => {
          if (isEditingSpec && index !== 2) {
            setIsEditingSpec(false);
            setEditedSpec('');
          }
          setActiveTabIndex(index);
        }}
        selectedTabClassName="selected-tab"
        selectedTabPanelClassName="selected-tab-panel">
        <TabList className="tab-list">
          <Tab className="tab">Render</Tab>
          <Tab className="tab">Code</Tab>
          <Tab className="tab">Spec</Tab>
        </TabList>

        <TabPanel>
          <div className="tab-panel-content">
            {loadingState === 'error' ? (
              renderErrorState()
            ) : loadingState !== 'ready' ? (
              renderLoadingSpinner()
            ) : (
              <iframe
                key={iframeKey}
                srcDoc={code}
                className="render-iframe"
                title="rendered-html"
                sandbox="allow-scripts"
              />
            )}
          </div>
        </TabPanel>

        <TabPanel>
          <div className="tab-panel-content">
            {loadingState === 'error' ? (
              renderErrorState()
            ) : loadingState !== 'ready' ? (
              renderLoadingSpinner()
            ) : (
              <div className="editor-wrapper">
                <Editor
                  height="100%"
                  defaultLanguage="html"
                  value={code}
                  onChange={handleCodeChange}
                  theme="vs-dark"
                  options={{
                    minimap: {enabled: false},
                    fontSize: 14,
                    wordWrap: 'on',
                    formatOnPaste: true,
                    formatOnType: true,
                    padding: {top: 16},
                    scrollbar: {
                      verticalScrollbarSize: 10,
                      horizontalScrollbarSize: 10,
                    },
                  }}
                />
                {saveMessage && <div className="save-message">{saveMessage}</div>}
              </div>
            )}
          </div>
        </TabPanel>

        <TabPanel>
          <div className="tab-panel-content">{renderSpecContent()}</div>
        </TabPanel>
      </Tabs>
    </div>
  );
});
