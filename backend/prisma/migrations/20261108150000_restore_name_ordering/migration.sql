-- Lists are ordered by name again and are served by the unique (parent_id, name) indexes.
DROP INDEX "files_parent_id_id_idx";
DROP INDEX "folders_parent_id_id_idx";

-- Sort folder names the same way as file names.
ALTER TABLE "folders" ALTER COLUMN "name" TYPE VARCHAR(248) COLLATE "C";
