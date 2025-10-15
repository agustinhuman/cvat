// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import Modal from 'antd/lib/modal';
import Icon from '@ant-design/icons';
import { PlayCircleOutlined } from '@ant-design/icons';
import CVATTooltip from 'components/common/cvat-tooltip';
import { getCore } from 'cvat-core-wrapper';
import { isVideoFile, getBaseNameWithoutExtension } from 'utils/files';

const cvat = getCore();

interface Props {
    frameNumber: number;
    frameFilename: string;
    frameRelatedFiles: number;
    jobID: number;
}

function VideoContextButton(props: Props): JSX.Element | null {
    const {
        frameNumber, frameFilename, frameRelatedFiles, jobID,
    } = props;

    const [videoFile, setVideoFile] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        // Reset state when frame changes
        setVideoFile(null);
        setVideoUrl(null);
        
        if (frameRelatedFiles > 0) {
            // Fetch related files to check for video
            cvat.server.frames.getRelatedFiles(jobID, frameNumber)
                .then((files: string[]) => {
                    const baseFrameName = getBaseNameWithoutExtension(frameFilename);
                    
                    // Find a video file with the same base name as the current frame
                    const matchingVideo = files.find((file) => {
                        const baseFileName = getBaseNameWithoutExtension(file);
                        return isVideoFile(file) && baseFileName === baseFrameName;
                    });

                    if (matchingVideo) {
                        setVideoFile(matchingVideo);
                    }
                })
                .catch((error) => {
                    console.error('Failed to fetch related files:', error);
                });
        }
    }, [frameNumber, frameFilename, frameRelatedFiles, jobID]);

    const handlePlayVideo = async () => {
        if (videoFile) {
            try {
                // Fetch the specific video file
                const videoBlob = await cvat.server.frames.getRelatedFile(jobID, frameNumber, videoFile);
                const url = URL.createObjectURL(videoBlob);
                setVideoUrl(url);
                setModalVisible(true);
            } catch (error) {
                console.error('Failed to load video:', error);
            }
        }
    };

    const handleModalClose = () => {
        setModalVisible(false);
        if (videoUrl) {
            URL.revokeObjectURL(videoUrl);
            setVideoUrl(null);
        }
    };

    if (!videoFile) {
        return null;
    }

    return (
        <>
            <CVATTooltip title={`Play context video: ${videoFile}`}>
                <Icon
                    className='cvat-player-context-video-button'
                    component={PlayCircleOutlined}
                    onClick={handlePlayVideo}
                    style={{
                        fontSize: '24px',
                        marginLeft: '8px',
                        cursor: 'pointer',
                        color: '#40a9ff',
                    }}
                />
            </CVATTooltip>
            <Modal
                title={`Context Video: ${videoFile}`}
                open={modalVisible}
                onCancel={handleModalClose}
                footer={null}
                width={800}
                destroyOnClose
            >
                {videoUrl && (
                    <video
                        controls
                        autoPlay
                        style={{ width: '100%', maxHeight: '70vh' }}
                        src={videoUrl}
                    >
                        <track kind="captions" />
                        Your browser does not support the video tag.
                    </video>
                )}
            </Modal>
        </>
    );
}

export default React.memo(VideoContextButton);
