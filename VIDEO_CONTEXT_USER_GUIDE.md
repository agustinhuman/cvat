# Video Context Button - User Guide

## Quick Start

### What is it?
A button that appears in the annotation interface when your current image has a related video file with the same name. Click it to play the video for context.

### When does it appear?
The play button (▶) appears when:
1. Your current frame/image has related files
2. One of those files is a video with the same base name as the image (or a hidden file with the same name)

### Example
If you're annotating `car_scene_001.jpg` and there's a `car_scene_001.mp4` or `.car_scene_001.mp4` in the related files, you'll see the play button.

## How to Use

### Step 1: Prepare Your Data
When creating a task, ensure your images and videos are organized like this:
```
my_dataset/
  ├── frame_001.jpg
  ├── frame_001.mp4    ← Same base name as image
  ├── frame_002.jpg
  ├── .frame_002.mp4   ← Hidden file with same name (also supported)
  └── ...
```

### Step 2: Create Task with Related Files
1. Create a new task in CVAT
2. Upload your images
3. Make sure related files (videos) are uploaded together
4. CVAT will automatically detect and link files with the same base name

### Step 3: Annotate with Video Context
1. Open the annotation interface
2. Navigate through frames
3. When a frame has a matching video:
   - A blue play button (▶) appears in the top bar
   - Hover over it to see the video filename
4. Click the button to play the video
5. The video opens in a modal with standard controls:
   - Play/Pause
   - Seek bar
   - Volume control
   - Fullscreen option
6. Close the modal when done (click X or outside modal)

## Supported Video Formats
- **Most common formats**: mp4, avi, mov, mkv, webm
- **Professional formats**: mxf, mts, m2ts
- **Streaming formats**: flv, f4v
- **And many more** (see full list in VIDEO_CONTEXT_FEATURE.md)

## Tips & Tricks

### Naming Convention
The base name must match exactly, or be a hidden file (preceded by a dot) with the same name:
- ✅ `image_01.jpg` + `image_01.mp4` → Button appears
- ✅ `image_01.jpg` + `.image_01.mp4` → Button appears (hidden file)
- ✅ `IMG_2024.png` + `IMG_2024.avi` → Button appears
- ✅ `IMG_2024.png` + `.IMG_2024.avi` → Button appears (hidden file)
- ❌ `image_01.jpg` + `video_01.mp4` → No button (names don't match)
- ❌ `image.jpg` + `image2.mp4` → No button (names don't match)

### Multiple Videos
If multiple videos have the same base name but different extensions:
- The system picks the first one found
- Best practice: Use one video format per image

### Performance
- Videos are NOT preloaded - they download when you click the button
- This saves bandwidth and loading time
- First click may have a slight delay while video downloads
- Closing the modal releases the video from memory

### Keyboard Shortcuts
While in the annotation interface:
- Use standard frame navigation (F/D keys) to move between frames
- The video button automatically updates for each frame
- All existing shortcuts continue to work normally

## Troubleshooting

### Button doesn't appear
**Check:**
1. Does your frame have related files? (Check frame metadata: relatedFiles > 0)
2. Is there a video file with the exact same base name as your image?
3. Is the video file format supported? (Check extension)

### Video doesn't play
**Try:**
1. Check your browser supports the video format (mp4 is most universally supported)
2. Ensure the video file isn't corrupted
3. Check browser console for errors (F12 → Console tab)

### Video is too slow to load
**Solutions:**
1. Use compressed/optimized video files
2. Reduce video resolution/bitrate
3. Use mp4 format with H.264 codec (best browser support)

## Best Practices

### For Annotators
- Review the context video before starting annotation
- Use the video to understand motion, sequence, or environmental context
- Close the modal when done to free resources

### For Dataset Creators
- Keep videos short (5-30 seconds) for quick loading
- Use consistent naming: `{base_name}.{ext}`
- Compress videos appropriately (balance quality vs. size)
- Use mp4 format for maximum compatibility
- Test a sample before uploading entire dataset

### For Administrators
- Ensure sufficient storage for both images and videos
- Consider bandwidth when multiple users access videos
- Monitor server resources if many videos are being streamed

## Technical Notes

### Browser Compatibility
- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- Uses HTML5 video player
- No plugins required

### Security
- Videos are served through CVAT's secure API
- Same authentication/authorization as other task data
- No direct file system access from browser

### Resource Management
- Video URLs are created temporarily and revoked after use
- Modal is destroyed on close (not just hidden)
- Minimal memory footprint when not in use

## FAQ

**Q: Can I use this with cloud storage?**
A: Yes, as long as related files are properly configured in your cloud storage setup.

**Q: Does this work with 3D point cloud tasks?**
A: The feature is designed for 2D image annotation but may work with 3D if related files are configured.

**Q: Can I have multiple videos per image?**
A: Only one video per image is supported (matched by base name).

**Q: What if my video has audio?**
A: Audio is supported and will play normally in the video player.

**Q: Can I download the video?**
A: The video player doesn't have a download button, but you can access the original file through the task's data management.

## Getting Help

If you encounter issues:
1. Check this guide's Troubleshooting section
2. Review VIDEO_CONTEXT_FEATURE.md for technical details
3. Check browser console for error messages
4. Contact your CVAT administrator

## Feature Limitations

Current limitations:
- One video per image (matched by base name)
- Video must be in related files (same upload/storage location)
- File name matching is case-sensitive
- No video preprocessing or format conversion

Future enhancements could include:
- Multiple videos per frame
- Video thumbnails
- Frame-synchronized playback
- Annotation overlay on video
