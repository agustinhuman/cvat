// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useRef, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import Text from 'antd/lib/typography/Text';
import { CloseOutlined, PlayCircleOutlined } from '@ant-design/icons';

interface Props {
    images: Record<string, ImageBitmap | Blob>;
    offset: number;
    onChangeOffset: (offset: number) => void;
    onClose: () => void;
}

function MediaPreview({
    media, isActive, onClick, name,
}: { media: ImageBitmap | Blob, name: string, isActive: boolean, onClick: () => void }): JSX.Element {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoURL, setVideoURL] = useState<string | null>(null);

    const isVideo = media instanceof Blob;

    useEffect((): void => {
        if (isVideo) {
            // Create object URL for video
            const url = URL.createObjectURL(media);
            setVideoURL(url);

            return () => {
                URL.revokeObjectURL(url);
            };
        } else if (canvasRef.current) {
            // Render image on canvas
            const context = canvasRef.current.getContext('2d');
            if (context) {
                canvasRef.current.width = media.width;
                canvasRef.current.height = media.height;
                context.drawImage(media, 0, 0);
            }
        }
    }, [media, isVideo]);

    return (
        <div className={(isActive ? ['cvat-context-image-gallery-item cvat-context-image-gallery-item-current'] : ['cvat-context-image-gallery-item']).join(' ')}>
            <Text strong className='cvat-context-image-gallery-item-name'>{name}</Text>
            {isVideo && videoURL ? (
                <div className='cvat-context-video-preview' onClick={onClick}>
                    <video
                        ref={videoRef}
                        src={videoURL}
                        muted
                        style={{ width: '100%', height: 'auto' }}
                    />
                    <div className='cvat-context-video-overlay'>
                        <PlayCircleOutlined style={{ fontSize: '48px', color: 'white' }} />
                    </div>
                </div>
            ) : (
                <canvas
                    ref={canvasRef}
                    onClick={onClick}
                />
            )}
        </div>
    );
}

function ContextImageSelector(props: Props): React.ReactPortal {
    const {
        images, offset, onChangeOffset, onClose,
    } = props;

    const keys = Object.keys(images).sort();

    return ReactDOM.createPortal((
        <div className='cvat-context-image-overlay'>
            <div className='cvat-context-image-gallery'>
                <div className='cvat-context-image-gallery-header'>
                    <Text>
                        Click the image or video to display it as context
                    </Text>
                    <CloseOutlined className='cvat-context-image-close-button' onClick={onClose} />
                </div>
                <div className='cvat-context-image-gallery-items'>
                    { keys.map((key, i: number) => (
                        <MediaPreview
                            name={key}
                            media={images[key]}
                            isActive={offset === i}
                            onClick={() => {
                                onChangeOffset(i);
                                onClose();
                            }}
                            key={i}
                        />
                    ))}
                </div>
            </div>
        </div>
    ), window.document.body);
}

ContextImageSelector.PropType = {
    images: PropTypes.arrayOf(PropTypes.string),
    offset: PropTypes.number,
    onChangeOffset: PropTypes.func,
    onClose: PropTypes.func,
};

export default React.memo(ContextImageSelector);
