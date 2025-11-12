from __future__ import annotations

import os
import re

from django.core.management.base import BaseCommand
from django.db import transaction

from cvat.apps.engine import models
from cvat.apps.engine.model_utils import bulk_create
from utils.dataset_manifest.utils import find_related_images


class Command(BaseCommand):
    help = "Re-scan existing image tasks for contextual media files."

    def add_arguments(self, parser):
        parser.add_argument(
            "--task-id",
            type=int,
            nargs="+",
            dest="task_ids",
            help="IDs of tasks to re-scan. By default all image tasks are processed.",
        )

    def handle(self, *args, **options):
        task_ids = options.get("task_ids")

        tasks = models.Task.objects.all().select_related("data")
        if task_ids:
            tasks = tasks.filter(id__in=task_ids)

        total_created_files = 0
        total_created_links = 0
        processed = 0

        for task in tasks.iterator():
            if task.mode != "annotation" or not task.data_id:
                continue

            created_files, created_links = self._rescan_task(task)
            if created_files is None:
                continue

            processed += 1
            total_created_files += created_files
            total_created_links += created_links

            if created_files or created_links:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Task {task.id}: added {created_files} related file(s) and {created_links} link(s)."
                    )
                )

        if processed == 0:
            self.stdout.write("No matching tasks found.")
        else:
            self.stdout.write(
                f"Processed {processed} task(s). Created {total_created_files} file(s) and {total_created_links} link(s)."
            )

    def _rescan_task(self, task: models.Task) -> tuple[int, int] | tuple[None, None]:
        data = task.data
        upload_dir = data.get_upload_dirname()

        if not os.path.isdir(upload_dir):
            self.stdout.write(
                self.style.WARNING(f"Task {task.id}: upload directory '{upload_dir}' is missing, skipping." )
            )
            return None, None

        dataset_paths: list[str] = []
        for root, _, files in os.walk(upload_dir):
            for file_name in files:
                dataset_paths.append(os.path.join(root, file_name))

        if not dataset_paths:
            return 0, 0

        related_images = self._collect_related_media(upload_dir, dataset_paths)
        if related_images is None:
            self.stdout.write(
                self.style.WARNING(f"Task {task.id}: unable to detect related media, skipping.")
            )
            return None, None

        if not related_images:
            return 0, 0

        image_qs = data.images.only("id", "path")
        images_by_path = {os.path.normpath(img.path): img for img in image_qs}
        if not images_by_path:
            return 0, 0

        related_files_qs = data.related_files.only("id", "path")
        related_files_map: dict[str, models.RelatedFile] = {}
        for related_file in related_files_qs:
            try:
                rel_path = os.path.relpath(related_file.path.path, upload_dir)
            except (ValueError, AttributeError, OSError):
                rel_path = related_file.path.name
            related_files_map[os.path.normpath(rel_path)] = related_file

        missing_file_objs = []
        for rel_path in sorted({p for paths in related_images.values() for p in paths}):
            norm_path = os.path.normpath(rel_path)
            if norm_path in related_files_map:
                continue

            absolute_path = os.path.join(upload_dir, norm_path)
            if not os.path.exists(absolute_path):
                self.stdout.write(
                    self.style.WARNING(
                        f"Task {task.id}: related media '{norm_path}' does not exist on disk, skipping."
                    )
                )
                continue

            missing_file_objs.append(
                models.RelatedFile(
                    data=data,
                    path=absolute_path,
                )
            )

        with transaction.atomic():
            created_files = 0
            if missing_file_objs:
                new_files = bulk_create(models.RelatedFile, missing_file_objs)
                for related_file in new_files:
                    try:
                        rel_path = os.path.relpath(related_file.path.path, upload_dir)
                    except (ValueError, AttributeError, OSError):
                        rel_path = related_file.path.name
                    related_files_map[os.path.normpath(rel_path)] = related_file
                created_files = len(new_files)

            ThroughModel = models.RelatedFile.images.through
            existing_links = set(
                ThroughModel.objects.filter(relatedfile__data=data, image__data=data)
                .values_list("image_id", "relatedfile_id")
            )

            link_objects = []
            for image_path, rel_paths in related_images.items():
                image = images_by_path.get(os.path.normpath(image_path))
                if not image:
                    continue

                for rel_path in rel_paths:
                    related_file = related_files_map.get(os.path.normpath(rel_path))
                    if not related_file:
                        continue

                    key = (image.id, related_file.id)
                    if key in existing_links:
                        continue

                    existing_links.add(key)
                    link_objects.append(
                        ThroughModel(relatedfile_id=related_file.id, image_id=image.id)
                    )

            created_links = 0
            if link_objects:
                bulk_create(ThroughModel, link_objects)
                created_links = len(link_objects)

        return created_files, created_links

    _related_dir_pattern = re.compile(rf"(^|{re.escape(os.sep)})related_images{re.escape(os.sep)}")

    def _collect_related_media(
        self, upload_dir: str, dataset_paths: list[str]
    ) -> dict[str, list[str]] | None:
        try:
            _, related = find_related_images(
                dataset_paths,
                root_path=upload_dir,
                scene_paths=lambda p: not self._related_dir_pattern.search(p),
            )
        except ValueError:
            return None

        normalized = {
            os.path.normpath(image_path): [os.path.normpath(p) for p in paths]
            for image_path, paths in related.items()
            if paths
        }
        return normalized
