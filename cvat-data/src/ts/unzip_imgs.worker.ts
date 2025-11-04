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
                                            // Return video as Blob
                                            postMessage({
                                                fileName: relativePath,
                                                index: fileIndex,
                                                data: fileData,
                                                isVideo: true,
                                            });
                                        } else {
                                            // Convert to ImageBitmap for images
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
