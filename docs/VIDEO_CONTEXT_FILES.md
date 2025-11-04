# Video Context Files Support

This document describes the video context files feature that extends CVAT's "Contextual images" functionality to support videos.

## Overview

Previously, CVAT's contextual images feature only supported image files in the `related_images` directory. This enhancement allows video files to be used as contextual media alongside images.

## How It Works

When you place video files in the `related_images` directory structure, CVAT will:
1. Automatically detect them during task creation
2. Extract the first frame from each video
3. Display that frame as context (similar to a video thumbnail)
4. Store the video file path in the database for potential future enhancements

## Directory Structure

Place your videos in the same `related_images` directory structure used for images:

```
task_data/
  image_001.png
  image_002.png
  related_images/
    image_001_png/
      context_image_1.jpeg      # Regular context image
      context_video_1.mp4       # ✓ Video now supported!
      context_video_2.avi       # ✓ Any video format supported by PyAV
    image_002_png/
      context_image_2.jpeg
      context_video_3.mp4       # ✓ Video now supported!
```

## Supported Video Formats

Any video format supported by PyAV (FFmpeg) can be used, including:
- MP4 (.mp4)
- AVI (.avi)
- MOV (.mov)
- WebM (.webm)
- MKV (.mkv)
- And more...

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
   - Added `_extract_video_frame()` to extract first frame from videos
   - Added `_load_image_or_video_frame()` to handle both images and videos
   - Modified `read_raw_context_images()` to use new helper

3. **cvat/apps/engine/management/commands/rescan_related_files.py**
   - New management command for rescanning existing tasks
   - Discovers new related files (images and videos)
   - Creates database entries and associations

### Frontend Compatibility

The current implementation extracts the first frame from videos and serves them as JPEG images. This means:
- ✓ No frontend changes required for MVP
- ✓ Videos appear as static thumbnails in the context viewer
- ✓ Fully backward compatible

### Future Enhancements

Potential future improvements could include:
- Full video playback in the context viewer
- Frame selection (specify which frame to display)
- Video timeline scrubbing
- Multiple frame extraction
- Video metadata display

## Testing

The feature includes comprehensive tests in `cvat/apps/engine/tests/test_rest_api.py`:
- `test_check_flag_has_related_context_with_videos()` - Verifies video detection
- `test_fetch_related_video_from_server()` - Tests video context fetching

## API

No API changes are required. Videos are served through the existing context images endpoint:

```
GET /api/tasks/{task_id}/data?quality=original&type=context_image&number={frame_number}
```

The response is a ZIP file containing JPEG images (including extracted video frames).

## Performance Considerations

- Video frame extraction happens during context image preparation
- First frame extraction is relatively fast (< 1 second for most videos)
- Extracted frames are cached like regular context images
- No significant performance impact expected

## Troubleshooting

### Videos not appearing as context

1. Check the directory structure matches the expected format
2. Verify video files are in a supported format
3. Check file permissions (videos must be readable)
4. For existing tasks, run `rescan_related_files` command

### Frame extraction errors

1. Ensure PyAV (av) is installed
2. Verify video file is not corrupted
3. Check server logs for detailed error messages

## Example

Here's a complete example:

```bash
# Create task directory structure
mkdir -p my_task/related_images/frame_001_png

# Add main image
cp frame_001.png my_task/

# Add context image
cp context.jpg my_task/related_images/frame_001_png/

# Add context video (NEW!)
cp camera_view.mp4 my_task/related_images/frame_001_png/

# Create ZIP and upload to CVAT
cd my_task && zip -r ../my_task.zip .
```

Then upload `my_task.zip` when creating a task in CVAT. The video's first frame will automatically appear as a context image!
