// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import JSZip from 'jszip';

function isVideo(filename: string): boolean {
    const videoExtensions = ['.mp4', '.avi', '.mov', '.webm', '.mkv', '.m4v', '.mpeg', '.mpg', '.wmv', '.flv'];
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return videoExtensions.includes(ext);
}

function getVideoMimeType(filename: string): string {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    const mimeTypes: Record<string, string> = {
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.avi': 'video/x-msvideo',
        '.mov': 'video/quicktime',
        '.mkv': 'video/x-matroska',
        '.m4v': 'video/x-m4v',
        '.mpeg': 'video/mpeg',
        '.mpg': 'video/mpeg',
        '.wmv': 'video/x-ms-wmv',
        '.flv': 'video/x-flv',
    };
    return mimeTypes[ext] || 'video/mp4';
}

onmessage = (e) => {
    let errored = false;
    function handleError(error): void {
        try {
            if (!errored) {
                postMessage({ error });
            }
        } finally {
            errored = true;
        }
    }

    try {
        const zip = new JSZip();
        if (e.data) {
            const {
                start, end, block, dimension, dimension2D,
            } = e.data;

            zip.loadAsync(block).then((_zip) => {
                let index = start;

                _zip.forEach((relativePath) => {
                    const fileIndex = index++;
                    if (fileIndex <= end) {
                        _zip.file(relativePath)
                            .async('blob')
                            .then((fileData) => {
                                if (!errored) {
                                    // do not need to read the rest of block if an error already occurred
                                    if (dimension === dimension2D) {
                                        // Check if this is a video file
                                        if (isVideo(relativePath)) {
                                            // Return video as Blob with correct MIME type
                                            console.log('Worker: Processing video file:', relativePath);
                                            const mimeType = getVideoMimeType(relativePath);
                                            // Create a new Blob with the correct MIME type
                                            const videoBlob = fileData.slice(0, fileData.size, mimeType);
                                            console.log('Worker: Created video blob with type:', videoBlob.type, 'size:', videoBlob.size);
                                            postMessage({
                                                fileName: relativePath,
                                                index: fileIndex,
                                                data: videoBlob,
                                                isVideo: true,
                                            });
                                        } else {
                                            // Convert to ImageBitmap for images
                                            console.log('Worker: Processing image file:', relativePath);
                                            createImageBitmap(fileData).then((img) => {
                                                postMessage({
                                                    fileName: relativePath,
                                                    index: fileIndex,
                                                    data: img,
                                                    isVideo: false,
                                                });
                                            });
                                        }
                                    } else {
                                        postMessage({
                                            fileName: relativePath,
                                            index: fileIndex,
                                            data: fileData,
                                        });
                                    }
                                }
                            }).catch(handleError);
                    }
                });
            }).catch(handleError);
        }
    } catch (error) {
        handleError(error);
    }
};
