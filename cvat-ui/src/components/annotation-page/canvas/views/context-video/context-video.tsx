// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect, useRef, useState } from 'react';
import { shallowEqual, useSelector } from 'react-redux';
import notification from 'antd/lib/notification';
import Spin from 'antd/lib/spin';
import Text from 'antd/lib/typography/Text';
import { PlayCircleOutlined } from '@ant-design/icons';

import { CombinedState } from 'reducers';

interface Props {
    offset: number[];
}

function ContextVideo(props: Props): JSX.Element {
    console.log('[CONTEXT_VIDEO] ContextVideo component rendered', props);
    
    const { offset } = props;
    const defaultFrameOffset = (offset[0] || 0);

    const videoRef = useRef<HTMLVideoElement>(null);
    const {
        job,
        frame,
    } = useSelector((state: CombinedState) => ({
        job: state.annotation.job.instance!,
        frame: state.annotation.player.frame.number,
    }), shallowEqual);
    const frameIndex = frame + defaultFrameOffset;

    console.log(`[CONTEXT_VIDEO] Component state - frameIndex: ${frameIndex}, job: ${job?.id}`);

    const [videoURL, setVideoURL] = useState<string | null>(null);
    const [fetching, setFetching] = useState<boolean>(false);
    const [hasError, setHasError] = useState<boolean>(false);

    useEffect(() => {
        let unmounted = false;
        
        console.log(`[CONTEXT_VIDEO] Component effect triggered - frameIndex: ${frameIndex}, job: ${job?.id}`);
        
        const promise = job.frames.contextVideoURL(frameIndex);
        setFetching(true);
        promise.then((url: string | null) => {
            if (!unmounted) {
                console.log(`[CONTEXT_VIDEO] contextVideoURL resolved - url: ${url}`);
                setVideoURL(url);
            }
        }).catch((error: any) => {
            if (!unmounted) {
                console.error(`[CONTEXT_VIDEO] contextVideoURL error:`, error);
                setHasError(true);
                notification.error({
                    message: `Could not fetch context video. Frame: ${frameIndex}`,
                    description: error.toString(),
                });
            }
        }).finally(() => {
            if (!unmounted) {
                console.log(`[CONTEXT_VIDEO] contextVideoURL completed - fetching: false`);
                setFetching(false);
            }
        });

        return () => {
            console.log(`[CONTEXT_VIDEO] Component cleanup - frameIndex: ${frameIndex}`);
            setVideoURL(null);
            unmounted = true;
        };
    }, [frameIndex]);

    if (hasError || (!fetching && !videoURL)) {
        console.log(`[CONTEXT_VIDEO] Rendering "no video" state - hasError: ${hasError}, fetching: ${fetching}, videoURL: ${videoURL}`);
        return (
            <div className='cvat-context-video-wrapper'>
                <div className='cvat-context-video-header'>
                    <div className='cvat-context-video-title'>
                        <Text>No context video</Text>
                    </div>
                </div>
            </div>
        );
    }

    if (fetching) {
        console.log(`[CONTEXT_VIDEO] Rendering "loading" state`);
        return (
            <div className='cvat-context-video-wrapper'>
                <Spin size='small' />
            </div>
        );
    }

    console.log(`[CONTEXT_VIDEO] Rendering video player - videoURL: ${videoURL}`);
    return (
        <div className='cvat-context-video-wrapper'>
            <div className='cvat-context-video-header'>
                <PlayCircleOutlined className='cvat-context-video-icon' />
                <div className='cvat-context-video-title'>
                    <Text>Context Video</Text>
                </div>
            </div>
            <div className='cvat-context-video-player'>
                <video
                    ref={videoRef}
                    src={videoURL || undefined}
                    controls
                    className='cvat-context-video-element'
                />
            </div>
        </div>
    );
}

export default React.memo(ContextVideo);
