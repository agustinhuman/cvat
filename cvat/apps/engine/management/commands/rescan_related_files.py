# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from cvat.apps.engine import models
from cvat.apps.engine.utils import bulk_create
from utils.dataset_manifest.utils import find_related_images


class Command(BaseCommand):
    help = "Rescan and update related files (images/videos) for existing tasks"

    def add_arguments(self, parser):
        parser.add_argument(
            "task_id",
            nargs="?",
            type=int,
            help="ID of the task to rescan (optional, if not provided all tasks will be rescanned)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be added without making changes",
        )

    def handle(self, *args, **options):
        task_id = options.get("task_id")
        dry_run = options.get("dry_run", False)

        if task_id:
            tasks = models.Task.objects.filter(id=task_id)
            if not tasks.exists():
                raise CommandError(f"Task with ID {task_id} does not exist.")
        else:
            tasks = models.Task.objects.filter(mode="annotation")

        self.stdout.write(f"Scanning {tasks.count()} task(s)...")

        total_new_files = 0
        for task in tasks:
            new_files = self._rescan_task(task, dry_run)
            total_new_files += new_files
            if new_files > 0:
                self.stdout.write(
                    self.style.SUCCESS(f"Task {task.id}: Found {new_files} new related file(s)")
                )

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f"DRY RUN: Would add {total_new_files} new related file(s)"
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f"Added {total_new_files} new related file(s)")
            )

    def _rescan_task(self, task, dry_run=False):
        """Rescan a single task for new related files."""
        if task.mode != "annotation":
            self.stdout.write(
                self.style.WARNING(
                    f"Task {task.id}: Skipping (not in annotation mode)"
                )
            )
            return 0

        db_data = task.data
        upload_dir = db_data.get_upload_dirname()

        # Get all files in the upload directory
        if not os.path.exists(upload_dir):
            self.stdout.write(
                self.style.WARNING(f"Task {task.id}: Upload directory not found")
            )
            return 0

        dataset_paths = []
        for root, dirs, files in os.walk(upload_dir):
            for file in files:
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, upload_dir)
                dataset_paths.append(rel_path)

        # Get existing image paths as scene paths
        scene_paths = [img.path for img in db_data.images.all()]

        # Find related files
        try:
            _, related_images = find_related_images(
                dataset_paths, root_path=upload_dir, scene_paths=scene_paths
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Task {task.id}: Error finding related files: {e}")
            )
            return 0

        if not related_images:
            return 0

        # Get existing related file paths
        existing_paths = set(
            models.RelatedFile.objects.filter(data=db_data).values_list(
                "path", flat=True
            )
        )
        existing_paths = {
            os.path.relpath(p, upload_dir) if os.path.isabs(p) else p
            for p in existing_paths
        }

        # Find new related files
        all_related_paths = set()
        for scene_path, scene_related_files in related_images.items():
            all_related_paths.update(scene_related_files)

        new_paths = all_related_paths - existing_paths

        if not new_paths:
            return 0

        if dry_run:
            self.stdout.write(f"Task {task.id}: Would add {len(new_paths)} new file(s):")
            for path in sorted(new_paths):
                self.stdout.write(f"  - {path}")
            return len(new_paths)

        # Create new RelatedFile objects
        new_related_files = [
            models.RelatedFile(data=db_data, path=os.path.join(upload_dir, path))
            for path in new_paths
        ]
        new_related_files = bulk_create(models.RelatedFile, new_related_files)

        # Map paths to RelatedFile objects
        related_files_by_path = {
            os.path.relpath(rf.path.path, upload_dir): rf for rf in new_related_files
        }

        # Create associations with images
        ThroughModel = models.RelatedFile.images.through
        associations = []

        for scene_path, scene_related_files in related_images.items():
            # Find the image object for this scene
            try:
                image = db_data.images.get(path=scene_path)
            except models.Image.DoesNotExist:
                continue

            for related_file_path in scene_related_files:
                if related_file_path in new_paths:
                    rf = related_files_by_path[related_file_path]
                    associations.append(
                        ThroughModel(relatedfile_id=rf.id, image_id=image.id)
                    )

        if associations:
            bulk_create(ThroughModel, associations)

        return len(new_paths)
