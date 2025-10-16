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

    const [videoURL, setVideoURL] = useState<string | null>(null);
    const [fetching, setFetching] = useState<boolean>(false);
    const [hasError, setHasError] = useState<boolean>(false);

    useEffect(() => {
        let unmounted = false;
        const promise = job.frames.contextVideoURL(frameIndex);
        setFetching(true);
        promise.then((url: string | null) => {
            if (!unmounted) {
                setVideoURL(url);
            }
        }).catch((error: any) => {
            if (!unmounted) {
                setHasError(true);
                notification.error({
                    message: `Could not fetch context video. Frame: ${frameIndex}`,
                    description: error.toString(),
                });
            }
        }).finally(() => {
            if (!unmounted) {
                setFetching(false);
            }
        });

        return () => {
            setVideoURL(null);
            unmounted = true;
        };
    }, [frameIndex]);

    if (hasError || (!fetching && !videoURL)) {
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
        return (
            <div className='cvat-context-video-wrapper'>
                <Spin size='small' />
            </div>
        );
    }

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
