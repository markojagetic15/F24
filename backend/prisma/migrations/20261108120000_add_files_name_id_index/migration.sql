ALTER TABLE "files" ALTER COLUMN "name" TYPE VARCHAR(255) COLLATE "C";

CREATE INDEX "files_name_id_idx" ON "files"("name", "id");
