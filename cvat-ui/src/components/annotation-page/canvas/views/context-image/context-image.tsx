// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect, useRef, useState } from 'react';
import { shallowEqual, useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import notification from 'antd/lib/notification';
import Spin from 'antd/lib/spin';
import Text from 'antd/lib/typography/Text';
import { SettingOutlined } from '@ant-design/icons';

import CVATTooltop from 'components/common/cvat-tooltip';
import { CombinedState } from 'reducers';
import ContextImageSelector from './context-image-selector';

interface Props {
    offset: number[];
}

function ContextImage(props: Props): JSX.Element {
    const { offset } = props;
    const defaultFrameOffset = (offset[0] || 0);
    const defaultContextImageOffset = (offset[1] || 0);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const {
        job,
        frame,
        relatedFiles,
    } = useSelector((state: CombinedState) => ({
        job: state.annotation.job.instance!,
        frame: state.annotation.player.frame.number,
        relatedFiles: state.annotation.player.frame.relatedFiles,
    }), shallowEqual);
    const frameIndex = frame + defaultFrameOffset;

    const [contextImageData, setContextImageData] = useState<Record<string, ImageBitmap | Blob>>({});
    const [fetching, setFetching] = useState<boolean>(false);
    const [contextImageOffset, setContextImageOffset] = useState<number>(
        Math.min(defaultContextImageOffset, relatedFiles),
    );

    const [hasError, setHasError] = useState<boolean>(false);
    const [showSelector, setShowSelector] = useState<boolean>(false);
    const [videoURL, setVideoURL] = useState<string | null>(null);

    useEffect(() => {
        let unmounted = false;
        const promise = job.frames.contextImage(frameIndex);
        setFetching(true);
        promise.then((imageBitmaps: Record<string, ImageBitmap | Blob>) => {
            if (!unmounted) {
                console.log('Context data received:', Object.keys(imageBitmaps), imageBitmaps);
                Object.entries(imageBitmaps).forEach(([key, value]) => {
                    console.log(`Context item ${key}:`, value instanceof Blob ? 'Blob' : value instanceof ImageBitmap ? 'ImageBitmap' : 'Unknown', value);
                });
                setContextImageData(imageBitmaps);
            }
        }).catch((error: any) => {
            if (!unmounted) {
                setHasError(true);
                notification.error({
                    message: `Could not fetch context images. Frame: ${frameIndex}`,
                    description: error.toString(),
                });
            }
        }).finally(() => {
            if (!unmounted) {
                setFetching(false);
            }
        });

        return () => {
            setContextImageData({});
            unmounted = true;
        };
    }, [frameIndex]);

    useEffect(() => {
        const sortedKeys = Object.keys(contextImageData).sort();
        const key = sortedKeys[contextImageOffset];
        const mediaData = contextImageData[key];

        console.log('Rendering context item:', key, mediaData instanceof Blob ? 'Blob' : mediaData instanceof ImageBitmap ? 'ImageBitmap' : 'Unknown');

        // Clean up previous video URL
        if (videoURL) {
            URL.revokeObjectURL(videoURL);
            setVideoURL(null);
        }

        if (mediaData) {
            if (mediaData instanceof Blob) {
                // It's a video
                console.log('Creating video URL from Blob, type:', mediaData.type, 'size:', mediaData.size);
                const url = URL.createObjectURL(mediaData);
                console.log('Video URL created:', url);
                setVideoURL(url);
            } else if (canvasRef.current) {
                // It's an image
                const context = canvasRef.current.getContext('2d');
                if (context && mediaData) {
                    canvasRef.current.width = mediaData.width;
                    canvasRef.current.height = mediaData.height;
                    context.drawImage(mediaData, 0, 0);
                }
            }
        }

        // Cleanup on unmount
        return () => {
            if (videoURL) {
                URL.revokeObjectURL(videoURL);
            }
        };
    }, [contextImageData, contextImageOffset]);

    const sortedKeys = Object.keys(contextImageData).sort();
    const contextImageName = sortedKeys[contextImageOffset];
    const currentMedia = contextImageData[contextImageName];
    const isVideo = currentMedia ? currentMedia instanceof Blob : false;

    return (
        <div className='cvat-context-image-wrapper'>
            <div className='cvat-context-image-header'>
                { relatedFiles > 1 && (
                    <SettingOutlined
                        className='cvat-context-image-setup-button'
                        onClick={() => {
                            setShowSelector(true);
                        }}
                    />
                )}
                <div className='cvat-context-image-title'>
                    <CVATTooltop title={contextImageName}>
                        <Text>{contextImageName}</Text>
                    </CVATTooltop>
                </div>
            </div>
            { (hasError ||
                (!fetching && contextImageOffset >= Object.keys(contextImageData).length)) && <Text> No data </Text>}
            { fetching && <Spin size='small' /> }
            {
                contextImageOffset < Object.keys(contextImageData).length && (
                    <>
                        {isVideo && videoURL ? (
                            <video 
                                ref={videoRef}
                                src={videoURL}
                                controls
                                autoPlay
                                loop
                                className='cvat-context-video'
                            />
                        ) : (
                            <canvas ref={canvasRef} />
                        )}
                    </>
                )
            }
            { showSelector && (
                <ContextImageSelector
                    images={contextImageData}
                    offset={contextImageOffset}
                    onChangeOffset={(newContextImageOffset: number) => {
                        setContextImageOffset(newContextImageOffset);
                    }}
                    onClose={() => {
                        setShowSelector(false);
                    }}
                />
            )}
        </div>
    );
}

ContextImage.PropType = {
    offset: PropTypes.arrayOf(PropTypes.number),
};

export default React.memo(ContextImage);
