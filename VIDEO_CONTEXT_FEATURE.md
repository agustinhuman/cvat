# Video Context Button Feature

## Overview

This feature adds a UI button in the annotation interface that allows users to play a context video when the image being annotated has a related video file with the same name in the same folder.

## Requirements

The task mentions that sometimes labeling an image requires seeing context in the form of a small video. If an image being annotated has a video in the same folder with the same name (but different extension) or as a hidden file with the same name (preceded by a dot), a button should appear that plays that video.

## Implementation

### Backend Changes

#### New API Endpoints

Two new data types were added to the existing `/jobs/{id}/data` and `/tasks/{id}/data` endpoints:

1. **`related_files` type** - Returns list of related file names for a specific frame
   - Parameters: `type=related_files`, `number={frame_number}`
   - Returns: JSON array of filenames `["file1.jpg", "video1.mp4", ...]`

2. **`related_file` type** - Downloads a specific related file by name
   - Parameters: `type=related_file`, `number={frame_number}`, `filename={filename}`
   - Returns: The file content with appropriate MIME type

#### Files Modified
- `/cvat/apps/engine/views.py` - Added new data types to `_DataGetter` classes

### Frontend Changes

#### New Components
- `/cvat-ui/src/components/annotation-page/top-bar/video-context-button.tsx`
  - React component that displays a play button when a matching video is found
  - Fetches related files list and checks for videos with matching base name
  - Opens modal with video player when clicked

#### API Methods
- `/cvat-core/src/server-proxy.ts`
  - `getRelatedFiles(jobId, frameNumber)` - Fetches list of related file names
  - `getRelatedFile(jobId, frameNumber, filename)` - Downloads specific related file

#### Utilities
- `/cvat-ui/src/utils/files.ts`
  - `isVideoFile(filename)` - Checks if filename is a video
  - `getBaseNameWithoutExtension(filename)` - Extracts base name
  - `getFileExtension(filename)` - Extracts file extension

#### Integration
- Modified `/cvat-ui/src/components/annotation-page/top-bar/top-bar.tsx` to include the video button
- Modified `/cvat-ui/src/containers/annotation-page/top-bar/top-bar.tsx` to pass frame metadata

## How It Works

1. When a frame is loaded in the annotation interface, the `VideoContextButton` component checks if `frameRelatedFiles > 0`

2. If related files exist, it fetches the list of file names using `getRelatedFiles()`

3. The component looks for a video file (based on VIDEO_EXTENSIONS) that has the same base name as the current frame image, or a hidden file (preceded by a dot) with the same name
   - Example: If current frame is `image_001.jpg`, it looks for videos like `image_001.mp4`, `image_001.avi`, `.image_001.mp4`, etc.

4. If a matching video is found:
   - A blue play button icon appears next to the player controls in the top bar
   - Tooltip shows "Play context video: {filename}"

5. When the user clicks the button:
   - The specific video file is downloaded using `getRelatedFile()`
   - A modal opens displaying the video with HTML5 video player
   - Video autoplays and has standard controls (play, pause, seek, volume, fullscreen)

6. When the modal is closed, the video URL is revoked to free memory

## Supported Video Formats

The following video file extensions are supported:
- Common: mp4, avi, mov, mkv, webm, flv, wmv
- And many more (see VIDEO_EXTENSIONS in `/cvat-ui/src/utils/files.ts`)

## Database Impact

**None** - This is a UI-only feature that uses the existing `RelatedFile` model and does not require any database schema changes.

## Usage Example

1. Upload a task with images and related video files in the same folder
2. Ensure videos have the same base name as the images (e.g., `frame_01.jpg` and `frame_01.mp4`) or are hidden files with the same name (e.g., `frame_01.jpg` and `.frame_01.mp4`)
3. Open the annotation interface for the task
4. Navigate to a frame that has a matching video
5. A blue play button will appear in the top bar
6. Click it to view the context video

## Testing

To test this feature:

1. Create a task with related files enabled
2. Upload images with corresponding videos (same base name, different extension)
3. Open annotation interface
4. Verify the play button appears for frames with matching videos
5. Click the button and verify the video plays correctly
6. Navigate to different frames and verify the button appears/disappears appropriately

## Technical Notes

- The feature uses the existing Related Files infrastructure
- Video files are fetched on-demand when the button is clicked (not preloaded)
- Only one video file per frame is supported (matches by base name)
- The video player modal is destroyed when closed to free resources
- Frame changes automatically reset the video state
