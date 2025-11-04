# Video Context Files Support

This document describes the video context files feature that extends CVAT's "Contextual images" functionality to support videos with full playback.

## Overview

CVAT's contextual feature allows you to display additional media alongside the frame being annotated. This enhancement extends the feature to support video files with full playback capabilities in the context viewer.

## How It Works

When you place video files in the `related_images` directory structure, CVAT will:
1. Automatically detect them during task creation
2. Serve them as actual video files (not just thumbnails)
3. Display them with full playback controls in the context viewer
4. Allow users to play, pause, and seek through the video

## Directory Structure

Place your videos in the same `related_images` directory structure used for images:

```
task_data/
  image_001.png
  image_002.png
  related_images/
    image_001_png/
      context_image_1.jpeg      # Regular context image
      context_video_1.mp4       # ✓ Video with full playback!
      context_video_2.avi       # ✓ Any video format supported by browsers
    image_002_png/
      context_image_2.jpeg
      context_video_3.mp4       # ✓ Video with full playback!
```

## Supported Video Formats

Videos are served directly to the browser, so any format supported by HTML5 video works:
- MP4 (.mp4) - Recommended
- WebM (.webm) - Recommended
- AVI (.avi)
- MOV (.mov)
- MKV (.mkv)
- And more...

**Note:** For best browser compatibility, use MP4 (H.264) or WebM formats.

## Features

### Video Playback
- Full video player with standard controls (play/pause, seek, volume)
- Videos autoplay and loop by default
- Seamless switching between image and video contexts
- Video preview in the context selector gallery

### Performance
- Videos are served as-is (no server-side processing)
- Efficient streaming using browser's native video player
- Automatic cleanup of video object URLs to prevent memory leaks

## Usage

### For New Tasks

Simply include video files in your `related_images` directory when creating a task. CVAT will automatically detect and process them.

### For Existing Tasks

Use the Django management command to rescan existing tasks for new related files:

```bash
# Rescan all tasks
python manage.py rescan_related_files

# Rescan a specific task
python manage.py rescan_related_files 123

# Preview what would be added (dry run)
python manage.py rescan_related_files --dry-run
```

## Implementation Details

### Backend Changes

1. **utils/dataset_manifest/utils.py**
   - Modified `_prepare_context_list()` to accept videos using `is_video()` check
   - Updated directory discovery to include video files

2. **cvat/apps/engine/cache.py**
   - Added `_is_video()` to detect video files by MIME type
   - Modified `_load_image_or_video()` to handle both images and videos differently
   - Updated `prepare_context_images_chunk()` to include actual video files in ZIP
   - Images are converted to JPEG, videos are included as-is

3. **cvat/apps/engine/management/commands/rescan_related_files.py**
   - Management command for rescanning existing tasks
   - Discovers new related files (images and videos)
   - Creates database entries and associations

### Frontend Changes

1. **cvat-data/src/ts/unzip_imgs.worker.ts**
   - Updated to detect video files by extension
   - Returns videos as Blobs instead of attempting to create ImageBitmaps

2. **cvat-data/src/ts/cvat-data.ts**
   - Modified `decodeContextImages()` to return both ImageBitmap and Blob types

3. **cvat-core/src/frames.ts**
   - Updated `getContextImage()` to handle mixed media types
   - Adjusted cache size calculation for both images and videos

4. **cvat-ui/.../context-image.tsx**
   - Added video element alongside canvas
   - Detects media type (Blob vs ImageBitmap) and renders appropriately
   - Implements video object URL management
   - Videos autoplay and loop for continuous viewing

5. **cvat-ui/.../context-image-selector.tsx**
   - Updated gallery to show both images and videos
   - Video thumbnails display play icon overlay
   - Handles cleanup of video object URLs

6. **cvat-ui/.../styles.scss**
   - Added styling for video elements
   - Video preview styling in gallery

## API

No API changes required. Videos are served through the existing context endpoint:

```
GET /api/tasks/{task_id}/data?quality=original&type=context_image&number={frame_number}
```

The response is a ZIP file containing both JPEG images and video files.

## Video Recommendations

For optimal performance and compatibility:
- Keep videos short (around 15 seconds as suggested)
- Use MP4 format with H.264 codec
- Reasonable resolution (720p or lower for context videos)
- Compress videos to reduce file size

## Troubleshooting

### Videos not appearing as context

1. Check the directory structure matches the expected format
2. Verify video files are in a browser-supported format
3. Check file permissions (videos must be readable)
4. For existing tasks, run `rescan_related_files` command

### Video playback issues

1. Ensure browser supports the video format
2. Try converting to MP4 (H.264) for best compatibility
3. Check browser console for errors
4. Verify video file is not corrupted

### Performance issues

1. Reduce video resolution if context viewer is slow
2. Compress videos to reduce file size
3. Use shorter video clips
4. Check network bandwidth if using cloud storage

## Example

Here's a complete example:

```bash
# Create task directory structure
mkdir -p my_task/related_images/frame_001_png

# Add main image
cp frame_001.png my_task/

# Add context image
cp context.jpg my_task/related_images/frame_001_png/

# Add context video (will play with full controls!)
cp camera_view.mp4 my_task/related_images/frame_001_png/

# Create ZIP and upload to CVAT
cd my_task && zip -r ../my_task.zip .
```

Then upload `my_task.zip` when creating a task in CVAT. The video will appear in the context viewer with full playback controls!
