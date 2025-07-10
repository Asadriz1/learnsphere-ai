/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import {DataContext} from '@/context';
import {Example} from '@/lib/types';
import {useContext, useEffect, useState} from 'react';

interface ExampleGalleryProps {
  title?: string;
  selectedExample: Example | null;
  onSelectExample: (example: Example) => void;
}

export default function ExampleGallery({
  title = 'Examples',
  selectedExample,
  onSelectExample,
}: ExampleGalleryProps) {
  const getThumbnailUrl = (url: string) => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId = match && match[2].length === 11 ? match[2] : null;
    return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : '';
  };

  const {defaultExample, examples, isLoading} = useContext(DataContext);

  return (
    <div className="example-gallery">
      <h2 className="gallery-title">{title}</h2>
      <div className="gallery-grid">
        {examples.map((example) => (
          <div
            key={example.title}
            className={`gallery-item glass-container ${
              selectedExample?.title === example.title ? 'selected' : ''
            }`}
            onClick={() => onSelectExample(example)}>
            <div className="thumbnail-container">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getThumbnailUrl(example.url)}
                alt={example.title}
                className="thumbnail"
              />
            </div>
            <div className="gallery-item-title">{example.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
