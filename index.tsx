/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import App from '@/App';
import {DataContext} from '@/context';
import React, {useState, useEffect} from 'react';
import ReactDOM from 'react-dom/client';
import {Example} from './lib/types';

// Preloader Component (Renders the visual part of the preloader)
function Preloader() {
  return (
    <div className="preloader-content">
      <h1 className="preloader-title">
        LearnSphere
        <span className="preloader-title-gradient"> AI</span>
      </h1>
      <div className="preloader-spinner">
        <div className="preloader-spinner-inner" />
      </div>
    </div>
  );
}

// Component that manages the preloader visibility and switches to the App
function AppWithPreloader() {
  const [isPreloading, setIsPreloading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPreloading(false);
    }, 3000); // Show preloader for 3 seconds

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <div className={`preloader ${isPreloading ? '' : 'fade-out'}`}>
        <Preloader />
      </div>
      {!isPreloading && <App />}
    </>
  );
}

function DataProvider({children}) {
  const [examples, setExamples] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    setIsLoading(true);
    fetch('data/examples.json')
      .then((res) => res.json())
      .then((fetchedData) => {
        setExamples(fetchedData);
        setIsLoading(false);
      });
  }, []);

  const empty = {title: '', url: '', spec: '', code: ''};

  const value = {
    examples,
    isLoading,
    setExamples,
    defaultExample: examples ? examples[0] : empty,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <DataProvider>
    <AppWithPreloader />
  </DataProvider>,
);
